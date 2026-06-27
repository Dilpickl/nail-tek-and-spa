import { NextResponse } from "next/server";

import { fetchAnalytics } from "@/lib/analytics/queries";
import { resolveDateRange } from "@/lib/analytics/date-ranges";
import { requireAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const preset = searchParams.get("preset") ?? "this_month";
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const range = resolveDateRange(preset, from, to);
  if (!range) {
    return NextResponse.json({ error: "Invalid date range." }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const data = await fetchAnalytics(supabase, range);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Analytics fetch failed", error);
    return NextResponse.json(
      { error: "Unable to load analytics right now." },
      { status: 500 }
    );
  }
}
