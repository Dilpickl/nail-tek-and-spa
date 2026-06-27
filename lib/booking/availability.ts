import "server-only";

import { technicians } from "@/lib/config/salonData";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  flattenPartyServiceIds,
  getServicesByIds,
  getTotalDurationMinutes,
  type BookingPartyMember,
} from "@/lib/booking/service-utils";
import {
  filterPastSlots,
  getBusinessHoursForDate,
  SLOT_INTERVAL_MINUTES,
  toLocalDateTime,
} from "@/lib/booking/time-utils";

export {
  filterPastSlots,
  getBusinessHoursForDate,
  getBusinessTimeBounds,
  getNextTimeSlot,
  isSlotInPast,
  maxTime,
  parseLocalDate,
  SLOT_INTERVAL_MINUTES,
  toIsoDate,
  toLocalDateTime,
} from "@/lib/booking/time-utils";

export {
  flattenPartyServiceIds,
  getServicesByIds,
  getTotalDurationMinutes,
  type BookingPartyMember,
} from "@/lib/booking/service-utils";

export type TechnicianSelection = "any" | string;

export interface BookingSlot {
  time: string;
  technicianIds: string[];
}

interface BusyWindow {
  technician_id: string | null;
  any_technician: boolean;
  starts_at: string;
  ends_at: string;
}

function getSlotUsage(
  busyWindows: BusyWindow[] | null,
  slotStart: Date,
  slotEnd: Date
) {
  const busyTechIds = new Set<string>();
  let anyCount = 0;

  for (const busy of busyWindows ?? []) {
    if (!overlaps(slotStart, slotEnd, new Date(busy.starts_at), new Date(busy.ends_at))) {
      continue;
    }

    if (busy.any_technician || busy.technician_id === null) {
      anyCount += 1;
    } else {
      busyTechIds.add(busy.technician_id);
    }
  }

  return { busyTechIds, anyCount, poolUsed: busyTechIds.size + anyCount };
}

interface TimeOffWindow {
  technician_id: string;
  off_date: string;
  full_day: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

function overlaps(start: Date, end: Date, busyStart: Date, busyEnd: Date) {
  return start < busyEnd && end > busyStart;
}

function isTechnicianOff(
  technicianId: string,
  date: string,
  start: Date,
  end: Date,
  timeOff: TimeOffWindow[]
) {
  return timeOff.some((window) => {
    if (window.technician_id !== technicianId || window.off_date !== date) {
      return false;
    }

    if (window.full_day) return true;
    if (!window.starts_at || !window.ends_at) return false;

    return overlaps(start, end, new Date(window.starts_at), new Date(window.ends_at));
  });
}

export async function getAvailableSlots({
  date,
  serviceIds,
  technicianId,
}: {
  date: string;
  serviceIds: string[];
  technicianId: TechnicianSelection;
}): Promise<BookingSlot[]> {
  const duration = getTotalDurationMinutes(serviceIds);
  const dayHours = getBusinessHoursForDate(date);

  if (!dayHours?.open || !dayHours.close || duration <= 0) {
    return [];
  }

  const selectedTechnicians =
    technicianId === "any"
      ? technicians
      : technicians.filter((technician) => technician.id === technicianId);

  if (selectedTechnicians.length === 0) {
    return [];
  }

  const supabase = createAdminClient();
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

  const slots: BookingSlot[] = [];
  const open = toLocalDateTime(date, dayHours.open);
  const close = toLocalDateTime(date, dayHours.close);
  const latestStart = addMinutes(close, -duration);

  for (
    let slotStart = open;
    slotStart <= latestStart;
    slotStart = addMinutes(slotStart, SLOT_INTERVAL_MINUTES)
  ) {
    const slotEnd = addMinutes(slotStart, duration);
    const { busyTechIds, anyCount, poolUsed } = getSlotUsage(
      busyWindows as BusyWindow[] | null,
      slotStart,
      slotEnd
    );

    const availableTechnicians = selectedTechnicians.filter((technician) => {
      if (busyTechIds.has(technician.id)) return false;

      return !isTechnicianOff(
        technician.id,
        date,
        slotStart,
        slotEnd,
        (timeOff as TimeOffWindow[] | null) ?? []
      );
    });

    if (technicianId === "any") {
      if (poolUsed < technicians.length && availableTechnicians.length > 0) {
        slots.push({
          time: formatTime(slotStart),
          technicianIds: availableTechnicians.map((technician) => technician.id),
        });
      }
      continue;
    }

    if (poolUsed >= technicians.length) continue;

    const technicianIds = availableTechnicians.map((technician) => technician.id);

    if (technicianIds.length > 0) {
      slots.push({ time: formatTime(slotStart), technicianIds });
    }
  }

  return filterPastSlots(date, slots);
}

export async function resolveTechnicianForSlot({
  date,
  time,
  serviceIds,
  technicianId,
}: {
  date: string;
  time: string;
  serviceIds: string[];
  technicianId: TechnicianSelection;
}): Promise<string | null> {
  const slots = await getAvailableSlots({ date, serviceIds, technicianId });
  const match = slots.find((slot) => slot.time === time);
  if (!match) return null;
  if (technicianId === "any") return "any";
  return match.technicianIds[0] ?? null;
}
