import { NextResponse } from "next/server";

import { getCurrentUser, isAdminUser } from "@/lib/admin/auth";
import { deletePushSubscription } from "@/lib/admin/push";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as { endpoint?: string };
  if (!body.endpoint) {
    return NextResponse.json({ error: "Endpoint is required." }, { status: 400 });
  }

  try {
    await deletePushSubscription(body.endpoint, user.id);
  } catch (error) {
    console.error("Failed to delete push subscription", error);
    return NextResponse.json(
      { error: "Unable to remove notification subscription." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
