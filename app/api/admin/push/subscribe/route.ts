import { NextResponse } from "next/server";

import { getCurrentUser, isAdminUser } from "@/lib/admin/auth";
import { savePushSubscription } from "@/lib/admin/push";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json(
      { error: "A valid push subscription is required." },
      { status: 400 }
    );
  }

  try {
    await savePushSubscription({
      userId: user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent: request.headers.get("user-agent"),
    });
  } catch (error) {
    console.error("Failed to save push subscription", error);
    return NextResponse.json(
      { error: "Unable to save notification subscription." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
