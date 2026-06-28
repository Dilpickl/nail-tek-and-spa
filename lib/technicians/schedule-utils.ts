import { hours } from "@/lib/config/salonData";
import type {
  EmployeeWithSchedule,
  TechnicianScheduleInput,
  TechnicianScheduleRow,
} from "@/lib/technicians/types";
import { DAY_LABELS } from "@/lib/technicians/types";

export function scheduleRowsToInput(rows: TechnicianScheduleRow[]): TechnicianScheduleInput[] {
  const byDay = new Map(rows.map((row) => [row.day_of_week, row]));
  return DAY_LABELS.map((_, dayOfWeek) => {
    const row = byDay.get(dayOfWeek);
    return {
      dayOfWeek,
      isWorking: row?.is_working ?? false,
      startTime: row?.start_time?.slice(0, 5) ?? null,
      endTime: row?.end_time?.slice(0, 5) ?? null,
    };
  });
}

export function getSalonHoursLabel(dayOfWeek: number): string {
  const dayName = DAY_LABELS[dayOfWeek];
  const salonDay = hours.find((entry) => entry.day === dayName);
  if (!salonDay?.open || !salonDay.close) return "Closed";
  return `${salonDay.open}–${salonDay.close}`;
}

export function getWeekOverview(employees: EmployeeWithSchedule[]) {
  return DAY_LABELS.map((label, dayOfWeek) => {
    const salonDay = hours.find((entry) => entry.day === label);
    if (!salonDay?.open || !salonDay.close) {
      return { dayOfWeek, label: label.slice(0, 3), count: 0, closed: true };
    }

    const count = employees.filter((employee) => {
      if (!employee.is_active) return false;
      const day = employee.schedule.find((row) => row.day_of_week === dayOfWeek);
      return day?.is_working;
    }).length;

    return { dayOfWeek, label: label.slice(0, 3), count, closed: false };
  });
}

export function copyMondayToWeekdays(schedule: TechnicianScheduleInput[]): TechnicianScheduleInput[] {
  const monday = schedule.find((day) => day.dayOfWeek === 1);
  if (!monday) return schedule;

  return schedule.map((day) => {
    if (day.dayOfWeek === 0 || day.dayOfWeek === 6) return day;
    if (day.dayOfWeek === 1) return day;
    return {
      ...day,
      isWorking: monday.isWorking,
      startTime: monday.startTime,
      endTime: monday.endTime,
    };
  });
}

export function applySalonHoursToSchedule(): TechnicianScheduleInput[] {
  return DAY_LABELS.map((dayName, dayOfWeek) => {
    const salonDay = hours.find((entry) => entry.day === dayName);
    const isWorking = Boolean(salonDay?.open && salonDay?.close);
    return {
      dayOfWeek,
      isWorking,
      startTime: salonDay?.open ?? null,
      endTime: salonDay?.close ?? null,
    };
  });
}
