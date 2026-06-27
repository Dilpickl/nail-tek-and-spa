import "server-only";

import { ANY_EMPLOYEE_ID } from "@/lib/admin/constants";
import { getBusinessHoursForDate, toLocalDateTime } from "@/lib/booking/time-utils";
import {
  getServicesByIds,
  getTotalDurationMinutes,
} from "@/lib/booking/service-utils";
import { getTechnicianById, technicians } from "@/lib/config/salonData";
import { createAdminClient } from "@/lib/supabase/admin";

export interface UpdateAppointmentPayload {
  technicianId?: string | null;
  date?: string;
  time?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string | null;
  serviceIds?: string[];
  notes?: string | null;
}

interface ExistingAppointment {
  id: string;
  status: string;
  technician_id: string | null;
  any_technician: boolean;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  starts_at: string;
  ends_at: string;
  notes: string | null;
  appointment_services: { service_id: string }[] | null;
}

function overlaps(start: Date, end: Date, busyStart: Date, busyEnd: Date) {
  return start < busyEnd && end > busyStart;
}

export async function validateAndBuildUpdate(
  appointmentId: string,
  payload: UpdateAppointmentPayload
): Promise<
  | { error: string; status: number }
  | {
      updates: Record<string, unknown>;
      serviceRows: { service_id: string; price_at_booking: number; duration_at_booking: number }[] | null;
      startsAt: Date;
      endsAt: Date;
      technicianId: string | null;
      anyTechnician: boolean;
    }
> {
  const supabase = createAdminClient();

  const { data: existing, error: fetchError } = await supabase
    .from("appointments")
    .select(
      "id, status, technician_id, any_technician, customer_name, customer_phone, customer_email, starts_at, ends_at, notes, appointment_services(service_id, price_at_booking, duration_at_booking)"
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message, status: 500 };
  if (!existing) return { error: "Appointment not found.", status: 404 };

  const row = existing as ExistingAppointment;
  if (row.status !== "booked") {
    return { error: "Only booked appointments can be edited.", status: 409 };
  }

  let technicianId: string | null = row.technician_id;
  let anyTechnician = row.any_technician ?? false;

  if (payload.technicianId !== undefined) {
    if (payload.technicianId === ANY_EMPLOYEE_ID || payload.technicianId === null) {
      technicianId = null;
      anyTechnician = true;
    } else if (!technicians.some((t) => t.id === payload.technicianId)) {
      return { error: "A valid technician is required.", status: 400 };
    } else {
      technicianId = payload.technicianId;
      anyTechnician = false;
    }
  }

  const existingStart = new Date(row.starts_at);
  const date =
    payload.date ??
    `${existingStart.getFullYear()}-${String(existingStart.getMonth() + 1).padStart(2, "0")}-${String(existingStart.getDate()).padStart(2, "0")}`;
  const time =
    payload.time ??
    `${String(existingStart.getHours()).padStart(2, "0")}:${String(existingStart.getMinutes()).padStart(2, "0")}`;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "A valid date is required.", status: 400 };
  }
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return { error: "A valid time is required.", status: 400 };
  }

  const dayHours = getBusinessHoursForDate(date);
  if (!dayHours?.open || !dayHours.close) {
    return { error: "The salon is closed on that date.", status: 400 };
  }

  const serviceIds =
    payload.serviceIds ??
    row.appointment_services?.map((s) => s.service_id) ??
    [];

  if (serviceIds.length === 0) {
    return { error: "At least one service is required.", status: 400 };
  }

  let services;
  try {
    services = getServicesByIds(serviceIds);
  } catch {
    return { error: "One or more selected services are invalid.", status: 400 };
  }

  const duration = getTotalDurationMinutes(serviceIds);
  const startsAt = toLocalDateTime(date, time);
  const endsAt = new Date(startsAt.getTime() + duration * 60_000);

  const open = toLocalDateTime(date, dayHours.open);
  const close = toLocalDateTime(date, dayHours.close);
  if (startsAt < open || endsAt > close) {
    return { error: "That time is outside business hours.", status: 400 };
  }

  const { data: overlapping, error: overlapError } = await supabase
    .from("appointments")
    .select("id, technician_id, any_technician, starts_at, ends_at")
    .eq("status", "booked")
    .neq("id", appointmentId)
    .lt("starts_at", endsAt.toISOString())
    .gt("ends_at", startsAt.toISOString());

  if (overlapError) return { error: overlapError.message, status: 500 };

  const overlapRows = overlapping ?? [];
  let busyTechCount = 0;
  let anyCount = 0;

  for (const other of overlapRows) {
    const otherStart = new Date(other.starts_at);
    const otherEnd = new Date(other.ends_at);
    if (!overlaps(startsAt, endsAt, otherStart, otherEnd)) continue;

    if (other.any_technician || other.technician_id === null) {
      anyCount += 1;
    } else {
      busyTechCount += 1;
    }
  }

  const poolUsed = busyTechCount + anyCount;

  if (anyTechnician) {
    const { data: anyOverlap } = await supabase
      .from("appointments")
      .select("id")
      .eq("status", "booked")
      .eq("any_technician", true)
      .neq("id", appointmentId)
      .lt("starts_at", endsAt.toISOString())
      .gt("ends_at", startsAt.toISOString())
      .limit(1);

    if (anyOverlap && anyOverlap.length > 0) {
      return {
        error: "Another unassigned appointment already exists at this time.",
        status: 409,
      };
    }

    if (poolUsed >= technicians.length) {
      return { error: "No open capacity at this time.", status: 409 };
    }
  } else if (technicianId) {
    const techConflict = overlapRows.some(
      (other) =>
        other.technician_id === technicianId &&
        overlaps(startsAt, endsAt, new Date(other.starts_at), new Date(other.ends_at))
    );

    if (techConflict) {
      return { error: "That technician already has a booking at this time.", status: 409 };
    }

    if (poolUsed >= technicians.length) {
      return { error: "No open capacity at this time.", status: 409 };
    }
  }

  const customerName = payload.customerName?.trim() ?? row.customer_name;
  const customerPhone = payload.customerPhone?.trim() ?? row.customer_phone;
  if (!customerName) return { error: "Customer name is required.", status: 400 };
  if (!customerPhone) return { error: "Customer phone is required.", status: 400 };

  const customerEmail =
    payload.customerEmail !== undefined
      ? payload.customerEmail?.trim() || null
      : row.customer_email;

  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return { error: "Please enter a valid email address.", status: 400 };
  }

  const estimatedTotal = services.reduce((sum, s) => sum + s.price, 0);
  const serviceRows = services.map((service) => ({
    service_id: service.id,
    price_at_booking: service.price,
    duration_at_booking: service.durationMinutes,
  }));

  return {
    updates: {
      technician_id: technicianId,
      any_technician: anyTechnician,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      estimated_total: estimatedTotal,
      notes: payload.notes !== undefined ? payload.notes?.trim() || null : row.notes,
    },
    serviceRows: payload.serviceIds !== undefined ? serviceRows : null,
    startsAt,
    endsAt,
    technicianId,
    anyTechnician,
  };
}

export { getTechnicianById };
