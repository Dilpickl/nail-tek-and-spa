import "server-only";

import { ANY_EMPLOYEE_ID } from "@/lib/admin/constants";
import { getConfirmedServicePrice } from "@/lib/booking/pricing";
import { getBusinessHoursForDate, formatSalonTime, toIsoDate, toLocalDateTime } from "@/lib/booking/time-utils";
import { getSlotUsage, type BusyWindow } from "@/lib/booking/slot-capacity";
import {
  getServicesByIds,
  getTotalDurationMinutes,
} from "@/lib/booking/service-utils";
import {
  getActiveTechnicians,
  getAllTechnicians,
  getSchedulesForDate,
  getTechnicianByIdFromDb,
  isTechnicianScheduledForSlot,
} from "@/lib/booking/technicians";
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
  /** Skip schedule/capacity checks when assigning a tech at checkout. */
  forCompletionAssignment?: boolean;
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

  const allTechnicians = await getAllTechnicians();

  if (payload.technicianId !== undefined) {
    if (payload.technicianId === ANY_EMPLOYEE_ID || payload.technicianId === null) {
      technicianId = null;
      anyTechnician = true;
    } else if (!allTechnicians.some((t) => t.id === payload.technicianId)) {
      return { error: "A valid technician is required.", status: 400 };
    } else {
      technicianId = payload.technicianId;
      anyTechnician = false;
    }
  }

  const existingStart = new Date(row.starts_at);
  const date = payload.date ?? toIsoDate(existingStart);
  const time = payload.time ?? formatSalonTime(existingStart);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "A valid date is required.", status: 400 };
  }
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return { error: "A valid time is required.", status: 400 };
  }

  const skipScheduleConstraints = payload.forCompletionAssignment === true;

  const dayHours = getBusinessHoursForDate(date);
  if (!skipScheduleConstraints && (!dayHours?.open || !dayHours.close)) {
    return { error: "The salon is closed on that date.", status: 400 };
  }

  const existingEnd = new Date(row.ends_at);
  const existingDurationMs = existingEnd.getTime() - existingStart.getTime();

  const existingServiceIds =
    row.appointment_services?.map((service) => service.service_id) ?? [];
  const serviceIds =
    payload.serviceIds !== undefined ? payload.serviceIds : existingServiceIds;

  if (payload.serviceIds !== undefined && serviceIds.length === 0) {
    return { error: "At least one service is required.", status: 400 };
  }

  let startsAt: Date;
  let endsAt: Date;
  let estimatedTotal: number | undefined;
  let serviceRows: {
    service_id: string;
    price_at_booking: number;
    duration_at_booking: number;
  }[] | null = null;

  if (skipScheduleConstraints) {
    startsAt = existingStart;
    endsAt = existingEnd;
  } else if (serviceIds.length > 0) {
    let services;
    try {
      services = getServicesByIds(serviceIds);
    } catch {
      return { error: "One or more selected services are invalid.", status: 400 };
    }

    const duration = getTotalDurationMinutes(serviceIds);
    startsAt = toLocalDateTime(date, time);
    endsAt = new Date(startsAt.getTime() + duration * 60_000);
    estimatedTotal = services.reduce(
      (sum, service) => sum + getConfirmedServicePrice(service.id),
      0
    );

    if (payload.serviceIds !== undefined) {
      serviceRows = services.map((service) => ({
        service_id: service.id,
        price_at_booking: getConfirmedServicePrice(service.id),
        duration_at_booking: service.durationMinutes,
      }));
    }
  } else {
    // Walk-in / phone blocks may have no services — keep their time window.
    startsAt =
      payload.date !== undefined || payload.time !== undefined
        ? toLocalDateTime(date, time)
        : existingStart;
    endsAt =
      payload.date !== undefined || payload.time !== undefined
        ? new Date(startsAt.getTime() + existingDurationMs)
        : existingEnd;
  }

  if (!skipScheduleConstraints) {
    if (!dayHours?.open || !dayHours.close) {
      return { error: "The salon is closed on that date.", status: 400 };
    }

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

    const { data: timeOffRows, error: timeOffError } = await supabase
      .from("technician_time_off")
      .select("technician_id, full_day")
      .eq("off_date", date)
      .eq("full_day", true);

    if (timeOffError) return { error: timeOffError.message, status: 500 };

    const activeTechnicians = await getActiveTechnicians();
    const activeTechCount = activeTechnicians.filter(
      (tech) => !(timeOffRows ?? []).some((row) => row.technician_id === tech.id)
    ).length;

    if (activeTechCount === 0) {
      return { error: "No technicians are scheduled to work on that date.", status: 409 };
    }

    const overlapRows = (overlapping ?? []) as BusyWindow[];
    const { assignedBusyIds, remainingSeats } = getSlotUsage(
      overlapRows,
      startsAt,
      endsAt,
      activeTechCount
    );

    if (anyTechnician) {
      if (remainingSeats <= 0) {
        return { error: "No open capacity at this time.", status: 409 };
      }
    } else if (technicianId) {
      if (assignedBusyIds.has(technicianId)) {
        return {
          error: "That technician already has a booking at this time.",
          status: 409,
        };
      }

      if (remainingSeats <= 0) {
        return { error: "No open capacity at this time.", status: 409 };
      }

      const scheduleMap = await getSchedulesForDate(date, [technicianId]);
      const schedule = scheduleMap.get(technicianId);
      if (
        !schedule?.isWorking ||
        !isTechnicianScheduledForSlot(schedule, startsAt, endsAt, date)
      ) {
        return {
          error: "That technician is not scheduled to work at this time.",
          status: 409,
        };
      }

      if ((timeOffRows ?? []).some((row) => row.technician_id === technicianId)) {
        return { error: "That technician is marked off for this date.", status: 409 };
      }
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

  const updates: Record<string, unknown> = {
    technician_id: technicianId,
    any_technician: anyTechnician,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    notes: payload.notes !== undefined ? payload.notes?.trim() || null : row.notes,
  };

  if (estimatedTotal !== undefined) {
    updates.estimated_total = estimatedTotal;
  }

  return {
    updates,
    serviceRows,
    startsAt,
    endsAt,
    technicianId,
    anyTechnician,
  };
}

export { getTechnicianByIdFromDb as getTechnicianById };
