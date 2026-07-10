import { formatInSalonTime, toLocalDateTime } from "@/lib/booking/time-utils";

export function formatTime(value: string) {
  return formatInSalonTime(value, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTimeRange(startsAt: string, endsAt: string) {
  return `${formatTime(startsAt)} – ${formatTime(endsAt)}`;
}

export function formatReadableDate(date: string) {
  return formatInSalonTime(toLocalDateTime(date, "12:00"), {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMonthDay(date: string) {
  return formatInSalonTime(toLocalDateTime(date, "12:00"), {
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(value: string) {
  return formatInSalonTime(value, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export { formatMoney } from "@/lib/utils";
