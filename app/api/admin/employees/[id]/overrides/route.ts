import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";
import {
  getScheduleOverridesForTechnician,
  getTechnicianByIdFromDb,
  getSalonHoursForDay,
} from "@/lib/booking/technicians";
import { parseLocalDate, toIsoDate } from "@/lib/booking/time-utils";
import type { TechnicianScheduleOverrideInput } from "@/lib/technicians/types";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteContext {
  params: { id: string };
}

function isValidIsoDate(value: string | null | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function validateOverrideInputForDate(
  input: TechnicianScheduleOverrideInput,
  overrideDate: string
): string | null {
  if (!isValidIsoDate(overrideDate)) {
    return "A valid date is required.";
  }

  const dayOfWeek = parseLocalDate(overrideDate).getDay();
  const salonDay = getSalonHoursForDay(dayOfWeek);
  if (!salonDay?.open || !salonDay.close) {
    return `The salon is closed on ${overrideDate}.`;
  }

  if (!input.isWorking) return null;

  if (!input.startTime || !input.endTime) {
    return "Custom hours require a start and end time.";
  }

  if (input.startTime >= input.endTime) {
    return "End time must be after start time.";
  }

  if (input.startTime < salonDay.open || input.endTime > salonDay.close) {
    return `Hours must fall within salon hours (${salonDay.open}–${salonDay.close}).`;
  }

  return null;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const employee = await getTechnicianByIdFromDb(params.id);
  if (!employee) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  const today = toIsoDate(new Date());
  const end = new Date();
  end.setDate(end.getDate() + 60);
  const toDate = toIsoDate(end);

  const overrides = await getScheduleOverridesForTechnician(params.id, today, toDate);
  return NextResponse.json({ overrides });
}

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const employee = await getTechnicianByIdFromDb(params.id);
  if (!employee) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  const payload = (await request.json()) as TechnicianScheduleOverrideInput;
  if (!isValidIsoDate(payload.overrideDate)) {
    return NextResponse.json({ error: "A valid date is required." }, { status: 400 });
  }

  if (payload.rangeEndDate && !isValidIsoDate(payload.rangeEndDate)) {
    return NextResponse.json(
      { error: "Range end must be a valid date." },
      { status: 400 }
    );
  }

  const startDate = parseLocalDate(payload.overrideDate);
  const rangeEndDate = payload.rangeEndDate
    ? parseLocalDate(payload.rangeEndDate)
    : startDate;
  if (rangeEndDate < startDate) {
    return NextResponse.json(
      { error: "Range end date must be the same day or after the start date." },
      { status: 400 }
    );
  }

  const overrideDates: string[] = [];
  for (
    let cursor = new Date(startDate);
    cursor <= rangeEndDate;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    overrideDates.push(toIsoDate(cursor));
  }

  for (const overrideDate of overrideDates) {
    const validationError = validateOverrideInputForDate(payload, overrideDate);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
  }

  const supabase = createAdminClient();
  const upsertRows = overrideDates.map((overrideDate) => ({
    technician_id: params.id,
    override_date: overrideDate,
    is_working: payload.isWorking,
    start_time: payload.isWorking ? payload.startTime : null,
    end_time: payload.isWorking ? payload.endTime : null,
    reason: payload.reason?.trim() || null,
  }));

  const { data, error } = await supabase
    .from("technician_schedule_overrides")
    .upsert(upsertRows, { onConflict: "technician_id,override_date" })
    .select("id, technician_id, override_date, is_working, start_time, end_time, reason")
    .order("override_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ overrides: data ?? [] });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const overrideId = searchParams.get("overrideId");
  const overrideDate = searchParams.get("date");

  const supabase = createAdminClient();

  if (overrideId) {
    const { error } = await supabase
      .from("technician_schedule_overrides")
      .delete()
      .eq("id", overrideId)
      .eq("technician_id", params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  if (!overrideDate || !/^\d{4}-\d{2}-\d{2}$/.test(overrideDate)) {
    return NextResponse.json({ error: "overrideId or date is required." }, { status: 400 });
  }

  const { error } = await supabase
    .from("technician_schedule_overrides")
    .delete()
    .eq("technician_id", params.id)
    .eq("override_date", overrideDate);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
