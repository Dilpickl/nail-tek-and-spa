import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";
import {
  getSchedulesForTechnicians,
  getTechnicianByIdFromDb,
  validateScheduleInput,
} from "@/lib/booking/technicians";
import { formatSalonTime, toIsoDate, getDayOfWeek } from "@/lib/booking/time-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TechnicianScheduleInput } from "@/lib/technicians/types";

interface ScheduleRequest {
  schedule?: TechnicianScheduleInput[];
}

interface RouteContext {
  params: { id: string };
}

export async function PUT(request: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const existing = await getTechnicianByIdFromDb(params.id);
  if (!existing) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  const payload = (await request.json()) as ScheduleRequest;
  const schedule = payload.schedule;
  if (!schedule?.length) {
    return NextResponse.json({ error: "Schedule is required." }, { status: 400 });
  }

  const scheduleError = validateScheduleInput(schedule);
  if (scheduleError) {
    return NextResponse.json({ error: scheduleError }, { status: 400 });
  }

  const supabase = createAdminClient();
  const conflictCount = await countFutureScheduleConflicts(params.id, schedule);

  const { error: deleteError } = await supabase
    .from("technician_schedules")
    .delete()
    .eq("technician_id", params.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const rows = schedule.map((day) => ({
    technician_id: params.id,
    day_of_week: day.dayOfWeek,
    is_working: day.isWorking,
    start_time: day.isWorking ? day.startTime : null,
    end_time: day.isWorking ? day.endTime : null,
  }));

  const { error: insertError } = await supabase.from("technician_schedules").insert(rows);
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const savedSchedule = await getSchedulesForTechnicians([params.id]);
  return NextResponse.json({
    schedule: savedSchedule,
    futureBookingConflicts: conflictCount,
  });
}

async function countFutureScheduleConflicts(
  technicianId: string,
  schedule: TechnicianScheduleInput[]
) {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("appointments")
    .select("starts_at")
    .eq("technician_id", technicianId)
    .eq("status", "booked")
    .gte("starts_at", nowIso);

  if (error || !data?.length) return 0;

  const scheduleByDay = new Map(schedule.map((day) => [day.dayOfWeek, day]));

  return data.filter((appointment) => {
    const startsAt = new Date(appointment.starts_at);
    const daySchedule = scheduleByDay.get(getDayOfWeek(toIsoDate(startsAt)));
    if (!daySchedule?.isWorking) return true;

    const time = formatSalonTime(startsAt);
    if (!daySchedule.startTime || !daySchedule.endTime) return true;
    return time < daySchedule.startTime || time >= daySchedule.endTime;
  }).length;
}
