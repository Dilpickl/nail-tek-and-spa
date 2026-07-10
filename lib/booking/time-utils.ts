import { hours } from "@/lib/config/salonData";

export const SLOT_INTERVAL_MINUTES = 15;

/** Salon wall-clock timezone (Algonquin, IL). */
export const SALON_TIMEZONE = "America/Chicago";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Offset (ms) of `timeZone` relative to UTC at the given instant.
 * Positive = zone is ahead of UTC (e.g. +9h for Tokyo).
 */
function getTimeZoneOffsetMs(timeZone: string, instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );

  return asUtc - instant.getTime();
}

/** Calendar date parts for an instant in the salon timezone. */
export function getSalonDateParts(instant: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  dayOfWeek: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SALON_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(instant);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const weekday = get("weekday");
  const dayOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
    dayOfWeek: dayOfWeek >= 0 ? dayOfWeek : 0,
  };
}

/**
 * Convert a salon-local calendar date + wall-clock time into a UTC Date.
 * Safe on Vercel (UTC) and local machines — always uses America/Chicago.
 */
export function toLocalDateTime(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  // First guess: treat the wall time as if it were UTC, then correct by zone offset.
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  let offsetMs = getTimeZoneOffsetMs(SALON_TIMEZONE, utcGuess);
  let instant = new Date(utcGuess.getTime() - offsetMs);

  // Re-check around DST transitions where the offset can change.
  const adjustedOffset = getTimeZoneOffsetMs(SALON_TIMEZONE, instant);
  if (adjustedOffset !== offsetMs) {
    instant = new Date(utcGuess.getTime() - adjustedOffset);
  }

  return instant;
}

/** YYYY-MM-DD for a calendar date string (identity) or for "now" in salon TZ. */
export function toIsoDate(date: Date): string {
  const parts = getSalonDateParts(date);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

/** HH:MM wall-clock time in the salon timezone. */
export function formatSalonTime(date: Date): string {
  const parts = getSalonDateParts(date);
  return `${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

/**
 * Calendar-date helper for day-of-week / date math.
 * Uses UTC noon so the weekday is stable regardless of server timezone.
 */
export function parseLocalDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

export function getDayOfWeek(date: string): number {
  return parseLocalDate(date).getUTCDay();
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function shiftIsoDate(date: string, days: number): string {
  const parsed = parseLocalDate(date);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return `${parsed.getUTCFullYear()}-${pad2(parsed.getUTCMonth() + 1)}-${pad2(parsed.getUTCDate())}`;
}

export function getBusinessHoursForDate(date: string) {
  const dayName = DAY_NAMES[getDayOfWeek(date)];
  return hours.find((entry) => entry.day === dayName);
}

/** True when the salon is closed on this calendar date (e.g. Sunday). */
export function isSalonClosed(date: string): boolean {
  const dayHours = getBusinessHoursForDate(date);
  return !dayHours?.open || !dayHours?.close;
}

/** First open day starting from today in salon time (within 14 days). */
export function getDefaultBookingDate(now = new Date()): string {
  const today = toIsoDate(now);
  for (let offset = 0; offset < 14; offset++) {
    const iso = offset === 0 ? today : shiftIsoDate(today, offset);
    if (!isSalonClosed(iso)) return iso;
  }
  return today;
}

/** Next open salon day after the given date, or null if none within range. */
export function getNextOpenDate(date: string, maxLookahead = 14): string | null {
  for (let offset = 1; offset <= maxLookahead; offset++) {
    const iso = shiftIsoDate(date, offset);
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

/** Next slot boundary from "now" in salon wall-clock time. */
export function getNextTimeSlot(stepMinutes = SLOT_INTERVAL_MINUTES, now = new Date()): string {
  const parts = getSalonDateParts(now);
  const total = parts.hour * 60 + parts.minute;
  const next = Math.ceil(total / stepMinutes) * stepMinutes;
  const h = Math.floor(next / 60) % 24;
  const m = next % 60;
  return `${pad2(h)}:${pad2(m)}`;
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

/** Format an ISO instant for display in salon local time. */
export function formatInSalonTime(
  value: string | Date,
  options: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SALON_TIMEZONE,
    ...options,
  }).format(typeof value === "string" ? new Date(value) : value);
}
