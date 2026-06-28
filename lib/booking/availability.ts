import "server-only";

import {
  getActiveTechnicians,
  getSchedulesForDate,
  isTechnicianScheduledForSlot,
  type DbTechnician,
  type ResolvedTechnicianSchedule,
} from "@/lib/booking/technicians";
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
import {
  assignTechniciansForParty,
  getDistinctSpecificTechPreferences,
  getPartyMaxDurationMinutes,
  getPartyMembersWithServices,
  type TechnicianSelection,
} from "@/lib/booking/party-scheduling";
import type { BusyWindow } from "@/lib/booking/slot-capacity";

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

export type { TechnicianSelection } from "@/lib/booking/party-scheduling";

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

function isTechnicianAvailableForSlot({
  technicianId,
  date,
  slotStart,
  slotEnd,
  timeOff,
  scheduleMap,
}: {
  technicianId: string;
  date: string;
  slotStart: Date;
  slotEnd: Date;
  timeOff: TimeOffWindow[];
  scheduleMap: Map<string, ResolvedTechnicianSchedule>;
}) {
  const schedule = scheduleMap.get(technicianId);
  if (!schedule?.isWorking) return false;
  if (isTechnicianOff(technicianId, date, slotStart, slotEnd, timeOff)) return false;
  return isTechnicianScheduledForSlot(schedule, slotStart, slotEnd, date);
}

export async function getAvailableSlots({
  date,
  party,
  serviceIds,
  technicianId,
}: {
  date: string;
  party?: BookingPartyMember[];
  serviceIds?: string[];
  technicianId: TechnicianSelection;
}): Promise<BookingSlot[]> {
  const members = party
    ? getPartyMembersWithServices(party)
    : getPartyMembersWithServices([
        { id: "0", label: "You", serviceIds: serviceIds ?? [], technicianId: technicianId },
      ]);
  const maxDuration = getPartyMaxDurationMinutes(members);
  const dayHours = getBusinessHoursForDate(date);

  if (!dayHours?.open || !dayHours.close || maxDuration <= 0 || members.length === 0) {
    return [];
  }

  const allTechnicians = await getActiveTechnicians();
  const specificPrefs = getDistinctSpecificTechPreferences(members);
  const legacySingleTech =
    technicianId !== "any" && members.length === 1 && specificPrefs.length === 0;

  const selectedTechnicians =
    legacySingleTech
      ? allTechnicians.filter((technician) => technician.id === technicianId)
      : specificPrefs.length > 0
        ? allTechnicians.filter((technician) => specificPrefs.includes(technician.id))
        : allTechnicians;

  if (legacySingleTech && selectedTechnicians.length === 0) {
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

  const scheduleMap = await getSchedulesForDate(
    date,
    allTechnicians.map((technician) => technician.id)
  );
  const timeOffRows = (timeOff as TimeOffWindow[] | null) ?? [];

  const fullDayOffIds = new Set(
    timeOffRows.filter((window) => window.full_day).map((window) => window.technician_id)
  );

  const activeTechnicians = allTechnicians.filter((technician) => {
    const schedule = scheduleMap.get(technician.id);
    return schedule?.isWorking && !fullDayOffIds.has(technician.id);
  });

  const activeTechCount = activeTechnicians.length;
  if (activeTechCount === 0) {
    return [];
  }

  const slots: BookingSlot[] = [];
  const open = toLocalDateTime(date, dayHours.open);
  const close = toLocalDateTime(date, dayHours.close);
  const latestStart = addMinutes(close, -maxDuration);

  for (
    let slotStart = open;
    slotStart <= latestStart;
    slotStart = addMinutes(slotStart, SLOT_INTERVAL_MINUTES)
  ) {
    const slotEnd = addMinutes(slotStart, maxDuration);

    const availableForSlot = activeTechnicians.filter((technician) =>
      isTechnicianAvailableForSlot({
        technicianId: technician.id,
        date,
        slotStart,
        slotEnd,
        timeOff: timeOffRows,
        scheduleMap,
      })
    );

    if (availableForSlot.length === 0) continue;

    const assignments = assignTechniciansForParty({
      date,
      slotStart,
      party: members,
      technicianId,
      busyWindows: (busyWindows as BusyWindow[] | null) ?? [],
      timeOff: timeOffRows,
      activeTechnicians: availableForSlot as DbTechnician[],
      scheduleMap,
    });

    if (!assignments) continue;

    let availableTechnicians = availableForSlot as DbTechnician[];

    if (legacySingleTech) {
      availableTechnicians = availableTechnicians.filter(
        (technician) => technician.id === technicianId
      );
    } else if (specificPrefs.length > 0) {
      availableTechnicians = availableTechnicians.filter((technician) =>
        specificPrefs.includes(technician.id)
      );
    }

    if (availableTechnicians.length === 0) continue;

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
  party,
  serviceIds,
  technicianId,
}: {
  date: string;
  time: string;
  party?: BookingPartyMember[];
  serviceIds?: string[];
  technicianId: TechnicianSelection;
}): Promise<string | null> {
  const slots = await getAvailableSlots({ date, party, serviceIds, technicianId });
  const match = slots.find((slot) => slot.time === time);
  if (!match) return null;
  if (technicianId === "any") return "any";
  return match.technicianIds[0] ?? null;
}
