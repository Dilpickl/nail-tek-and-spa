import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SettingsDashboard } from "@/components/admin/SettingsDashboard";
import { getCurrentUser, isAdminUser } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const allowed = await isAdminUser(user.id);
  if (!allowed) redirect("/admin/login");

  return <SettingsDashboard />;
}
