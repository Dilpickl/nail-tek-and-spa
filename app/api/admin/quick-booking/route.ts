import { NextResponse } from "next/server";

import { getCurrentUser, isAdminUser } from "@/lib/admin/auth";
import { toLocalDateTime } from "@/lib/booking/availability";
import { technicians } from "@/lib/config/salonData";
import { createAdminClient } from "@/lib/supabase/admin";

interface QuickBookingRequest {
  source?: "walk_in" | "phone";
  technicianId?: string;
  date?: string;
  time?: string;
  durationMinutes?: number;
  customerName?: string;
  customerPhone?: string;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as QuickBookingRequest;
  const validationError = validate(payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const startsAt = toLocalDateTime(payload.date!, payload.time!);
  const endsAt = new Date(startsAt.getTime() + payload.durationMinutes! * 60_000);
  const supabase = createAdminClient();

  const { data: overlaps, error: overlapError } = await supabase
    .from("appointments")
    .select("id")
    .eq("technician_id", payload.technicianId!)
    .eq("status", "booked")
    .lt("starts_at", endsAt.toISOString())
    .gt("ends_at", startsAt.toISOString())
    .limit(1);

  if (overlapError) {
    return NextResponse.json({ error: overlapError.message }, { status: 500 });
  }

  if (overlaps && overlaps.length > 0) {
    return NextResponse.json(
      { error: "That technician already has a booking at this time." },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("appointments").insert({
    technician_id: payload.technicianId!,
    customer_name: payload.customerName!.trim(),
    customer_phone: payload.customerPhone!.trim() || "N/A",
    customer_email: null,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    status: "booked",
    source: payload.source!,
    sms_consent: false,
    notes:
      payload.source === "walk_in"
        ? "Manual walk-in block created from admin dashboard."
        : "Manual phone booking created from admin dashboard.",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function validate(payload: QuickBookingRequest) {
  if (payload.source !== "walk_in" && payload.source !== "phone") {
    return "A valid booking source is required.";
  }

  if (!payload.technicianId || !technicians.some((t) => t.id === payload.technicianId)) {
    return "A valid technician is required.";
  }

  if (!payload.date || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
    return "A valid date is required.";
  }

  if (!payload.time || !/^\d{2}:\d{2}$/.test(payload.time)) {
    return "A valid start time is required.";
  }

  if (
    !payload.durationMinutes ||
    payload.durationMinutes < 15 ||
    payload.durationMinutes > 240 ||
    payload.durationMinutes % 15 !== 0
  ) {
    return "Duration must be a 15-minute interval.";
  }

  if (!payload.customerName?.trim()) {
    return "Customer name is required.";
  }

  return null;
}
