import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";
import {
  defaultScheduleFromSalonHours,
  getAllTechnicians,
  getSchedulesForTechnicians,
  slugifyTechnicianId,
  validateScheduleInput,
} from "@/lib/booking/technicians";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EmployeeWithSchedule, TechnicianScheduleInput } from "@/lib/technicians/types";

interface CreateEmployeeRequest {
  name?: string;
  role?: string;
  bio?: string;
  schedule?: TechnicianScheduleInput[];
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const employees = await getAllTechnicians();
    const schedules = await getSchedulesForTechnicians(
      employees.map((employee) => employee.id)
    );

    const payload: EmployeeWithSchedule[] = employees.map((employee) => ({
      ...employee,
      schedule: schedules.filter((row) => row.technician_id === employee.id),
    }));

    return NextResponse.json({ employees: payload });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Unable to load employees." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const payload = (await request.json()) as CreateEmployeeRequest;
  const name = payload.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Employee name is required." }, { status: 400 });
  }

  const schedule = payload.schedule ?? defaultScheduleFromSalonHours();
  const scheduleError = validateScheduleInput(schedule);
  if (scheduleError) {
    return NextResponse.json({ error: scheduleError }, { status: 400 });
  }

  const supabase = createAdminClient();
  let id = slugifyTechnicianId(name);

  const { data: existingIds } = await supabase.from("technicians").select("id");
  const taken = new Set((existingIds ?? []).map((row) => row.id));
  if (taken.has(id)) {
    let suffix = 2;
    while (taken.has(`${id}-${suffix}`)) suffix += 1;
    id = `${id}-${suffix}`;
  }

  const { data: maxOrderRow } = await supabase
    .from("technicians")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const displayOrder = (maxOrderRow?.display_order ?? 0) + 1;

  const { error: insertError } = await supabase.from("technicians").insert({
    id,
    name,
    role: payload.role?.trim() || null,
    bio: payload.bio?.trim() || null,
    is_active: true,
    display_order: displayOrder,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const scheduleRows = schedule.map((day) => ({
    technician_id: id,
    day_of_week: day.dayOfWeek,
    is_working: day.isWorking,
    start_time: day.isWorking ? day.startTime : null,
    end_time: day.isWorking ? day.endTime : null,
  }));

  const { error: insertScheduleError } = await supabase.from("technician_schedules").insert(scheduleRows);
  if (insertScheduleError) {
    await supabase.from("technicians").delete().eq("id", id);
    return NextResponse.json({ error: insertScheduleError.message }, { status: 500 });
  }

  const employees = await getAllTechnicians();
  const schedules = await getSchedulesForTechnicians([id]);
  const employee = employees.find((item) => item.id === id);

  return NextResponse.json({
    employee: employee
      ? { ...employee, schedule: schedules }
      : { id, name, role: payload.role ?? null, is_active: true, display_order: displayOrder, schedule: schedules },
  });
}
