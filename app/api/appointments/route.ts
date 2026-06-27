import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import {
  flattenPartyServiceIds,
  getServicesByIds,
  getTotalDurationMinutes,
  resolveTechnicianForSlot,
  type BookingPartyMember,
  type TechnicianSelection,
} from "@/lib/booking/availability";
import { isSlotInPast, toLocalDateTime } from "@/lib/booking/time-utils";
import { getTechnicianById } from "@/lib/config/salonData";
import { createAdminClient } from "@/lib/supabase/admin";

interface AppointmentRequest {
  party?: BookingPartyMember[];
  technicianId?: TechnicianSelection;
  date?: string;
  time?: string;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  smsConsent?: boolean;
}

export async function POST(request: Request) {
  let payload: AppointmentRequest;

  try {
    payload = (await request.json()) as AppointmentRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validationError = validatePayload(payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const party = payload.party!;
  const allServiceIds = flattenPartyServiceIds(party);
  const services = getServicesByIds(allServiceIds);
  const duration = getTotalDurationMinutes(allServiceIds);
  const technicianId = payload.technicianId || "any";
  const date = payload.date!;
  const time = payload.time!;

  if (isSlotInPast(date, time)) {
    return NextResponse.json(
      { error: "That time has already passed. Please choose a later slot." },
      { status: 400 }
    );
  }

  try {
    const resolvedTechnicianId = await resolveTechnicianForSlot({
      date,
      time,
      serviceIds: allServiceIds,
      technicianId,
    });

    if (!resolvedTechnicianId) {
      return NextResponse.json(
        { error: "That appointment time is no longer available." },
        { status: 409 }
      );
    }

    const isAnyTechnician = technicianId === "any" || resolvedTechnicianId === "any";
    const supabase = createAdminClient();
    const startsAt = toLocalDateTime(date, time);
    const endsAt = new Date(startsAt.getTime() + duration * 60_000);
    const partyGroupId = randomUUID();
    const assignedTechnician = isAnyTechnician
      ? null
      : getTechnicianById(resolvedTechnicianId);

    const estimatedTotal = services.reduce((sum, s) => sum + s.price, 0);

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .insert({
        technician_id: isAnyTechnician ? null : resolvedTechnicianId,
        any_technician: isAnyTechnician,
        customer_name: payload.customer!.name!.trim(),
        customer_phone: payload.customer!.phone!.trim(),
        customer_email: payload.customer!.email?.trim() || null,
        party_group_id: partyGroupId,
        is_guest: false,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: "booked",
        source: "online",
        sms_consent: true,
        notes: buildPartyNotes(party),
        estimated_total: estimatedTotal,
      })
      .select("id")
      .single();

    if (appointmentError || !appointment) {
      throw appointmentError ?? new Error("Appointment insert failed.");
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

    if (servicesError) throw servicesError;

    return NextResponse.json({
      appointmentId: appointment.id,
      technicianId: isAnyTechnician ? null : resolvedTechnicianId,
      technicianName: isAnyTechnician
        ? "Any available technician"
        : assignedTechnician?.name ?? "Assigned technician",
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    });
  } catch (error) {
    console.error("Appointment creation failed", error);
    return NextResponse.json(
      { error: "Unable to create appointment right now." },
      { status: 500 }
    );
  }
}

function validatePayload(payload: AppointmentRequest): string | null {
  if (!payload.date || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
    return "A valid date is required.";
  }

  if (!payload.time || !/^\d{2}:\d{2}$/.test(payload.time)) {
    return "A valid time is required.";
  }

  if (!payload.party?.length) {
    return "At least one guest and one service are required.";
  }

  const serviceIds = flattenPartyServiceIds(payload.party);
  if (serviceIds.length === 0) {
    return "Please select at least one service.";
  }

  try {
    getServicesByIds(serviceIds);
  } catch {
    return "One or more selected services are invalid.";
  }

  if (!payload.customer?.name?.trim()) {
    return "Name is required.";
  }

  if (!payload.customer?.phone?.trim()) {
    return "Phone number is required.";
  }

  if (
    payload.customer.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.customer.email)
  ) {
    return "Please enter a valid email address.";
  }

  if (!payload.smsConsent) {
    return "SMS consent is required to book online.";
  }

  return null;
}

function buildPartyNotes(party: BookingPartyMember[]): string {
  return party
    .map((member) => `${member.label}: ${member.serviceIds.join(", ")}`)
    .join("\n");
}
