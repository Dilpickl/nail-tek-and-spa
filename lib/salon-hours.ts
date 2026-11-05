import { hours } from "@/lib/config/salonData";
import { getSalonDateParts } from "@/lib/booking/time-utils";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** "20:00" -> "8 PM", "09:30" -> "9:30 AM". */
export function formatHourLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export interface OpenStatus {
  open: boolean;
  /** Short line such as "Open today until 8 PM" or "Opens tomorrow at 9 AM". */
  label: string;
}

/** Whether the salon is open right now (salon time zone), from the published hours. */
export function getOpenStatus(now: Date = new Date()): OpenStatus {
  const parts = getSalonDateParts(now);
  const minutes = parts.hour * 60 + parts.minute;
  const today = hours.find((h) => h.day === DAY_NAMES[parts.dayOfWeek]);

  if (today?.open && today.close) {
    if (minutes < toMinutes(today.open)) {
      return { open: false, label: `Opens today at ${formatHourLabel(today.open)}` };
    }
    if (minutes < toMinutes(today.close)) {
      return { open: true, label: `Open today until ${formatHourLabel(today.close)}` };
    }
  }

  for (let offset = 1; offset <= 7; offset += 1) {
    const dayIndex = (parts.dayOfWeek + offset) % 7;
    const next = hours.find((h) => h.day === DAY_NAMES[dayIndex]);
    if (next?.open) {
      const when = offset === 1 ? "tomorrow" : DAY_NAMES[dayIndex];
      return { open: false, label: `Closed now · opens ${when} at ${formatHourLabel(next.open)}` };
    }
  }

  return { open: false, label: "Closed now" };
}
