import { NextResponse } from "next/server";

import { getCurrentUser, isAdminUser } from "@/lib/admin/auth";
import { technicians } from "@/lib/config/salonData";
import { createAdminClient } from "@/lib/supabase/admin";

interface TimeOffRequest {
  technicianId?: string;
  date?: string;
  off?: boolean;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as TimeOffRequest;
  const validationError = validate(payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { error: deleteError } = await supabase
    .from("technician_time_off")
    .delete()
    .eq("technician_id", payload.technicianId!)
    .eq("off_date", payload.date!)
    .eq("full_day", true);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (payload.off) {
    const { error } = await supabase.from("technician_time_off").insert({
      technician_id: payload.technicianId!,
      off_date: payload.date!,
      full_day: true,
      reason: "Admin marked off/sick",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

function validate(payload: TimeOffRequest) {
  if (!payload.technicianId || !technicians.some((t) => t.id === payload.technicianId)) {
    return "A valid technician is required.";
  }

  if (!payload.date || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
    return "A valid date is required.";
  }

  if (typeof payload.off !== "boolean") {
    return "Off status is required.";
  }

  return null;
}
