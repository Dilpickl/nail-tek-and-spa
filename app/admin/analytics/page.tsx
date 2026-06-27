import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AnalyticsDashboard } from "@/components/admin/analytics/AnalyticsDashboard";
import { getCurrentUser, isAdminUser } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: "Business Analytics",
};

export default async function AdminAnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const allowed = await isAdminUser(user.id);
  if (!allowed) redirect("/admin/login");

  return <AnalyticsDashboard />;
}
