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

function validateOverrideInput(input: TechnicianScheduleOverrideInput): string | null {
  if (!input.overrideDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.overrideDate)) {
    return "A valid date is required.";
  }

  const dayOfWeek = parseLocalDate(input.overrideDate).getDay();
  const salonDay = getSalonHoursForDay(dayOfWeek);
  if (!salonDay?.open || !salonDay.close) {
    return "The salon is closed on that date.";
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
  const validationError = validateOverrideInput(payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("technician_schedule_overrides")
    .upsert(
      {
        technician_id: params.id,
        override_date: payload.overrideDate,
        is_working: payload.isWorking,
        start_time: payload.isWorking ? payload.startTime : null,
        end_time: payload.isWorking ? payload.endTime : null,
        reason: payload.reason?.trim() || null,
      },
      { onConflict: "technician_id,override_date" }
    )
    .select("id, technician_id, override_date, is_working, start_time, end_time, reason")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ override: data });
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
