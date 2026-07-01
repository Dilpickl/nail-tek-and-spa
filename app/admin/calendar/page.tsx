import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminCalendar } from "@/components/admin/AdminCalendar";
import { getCurrentUser, isAdminUser } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Calendar",
};

export default async function AdminCalendarPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }

  const allowed = await isAdminUser(user.id);
  if (!allowed) {
    redirect("/admin");
  }

  return <AdminCalendar />;
}
