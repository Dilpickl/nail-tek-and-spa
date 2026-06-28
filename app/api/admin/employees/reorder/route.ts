import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

interface ReorderRequest {
  orderedIds?: string[];
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const payload = (await request.json()) as ReorderRequest;
  if (!payload.orderedIds?.length) {
    return NextResponse.json({ error: "Ordered employee ids are required." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const updates = payload.orderedIds.map((id, index) =>
    supabase.from("technicians").update({ display_order: index + 1 }).eq("id", id)
  );

  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
