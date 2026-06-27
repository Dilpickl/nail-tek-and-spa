import { NextResponse } from "next/server";

import { getCurrentUser, isAdminUser } from "@/lib/admin/auth";

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  const allowed = await isAdminUser(user.id);
  if (!allowed) {
    return { error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }

  return { user };
}
