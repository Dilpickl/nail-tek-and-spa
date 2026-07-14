import { NextResponse } from "next/server";

import {
  notifyUpcomingAppointment,
} from "@/lib/admin/push";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTechnicianByIdFromDb } from "@/lib/booking/technicians";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vercel Cron — runs every minute.
 * Sends admin push notifications for appointments starting in ~5 minutes.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const now = Date.now();
  const windowStart = new Date(now + 4.5 * 60_000).toISOString();
  const windowEnd = new Date(now + 5.5 * 60_000).toISOString();

  const supabase = createAdminClient();

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select("id, customer_name, starts_at, technician_id, status, is_guest")
    .eq("status", "booked")
    .eq("is_guest", false)
    .gte("starts_at", windowStart)
    .lte("starts_at", windowEnd);

  if (error) {
    console.error("Reminder query failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let notified = 0;
  let skipped = 0;

  for (const appointment of appointments ?? []) {
    const { error: claimError } = await supabase
      .from("appointment_reminder_sends")
      .insert({
        appointment_id: appointment.id,
        kind: "upcoming_5min",
      });

    // Unique violation = already reminded
    if (claimError) {
      skipped += 1;
      continue;
    }

    let technicianName: string | null = null;
    if (appointment.technician_id) {
      technicianName =
        (await getTechnicianByIdFromDb(appointment.technician_id))?.name ?? null;
    }

    await notifyUpcomingAppointment({
      customerName: appointment.customer_name,
      startsAt: new Date(appointment.starts_at),
      appointmentId: appointment.id,
      technicianName,
    });
    notified += 1;
  }

  return NextResponse.json({
    ok: true,
    checked: appointments?.length ?? 0,
    notified,
    skipped,
  });
}
