import "server-only";

import { hours } from "@/lib/config/salonData";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseLocalDate } from "@/lib/booking/time-utils";
import type {
  DbTechnician,
  ResolvedTechnicianSchedule,
  TechnicianScheduleInput,
  TechnicianScheduleOverrideRow,
  TechnicianScheduleRow,
} from "@/lib/technicians/types";
import { DAY_LABELS } from "@/lib/technicians/types";

export type { DbTechnician, TechnicianScheduleRow, ResolvedTechnicianSchedule, TechnicianScheduleOverrideRow };

const DAY_NAMES = [...DAY_LABELS];

function isMissingOverridesTableError(message: string): boolean {
  return (
    message.includes("technician_schedule_overrides") ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}

export function normalizeTimeValue(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 5);
}

export function getDayOfWeek(date: string): number {
  return parseLocalDate(date).getDay();
}

export function defaultScheduleFromSalonHours(): TechnicianScheduleInput[] {
  return DAY_NAMES.map((dayName, dayOfWeek) => {
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

export function getSalonHoursForDay(dayOfWeek: number) {
  const dayName = DAY_NAMES[dayOfWeek];
  return hours.find((entry) => entry.day === dayName);
}

export function intersectScheduleWithSalonHours(
  schedule: Pick<TechnicianScheduleRow, "is_working" | "start_time" | "end_time">,
  dayOfWeek: number
): { isWorking: boolean; startTime: string | null; endTime: string | null } {
  if (!schedule.is_working) {
    return { isWorking: false, startTime: null, endTime: null };
  }

  const salonDay = getSalonHoursForDay(dayOfWeek);
  if (!salonDay?.open || !salonDay?.close) {
    return { isWorking: false, startTime: null, endTime: null };
  }

  const employeeStart = normalizeTimeValue(schedule.start_time);
  const employeeEnd = normalizeTimeValue(schedule.end_time);
  if (!employeeStart || !employeeEnd) {
    return { isWorking: false, startTime: null, endTime: null };
  }

  const startTime = employeeStart > salonDay.open ? employeeStart : salonDay.open;
  const endTime = employeeEnd < salonDay.close ? employeeEnd : salonDay.close;

  if (startTime >= endTime) {
    return { isWorking: false, startTime: null, endTime: null };
  }

  return { isWorking: true, startTime, endTime };
}

export async function getActiveTechnicians(): Promise<DbTechnician[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("technicians")
    .select("id, name, role, is_active, display_order, bio, avatar_url")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return (data as DbTechnician[]) ?? [];
}

export async function getAllTechnicians(): Promise<DbTechnician[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("technicians")
    .select("id, name, role, is_active, display_order, bio, avatar_url")
    .order("display_order", { ascending: true });

  if (error) throw error;
  return (data as DbTechnician[]) ?? [];
}

export async function getTechnicianByIdFromDb(id: string): Promise<DbTechnician | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("technicians")
    .select("id, name, role, is_active, display_order, bio, avatar_url")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as DbTechnician | null) ?? null;
}

export async function getSchedulesForTechnicians(
  technicianIds: string[]
): Promise<TechnicianScheduleRow[]> {
  if (technicianIds.length === 0) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("technician_schedules")
    .select("technician_id, day_of_week, is_working, start_time, end_time")
    .in("technician_id", technicianIds)
    .order("day_of_week", { ascending: true });

  if (error) throw error;
  return ((data as TechnicianScheduleRow[] | null) ?? []).map((row) => ({
    ...row,
    start_time: normalizeTimeValue(row.start_time),
    end_time: normalizeTimeValue(row.end_time),
  }));
}

export async function getScheduleOverridesForDate(
  date: string,
  technicianIds?: string[]
): Promise<TechnicianScheduleOverrideRow[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("technician_schedule_overrides")
    .select("id, technician_id, override_date, is_working, start_time, end_time, reason")
    .eq("override_date", date);

  if (technicianIds?.length) {
    query = query.in("technician_id", technicianIds);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingOverridesTableError(error.message)) return [];
    throw error;
  }

  return ((data as TechnicianScheduleOverrideRow[] | null) ?? []).map((row) => ({
    ...row,
    start_time: normalizeTimeValue(row.start_time),
    end_time: normalizeTimeValue(row.end_time),
  }));
}

export async function getScheduleOverridesForTechnician(
  technicianId: string,
  fromDate: string,
  toDate: string
): Promise<TechnicianScheduleOverrideRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("technician_schedule_overrides")
    .select("id, technician_id, override_date, is_working, start_time, end_time, reason")
    .eq("technician_id", technicianId)
    .gte("override_date", fromDate)
    .lte("override_date", toDate)
    .order("override_date", { ascending: true });

  if (error) {
    if (isMissingOverridesTableError(error.message)) return [];
    throw error;
  }

  return ((data as TechnicianScheduleOverrideRow[] | null) ?? []).map((row) => ({
    ...row,
    start_time: normalizeTimeValue(row.start_time),
    end_time: normalizeTimeValue(row.end_time),
  }));
}

export async function getSchedulesForDate(
  date: string,
  technicianIds?: string[]
): Promise<Map<string, ResolvedTechnicianSchedule>> {
  const dayOfWeek = getDayOfWeek(date);
  const ids =
    technicianIds ??
    (await getActiveTechnicians()).map((technician) => technician.id);
  const [rows, overrides] = await Promise.all([
    getSchedulesForTechnicians(ids),
    getScheduleOverridesForDate(date, ids),
  ]);
  const overrideByTech = new Map(
    overrides.map((override) => [override.technician_id, override])
  );
  const map = new Map<string, ResolvedTechnicianSchedule>();

  for (const id of ids) {
    const override = overrideByTech.get(id);

    if (override) {
      const resolved = intersectScheduleWithSalonHours(
        {
          is_working: override.is_working,
          start_time: override.start_time,
          end_time: override.end_time,
        },
        dayOfWeek
      );
      map.set(id, {
        technicianId: id,
        ...resolved,
      });
      continue;
    }

    const row = rows.find(
      (schedule) => schedule.technician_id === id && schedule.day_of_week === dayOfWeek
    );

    if (!row) {
      map.set(id, {
        technicianId: id,
        isWorking: false,
        startTime: null,
        endTime: null,
      });
      continue;
    }

    const resolved = intersectScheduleWithSalonHours(row, dayOfWeek);
    map.set(id, {
      technicianId: id,
      ...resolved,
    });
  }

  return map;
}

export function isTechnicianScheduledForSlot(
  schedule: ResolvedTechnicianSchedule,
  slotStart: Date,
  slotEnd: Date,
  date: string
): boolean {
  if (!schedule.isWorking || !schedule.startTime || !schedule.endTime) {
    return false;
  }

  const [startHour, startMinute] = schedule.startTime.split(":").map(Number);
  const [endHour, endMinute] = schedule.endTime.split(":").map(Number);
  const parsed = parseLocalDate(date);
  const windowStart = new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
    startHour,
    startMinute,
    0,
    0
  );
  const windowEnd = new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
    endHour,
    endMinute,
    0,
    0
  );

  return slotStart >= windowStart && slotEnd <= windowEnd;
}

export function validateScheduleInput(
  schedule: TechnicianScheduleInput[]
): string | null {
  if (schedule.length !== 7) {
    return "Schedule must include all 7 days.";
  }

  for (const day of schedule) {
    if (day.dayOfWeek < 0 || day.dayOfWeek > 6) {
      return "Invalid day of week.";
    }

    const salonDay = getSalonHoursForDay(day.dayOfWeek);

    if (!day.isWorking) continue;

    if (!day.startTime || !day.endTime) {
      return `${DAY_NAMES[day.dayOfWeek]} requires start and end times when working.`;
    }

    if (day.startTime >= day.endTime) {
      return `${DAY_NAMES[day.dayOfWeek]} end time must be after start time.`;
    }

    if (!salonDay?.open || !salonDay?.close) {
      return `${DAY_NAMES[day.dayOfWeek]} is a closed salon day.`;
    }

    if (day.startTime < salonDay.open || day.endTime > salonDay.close) {
      return `${DAY_NAMES[day.dayOfWeek]} hours must fall within salon hours (${salonDay.open}–${salonDay.close}).`;
    }
  }

  return null;
}

export function slugifyTechnicianId(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return base ? `tech-${base}` : `tech-${Date.now()}`;
}
