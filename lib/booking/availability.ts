import {
  allServices,
  hours,
  technicians,
  type Service,
} from "@/lib/config/salonData";
import { createAdminClient } from "@/lib/supabase/admin";

export const SLOT_INTERVAL_MINUTES = 15;

export type TechnicianSelection = "any" | string;

export interface BookingPartyMember {
  id: string;
  label: string;
  serviceIds: string[];
}

export interface BookingSlot {
  time: string;
  technicianIds: string[];
}

interface BusyWindow {
  technician_id: string | null;
  starts_at: string;
  ends_at: string;
}

interface TimeOffWindow {
  technician_id: string;
  off_date: string;
  full_day: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

const serviceById = new Map(allServices.map((service) => [service.id, service]));

export function getServicesByIds(serviceIds: string[]): Service[] {
  return serviceIds.map((id) => {
    const service = serviceById.get(id);
    if (!service) {
      throw new Error(`Unknown service id: ${id}`);
    }
    return service;
  });
}

export function getTotalDurationMinutes(serviceIds: string[]): number {
  return getServicesByIds(serviceIds).reduce(
    (total, service) => total + service.durationMinutes,
    0
  );
}

export function flattenPartyServiceIds(party: BookingPartyMember[]): string[] {
  return party.flatMap((member) => member.serviceIds);
}

export function getBusinessHoursForDate(date: string) {
  const parsed = parseLocalDate(date);
  return hours[parsed.getDay()];
}

export function parseLocalDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toLocalDateTime(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
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
        .select("technician_id, starts_at, ends_at")
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

    const technicianIds = selectedTechnicians
      .filter((technician) => {
        const hasBusyOverlap = (busyWindows as BusyWindow[] | null)?.some(
          (busy) =>
            busy.technician_id === technician.id &&
            overlaps(slotStart, slotEnd, new Date(busy.starts_at), new Date(busy.ends_at))
        );

        if (hasBusyOverlap) return false;

        return !isTechnicianOff(
          technician.id,
          date,
          slotStart,
          slotEnd,
          (timeOff as TimeOffWindow[] | null) ?? []
        );
      })
      .map((technician) => technician.id);

    if (technicianIds.length > 0) {
      slots.push({ time: formatTime(slotStart), technicianIds });
    }
  }

  return slots;
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
  return match?.technicianIds[0] ?? null;
}
