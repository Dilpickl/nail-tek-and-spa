import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";
import { getSchedulesForTechnicians, getTechnicianByIdFromDb } from "@/lib/booking/technicians";
import { createAdminClient } from "@/lib/supabase/admin";

interface UpdateEmployeeRequest {
  name?: string;
  role?: string | null;
  bio?: string | null;
  isActive?: boolean;
  displayOrder?: number;
}

interface RouteContext {
  params: { id: string };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const payload = (await request.json()) as UpdateEmployeeRequest;
  const existing = await getTechnicianByIdFromDb(params.id);
  if (!existing) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (payload.name !== undefined) {
    const name = payload.name.trim();
    if (!name) {
      return NextResponse.json({ error: "Employee name is required." }, { status: 400 });
    }
    updates.name = name;
  }
  if (payload.role !== undefined) updates.role = payload.role?.trim() || null;
  if (payload.bio !== undefined) updates.bio = payload.bio?.trim() || null;
  if (payload.isActive !== undefined) updates.is_active = payload.isActive;
  if (payload.displayOrder !== undefined) updates.display_order = payload.displayOrder;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("technicians").update(updates).eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const employee = await getTechnicianByIdFromDb(params.id);
  const schedule = await getSchedulesForTechnicians([params.id]);
  return NextResponse.json({ employee: employee ? { ...employee, schedule } : null });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const existing = await getTechnicianByIdFromDb(params.id);
  if (!existing) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const hardDelete = url.searchParams.get("hard") === "true";

  const supabase = createAdminClient();

  if (!hardDelete) {
    const { error } = await supabase
      .from("technicians")
      .update({ is_active: false })
      .eq("id", params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deactivated: true });
  }

  // Appointments.technician_id is ON DELETE SET NULL — past bookings stay, staff row goes.
  const { error: scheduleError } = await supabase
    .from("technician_schedules")
    .delete()
    .eq("technician_id", params.id);

  if (scheduleError) {
    return NextResponse.json({ error: scheduleError.message }, { status: 500 });
  }

  const { error: overridesError } = await supabase
    .from("technician_schedule_overrides")
    .delete()
    .eq("technician_id", params.id);

  if (overridesError) {
    return NextResponse.json({ error: overridesError.message }, { status: 500 });
  }

  const { error: timeOffError } = await supabase
    .from("technician_time_off")
    .delete()
    .eq("technician_id", params.id);

  if (timeOffError) {
    return NextResponse.json({ error: timeOffError.message }, { status: 500 });
  }

  const { error } = await supabase.from("technicians").delete().eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: true });
}
