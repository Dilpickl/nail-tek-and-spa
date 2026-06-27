import { NextResponse } from "next/server";

import { ANY_EMPLOYEE_ID } from "@/lib/admin/constants";
import { getCurrentUser, isAdminUser } from "@/lib/admin/auth";
import { getSlotUsage } from "@/lib/booking/slot-capacity";
import {
  getServicesByIds,
  getTotalDurationMinutes,
} from "@/lib/booking/service-utils";
import { getBusinessHoursForDate, toLocalDateTime } from "@/lib/booking/time-utils";
import { technicians } from "@/lib/config/salonData";
import { createAdminClient } from "@/lib/supabase/admin";

interface QuickBookingRequest {
  source?: "walk_in" | "phone";
  technicianId?: string;
  serviceIds?: string[];
  date?: string;
  time?: string;
  customerName?: string;
  customerPhone?: string;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as QuickBookingRequest;
  const validationError = validate(payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  let services;
  try {
    services = getServicesByIds(payload.serviceIds!);
  } catch {
    return NextResponse.json({ error: "One or more selected services are invalid." }, { status: 400 });
  }

  const durationMinutes = getTotalDurationMinutes(payload.serviceIds!);
  const estimatedTotal = services.reduce((sum, service) => sum + service.price, 0);
  const isAnyTechnician = payload.technicianId === ANY_EMPLOYEE_ID;
  const technicianId = isAnyTechnician ? null : payload.technicianId!;
  const startsAt = toLocalDateTime(payload.date!, payload.time!);
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  const supabase = createAdminClient();

  const date = payload.date!;
  const dayHours = getBusinessHoursForDate(date);
  if (!dayHours?.open || !dayHours.close) {
    return NextResponse.json({ error: "The salon is closed on that date." }, { status: 400 });
  }

  const open = toLocalDateTime(date, dayHours.open);
  const close = toLocalDateTime(date, dayHours.close);
  if (startsAt < open || endsAt > close) {
    return NextResponse.json({ error: "That time is outside business hours." }, { status: 400 });
  }

  const { data: overlapping, error: overlapError } = await supabase
    .from("appointments")
    .select("id, technician_id, any_technician, starts_at, ends_at")
    .eq("status", "booked")
    .lt("starts_at", endsAt.toISOString())
    .gt("ends_at", startsAt.toISOString());

  if (overlapError) {
    return NextResponse.json({ error: overlapError.message }, { status: 500 });
  }

  const { data: timeOffRows, error: timeOffError } = await supabase
    .from("technician_time_off")
    .select("technician_id, full_day")
    .eq("off_date", date)
    .eq("full_day", true);

  if (timeOffError) {
    return NextResponse.json({ error: timeOffError.message }, { status: 500 });
  }

  const activeTechCount = technicians.filter(
    (tech) => !(timeOffRows ?? []).some((row) => row.technician_id === tech.id)
  ).length;

  if (activeTechCount === 0) {
    return NextResponse.json(
      { error: "No technicians are scheduled to work on that date." },
      { status: 409 }
    );
  }

  const { assignedBusyIds, remainingSeats } = getSlotUsage(
    overlapping ?? [],
    startsAt,
    endsAt,
    activeTechCount
  );

  if (isAnyTechnician) {
    if (remainingSeats <= 0) {
      return NextResponse.json({ error: "No open capacity at this time." }, { status: 409 });
    }
  } else if (assignedBusyIds.has(technicianId!)) {
    return NextResponse.json(
      { error: "That technician already has a booking at this time." },
      { status: 409 }
    );
  } else if (remainingSeats <= 0) {
    return NextResponse.json({ error: "No open capacity at this time." }, { status: 409 });
  }

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      technician_id: technicianId,
      any_technician: isAnyTechnician,
      customer_name: payload.customerName!.trim(),
      customer_phone:
        payload.source === "phone"
          ? payload.customerPhone!.trim()
          : "N/A",
      customer_email: null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: "booked",
      source: payload.source!,
      sms_consent: false,
      estimated_total: estimatedTotal,
      notes:
        payload.source === "walk_in"
          ? "Manual walk-in block created from admin dashboard."
          : "Manual phone booking created from admin dashboard.",
    })
    .select("id")
    .single();

  if (appointmentError || !appointment) {
    return NextResponse.json(
      { error: appointmentError?.message ?? "Unable to create booking." },
      { status: 500 }
    );
  }

  const serviceRows = services.map((service) => ({
    appointment_id: appointment.id,
    service_id: service.id,
    price_at_booking: service.price,
    duration_at_booking: service.durationMinutes,
  }));

  const { error: servicesError } = await supabase
    .from("appointment_services")
    .insert(serviceRows);

  if (servicesError) {
    return NextResponse.json({ error: servicesError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, appointmentId: appointment.id });
}

function validate(payload: QuickBookingRequest) {
  if (payload.source !== "walk_in" && payload.source !== "phone") {
    return "A valid booking source is required.";
  }

  const isAny = payload.technicianId === ANY_EMPLOYEE_ID;
  if (
    !payload.technicianId ||
    (!isAny && !technicians.some((t) => t.id === payload.technicianId))
  ) {
    return "A valid technician is required.";
  }

  if (!payload.serviceIds?.length) {
    return "At least one service is required.";
  }

  try {
    getServicesByIds(payload.serviceIds);
  } catch {
    return "One or more selected services are invalid.";
  }

  if (!payload.date || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
    return "A valid date is required.";
  }

  if (!payload.time || !/^\d{2}:\d{2}$/.test(payload.time)) {
    return "A valid start time is required.";
  }

  if (!payload.customerName?.trim()) {
    return "Guest name is required.";
  }

  if (payload.source === "phone" && !payload.customerPhone?.trim()) {
    return "Phone number is required.";
  }

  return null;
}
