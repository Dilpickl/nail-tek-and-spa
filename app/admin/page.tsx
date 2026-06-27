import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminDashboard, type AdminAppointment } from "@/components/admin/AdminDashboard";
import { getCurrentUser, isAdminUser } from "@/lib/admin/auth";
import { getServiceById } from "@/lib/config/salonData";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

interface AppointmentRow {
  id: string;
  technician_id: string | null;
  any_technician: boolean;
  customer_name: string;
  customer_phone: string;
  starts_at: string;
  ends_at: string;
  status: "booked" | "completed" | "cancelled" | "no_show";
  source: "online" | "walk_in" | "phone";
  notes: string | null;
  appointment_services?: { service_id: string }[];
}

interface TimeOffRow {
  technician_id: string;
}

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin/login");
  }

  const allowed = await isAdminUser(user.id);
  if (!allowed) {
    return (
      <section className="section-padding">
        <div className="container max-w-2xl text-center">
          <h1 className="text-4xl font-semibold text-ink">Admin Access Needed</h1>
          <p className="mt-4 text-ink-muted">
            You are signed in, but this account is not listed as an admin user.
            Add this user to the `admin_users` table in Supabase to enable access.
          </p>
        </div>
      </section>
    );
  }

  const today = toIsoDate(new Date());
  const start = new Date(`${today}T00:00:00`);
  const end = new Date(`${today}T23:59:59`);
  const supabase = createAdminClient();

  const [{ data: appointmentRows, error: appointmentsError }, { data: timeOffRows, error: timeOffError }] =
    await Promise.all([
      supabase
        .from("appointments")
        .select(
          "id, technician_id, any_technician, customer_name, customer_phone, starts_at, ends_at, status, source, notes, appointment_services(service_id)"
        )
        .gte("starts_at", start.toISOString())
        .lte("starts_at", end.toISOString())
        .neq("status", "cancelled")
        .order("starts_at", { ascending: true }),
      supabase
        .from("technician_time_off")
        .select("technician_id")
        .eq("off_date", today)
        .eq("full_day", true),
    ]);

  if (appointmentsError || timeOffError) {
    return (
      <section className="section-padding">
        <div className="container max-w-2xl text-center">
          <h1 className="text-4xl font-semibold text-ink">Admin Setup Needed</h1>
          <p className="mt-4 text-ink-muted">
            The admin dashboard could not load Supabase data. Make sure
            `supabase/schema.sql` and `supabase/seed.sql` have been run in your
            Supabase project.
          </p>
        </div>
      </section>
    );
  }

  const appointments: AdminAppointment[] = ((appointmentRows as AppointmentRow[]) ?? []).map(
    (row) => ({
      id: row.id,
      technicianId: row.technician_id,
      anyTechnician: row.any_technician ?? false,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      status: row.status,
      source: row.source,
      notes: row.notes,
      services:
        row.appointment_services?.map((item) => getServiceById(item.service_id)?.name ?? item.service_id) ??
        [],
    })
  );

  const offTechnicianIds = ((timeOffRows as TimeOffRow[]) ?? []).map(
    (row) => row.technician_id
  );

  return (
    <AdminDashboard
      today={today}
      appointments={appointments}
      offTechnicianIds={offTechnicianIds}
    />
  );
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
