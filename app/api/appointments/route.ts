import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { getConfirmedServicePrice } from "@/lib/booking/pricing";
import {
  normalizeBookableServiceIds,
  validateBookableServiceIds,
} from "@/lib/booking/normalize-services";
import {
  getServicesByIds,
  resolveTechnicianForSlot,
  type BookingPartyMember,
  type TechnicianSelection,
} from "@/lib/booking/availability";
import {
  assignTechniciansForParty,
  getMemberDurationMinutes,
  getMemberServices,
  getPartyMembersWithServices,
  parsePartyPayload,
} from "@/lib/booking/party-scheduling";
import {
  getActiveTechnicians,
  getSchedulesForDate,
  getTechnicianByIdFromDb,
} from "@/lib/booking/technicians";
import { isSlotInPast, toLocalDateTime } from "@/lib/booking/time-utils";
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

  const normalizedParty = payload.party!.map((member) => ({
    ...member,
    serviceIds: normalizeBookableServiceIds(member.serviceIds),
    technicianId: member.technicianId ?? payload.technicianId ?? "any",
  }));

  const party = getPartyMembersWithServices(normalizedParty);
  const technicianId =
    party.length === 1
      ? (party[0]?.technicianId ?? payload.technicianId ?? "any")
      : (payload.technicianId ?? "any");
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
      party,
      technicianId,
    });

    if (!resolvedTechnicianId) {
      return NextResponse.json(
        { error: "That appointment time is no longer available." },
        { status: 409 }
      );
    }

    const supabase = createAdminClient();
    const startsAt = toLocalDateTime(date, time);
    const dayStart = toLocalDateTime(date, "00:00");
    const dayEnd = toLocalDateTime(date, "23:59");

    const [{ data: busyWindows, error: appointmentsError }, { data: timeOff, error: timeOffError }] =
      await Promise.all([
        supabase
          .from("appointments")
          .select("technician_id, any_technician, starts_at, ends_at")
          .eq("status", "booked")
          .lt("starts_at", dayEnd.toISOString())
          .gt("ends_at", dayStart.toISOString()),
        supabase
          .from("technician_time_off")
          .select("technician_id, off_date, full_day, starts_at, ends_at")
          .eq("off_date", date),
      ]);

    if (appointmentsError) throw appointmentsError;
    if (timeOffError) throw timeOffError;

    const fullDayOffIds = new Set(
      (timeOff ?? [])
        .filter((window) => window.full_day)
        .map((window) => window.technician_id)
    );
    const allTechnicians = await getActiveTechnicians();
    const scheduleMap = await getSchedulesForDate(
      date,
      allTechnicians.map((technician) => technician.id)
    );
    const activeTechnicians = allTechnicians.filter((technician) => {
      const schedule = scheduleMap.get(technician.id);
      return schedule?.isWorking && !fullDayOffIds.has(technician.id);
    });

    const assignments = assignTechniciansForParty({
      date,
      slotStart: startsAt,
      party,
      technicianId,
      busyWindows: busyWindows ?? [],
      timeOff: timeOff ?? [],
      activeTechnicians,
      scheduleMap,
    });

    if (!assignments) {
      return NextResponse.json(
        { error: "That appointment time is no longer available." },
        { status: 409 }
      );
    }

    const partyGroupId = randomUUID();
    const createdIds: string[] = [];
    const bookerName = payload.customer!.name!.trim();
    const bookerPhone = payload.customer!.phone!.trim();
    const bookerEmail = payload.customer!.email?.trim() || null;
    const partySize = party.length;

    try {
      for (let index = 0; index < assignments.length; index++) {
        const assignment = assignments[index];
        const member = assignment.member;
        const services = getMemberServices(member);
        const duration = getMemberDurationMinutes(member);
        const memberEndsAt = new Date(startsAt.getTime() + duration * 60_000);
        const isPrimary = index === 0;
        const estimatedTotal = services.reduce(
          (sum, service) => sum + getConfirmedServicePrice(service.id),
          0
        );

        const { data: appointment, error: appointmentError } = await supabase
          .from("appointments")
          .insert({
            technician_id: assignment.anyTechnician ? null : assignment.technicianId,
            any_technician: assignment.anyTechnician,
            customer_name: isPrimary ? bookerName : member.label.trim(),
            customer_phone: bookerPhone,
            customer_email: isPrimary ? bookerEmail : null,
            party_group_id: partyGroupId,
            is_guest: !isPrimary,
            starts_at: startsAt.toISOString(),
            ends_at: memberEndsAt.toISOString(),
            status: "booked",
            source: "online",
            sms_consent: true,
            notes:
              partySize > 1
                ? isPrimary
                  ? `Party booking (${partySize} guests)`
                  : `Party with ${bookerName}`
                : null,
            estimated_total: estimatedTotal,
          })
          .select("id")
          .single();

        if (appointmentError || !appointment) {
          throw appointmentError ?? new Error("Appointment insert failed.");
        }

        createdIds.push(appointment.id);

        const serviceRows = services.map((service) => ({
          appointment_id: appointment.id,
          service_id: service.id,
          price_at_booking: getConfirmedServicePrice(service.id),
          duration_at_booking: service.durationMinutes,
        }));

        const { error: servicesError } = await supabase
          .from("appointment_services")
          .insert(serviceRows);

        if (servicesError) {
          const message = servicesError.message.includes("foreign key")
            ? "One or more selected services are not available for booking. Please contact the salon."
            : servicesError.message;
          throw new Error(message);
        }
      }
    } catch (error) {
      if (createdIds.length > 0) {
        await supabase.from("appointments").delete().in("id", createdIds);
      }
      throw error;
    }

    const primaryAssignment = assignments[0];
    const primaryTechnicianName = primaryAssignment.anyTechnician
      ? "Any available technician"
      : (await getTechnicianByIdFromDb(primaryAssignment.technicianId ?? ""))?.name ??
        "Assigned technician";
    const maxDuration = Math.max(...assignments.map((item) => getMemberDurationMinutes(item.member)));
    const endsAt = new Date(startsAt.getTime() + maxDuration * 60_000);

    return NextResponse.json({
      appointmentId: createdIds[0],
      appointmentIds: createdIds,
      partyGroupId,
      technicianId: primaryAssignment.anyTechnician ? null : primaryAssignment.technicianId,
      technicianName: primaryTechnicianName,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    });
  } catch (error) {
    console.error("Appointment creation failed", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to create appointment right now.";
    const status = message.includes("not available for booking") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
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

  const guestNameError = validateGuestNames(payload.party);
  if (guestNameError) return guestNameError;

  const party = getPartyMembersWithServices(payload.party);
  if (party.length === 0) {
    return "Please select at least one service.";
  }

  for (const member of party) {
    const serviceError = validateBookableServiceIds(member.serviceIds);
    if (serviceError) return serviceError;

    try {
      getServicesByIds(member.serviceIds);
    } catch {
      return "One or more selected services are invalid.";
    }
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

function validateGuestNames(party: BookingPartyMember[]): string | null {
  for (let index = 1; index < party.length; index++) {
    if (!party[index]?.label?.trim()) {
      return "Please enter a name for each guest.";
    }
  }

  return null;
}
