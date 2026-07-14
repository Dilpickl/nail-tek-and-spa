import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a price (in whole dollars) as USD. */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format currency with cents — used for transactions and analytics. */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Format a single duration value, e.g. "1 hr 15 min". */
function formatDurationValue(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs} hr`;
  return `${hrs} hr ${mins} min`;
}

/**
 * Format a duration in minutes as a friendly label.
 * Pass `minMinutes` to show a range (booking still uses the upper bound).
 */
export function formatDuration(minutes: number, minMinutes?: number): string {
  if (minMinutes != null && minMinutes > 0 && minMinutes < minutes) {
    if (minMinutes < 60 && minutes < 60) {
      return `${minMinutes}–${minutes} min`;
    }
    if (minMinutes < 60 && minutes % 60 === 0) {
      return `${minMinutes} min–${minutes / 60} hr`;
    }
    return `${formatDurationValue(minMinutes)}–${formatDurationValue(minutes)}`;
  }
  return formatDurationValue(minutes);
}
