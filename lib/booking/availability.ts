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
import { getSlotUsage, type BusyWindow } from "@/lib/booking/slot-capacity";

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

  const fullDayOffIds = new Set(
    ((timeOff as TimeOffWindow[] | null) ?? [])
      .filter((window) => window.full_day)
      .map((window) => window.technician_id)
  );
  const activeTechnicians = technicians.filter(
    (technician) => !fullDayOffIds.has(technician.id)
  );
  const activeTechCount = activeTechnicians.length;

  if (activeTechCount === 0) {
    return [];
  }

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
    const { assignedBusyIds, remainingSeats } = getSlotUsage(
      busyWindows as BusyWindow[] | null,
      slotStart,
      slotEnd,
      activeTechCount
    );

    const availableTechnicians = selectedTechnicians.filter((technician) => {
      if (assignedBusyIds.has(technician.id)) return false;

      return !isTechnicianOff(
        technician.id,
        date,
        slotStart,
        slotEnd,
        (timeOff as TimeOffWindow[] | null) ?? []
      );
    });

    if (remainingSeats <= 0 || availableTechnicians.length === 0) {
      continue;
    }

    slots.push({
      time: formatTime(slotStart),
      technicianIds: availableTechnicians.map((technician) => technician.id),
    });
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
