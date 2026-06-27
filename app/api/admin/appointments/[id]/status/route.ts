import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_STATUSES = ["cancelled", "no_show"] as const;

interface StatusPayload {
  status?: (typeof ALLOWED_STATUSES)[number];
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  let payload: StatusPayload;
  try {
    payload = (await request.json()) as StatusPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!payload.status || !ALLOWED_STATUSES.includes(payload.status)) {
    return NextResponse.json(
      { error: "Status must be cancelled or no_show." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data: appointment, error: fetchError } = await supabase
    .from("appointments")
    .select("id, status")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  }

  if (appointment.status !== "booked") {
    return NextResponse.json(
      { error: "Only booked appointments can be updated." },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("appointments")
    .update({ status: payload.status })
    .eq("id", params.id)
    .eq("status", "booked");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: payload.status });
}
