import { hours } from "@/lib/config/salonData";

export const SLOT_INTERVAL_MINUTES = 15;

export function parseLocalDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toLocalDateTime(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function getBusinessHoursForDate(date: string) {
  const parsed = parseLocalDate(date);
  const dayName = DAY_NAMES[parsed.getDay()];
  return hours.find((entry) => entry.day === dayName);
}

/** True when the salon is closed on this calendar date (e.g. Sunday). */
export function isSalonClosed(date: string): boolean {
  const dayHours = getBusinessHoursForDate(date);
  return !dayHours?.open || !dayHours?.close;
}

/** First open day starting from today (within 14 days). */
export function getDefaultBookingDate(now = new Date()): string {
  for (let offset = 0; offset < 14; offset++) {
    const date = new Date(now);
    date.setDate(now.getDate() + offset);
    const iso = toIsoDate(date);
    if (!isSalonClosed(iso)) return iso;
  }
  return toIsoDate(now);
}

/** Next open salon day after the given date, or null if none within range. */
export function getNextOpenDate(date: string, maxLookahead = 14): string | null {
  const start = parseLocalDate(date);
  for (let offset = 1; offset <= maxLookahead; offset++) {
    const next = new Date(start);
    next.setDate(start.getDate() + offset);
    const iso = toIsoDate(next);
    if (!isSalonClosed(iso)) return iso;
  }
  return null;
}

export function getBusinessTimeBounds(date: string): { minTime: string; maxTime: string } {
  const dayHours = getBusinessHoursForDate(date);
  if (!dayHours?.open || !dayHours.close) {
    return { minTime: "09:00", maxTime: "19:00" };
  }
  return { minTime: dayHours.open, maxTime: dayHours.close };
}

export function getNextTimeSlot(stepMinutes = SLOT_INTERVAL_MINUTES): string {
  const now = new Date();
  const total = now.getHours() * 60 + now.getMinutes();
  const next = Math.ceil(total / stepMinutes) * stepMinutes;
  const h = Math.floor(next / 60) % 24;
  const m = next % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function maxTime(a: string, b: string): string {
  return a >= b ? a : b;
}

export function minTimeValue(a: string, b: string): string {
  return a <= b ? a : b;
}

export function clampTime(time: string, min: string, max: string): string {
  if (time < min) return min;
  if (time > max) return max;
  return time;
}

export function isSlotInPast(date: string, time: string, now = new Date()): boolean {
  return toLocalDateTime(date, time) <= now;
}

export function filterPastSlots<T extends { time: string }>(
  date: string,
  slots: T[],
  now = new Date()
): T[] {
  if (toIsoDate(now) !== date) return slots;
  return slots.filter((slot) => !isSlotInPast(date, slot.time, now));
}
