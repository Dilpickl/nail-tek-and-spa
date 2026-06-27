export type DateRangePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "last_90_days"
  | "custom";

export interface DateRange {
  preset: DateRangePreset;
  from: Date;
  to: Date;
  label: string;
}

export const DATE_RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "last_90_days", label: "Last 90 Days" },
  { value: "custom", label: "Custom" },
];

export function resolveDateRange(
  preset: string,
  customFrom?: string,
  customTo?: string
): DateRange | null {
  const now = new Date();
  const todayStart = startOfDay(now);

  switch (preset) {
    case "today":
      return {
        preset: "today",
        from: todayStart,
        to: endOfDay(now),
        label: "Today",
      };
    case "yesterday": {
      const y = addDays(todayStart, -1);
      return {
        preset: "yesterday",
        from: y,
        to: endOfDay(y),
        label: "Yesterday",
      };
    }
    case "this_week": {
      const from = startOfWeek(todayStart);
      return {
        preset: "this_week",
        from,
        to: endOfDay(now),
        label: "This Week",
      };
    }
    case "last_week": {
      const thisWeekStart = startOfWeek(todayStart);
      const from = addDays(thisWeekStart, -7);
      const to = endOfDay(addDays(thisWeekStart, -1));
      return {
        preset: "last_week",
        from,
        to,
        label: "Last Week",
      };
    }
    case "this_month": {
      const from = startOfMonth(now);
      return {
        preset: "this_month",
        from,
        to: endOfDay(now),
        label: "This Month",
      };
    }
    case "last_month": {
      const thisMonthStart = startOfMonth(now);
      const from = startOfMonth(addDays(thisMonthStart, -1));
      const to = endOfDay(addDays(thisMonthStart, -1));
      return {
        preset: "last_month",
        from,
        to,
        label: "Last Month",
      };
    }
    case "last_90_days": {
      const from = addDays(todayStart, -89);
      return {
        preset: "last_90_days",
        from,
        to: endOfDay(now),
        label: "Last 90 Days",
      };
    }
    case "custom": {
      if (!customFrom || !customTo) return null;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(customFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(customTo)) {
        return null;
      }
      const from = startOfDay(new Date(`${customFrom}T00:00:00`));
      const to = endOfDay(new Date(`${customTo}T00:00:00`));
      if (from > to) return null;
      return {
        preset: "custom",
        from,
        to,
        label: `${customFrom} – ${customTo}`,
      };
    }
    default:
      return null;
  }
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function startOfMonth(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

export function toIsoDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function eachDayInRange(from: Date, to: Date): string[] {
  const days: string[] = [];
  const cursor = startOfDay(from);
  const end = startOfDay(to);

  while (cursor <= end) {
    days.push(toIsoDateString(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}
