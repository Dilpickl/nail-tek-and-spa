import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { getCurrentUser, isAdminUser } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: "Admin Login",
};

export default async function AdminLoginPage() {
  const user = await getCurrentUser();

  if (user && (await isAdminUser(user.id))) {
    redirect("/admin");
  }

  return (
    <section className="section-padding">
      <div className="container">
        <AdminLoginForm />
      </div>
    </section>
  );
}
