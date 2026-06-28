import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EmployeesDashboard } from "@/components/admin/employees/EmployeesDashboard";
import { getCurrentUser, isAdminUser } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Employees",
};

export default async function AdminEmployeesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const allowed = await isAdminUser(user.id);
  if (!allowed) redirect("/admin/login");

  return <EmployeesDashboard />;
}
