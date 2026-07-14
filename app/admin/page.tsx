import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminDashboard, type AdminAppointment } from "@/components/admin/AdminDashboard";
import { getCurrentUser, isAdminUser } from "@/lib/admin/auth";
import { getServiceById } from "@/lib/config/salonData";
import { getActiveTechnicians, getScheduleOverridesForDate } from "@/lib/booking/technicians";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidIsoDate, toIsoDate, toLocalDateTime } from "@/lib/booking/time-utils";

export const dynamic = "force-dynamic";

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
  party_group_id: string | null;
  is_guest: boolean;
  appointment_services?: { service_id: string }[];
}

interface TimeOffRow {
  technician_id: string;
}

interface AdminPageProps {
  searchParams?: { date?: string; highlight?: string };
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
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
  const requestedDate = searchParams?.date;
  const agendaDate =
    requestedDate && isValidIsoDate(requestedDate) ? requestedDate : today;
  const start = toLocalDateTime(agendaDate, "00:00");
  const end = toLocalDateTime(agendaDate, "23:59");
  end.setSeconds(59, 999);
  const supabase = createAdminClient();

  const [{ data: appointmentRows, error: appointmentsError }, { data: timeOffRows, error: timeOffError }, technicians, scheduleOverrides] =
    await Promise.all([
      supabase
        .from("appointments")
        .select(
          "id, technician_id, any_technician, customer_name, customer_phone, starts_at, ends_at, status, source, notes, party_group_id, is_guest, appointment_services(service_id)"
        )
        .gte("starts_at", start.toISOString())
        .lte("starts_at", end.toISOString())
        .neq("status", "cancelled")
        .order("starts_at", { ascending: true }),
      supabase
        .from("technician_time_off")
        .select("technician_id")
        .eq("off_date", agendaDate)
        .eq("full_day", true),
      getActiveTechnicians(),
      getScheduleOverridesForDate(agendaDate),
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

  const rows = (appointmentRows as AppointmentRow[]) ?? [];
  const partySizes = new Map<string, number>();
  rows.forEach((row) => {
    if (!row.party_group_id) return;
    partySizes.set(row.party_group_id, (partySizes.get(row.party_group_id) ?? 0) + 1);
  });

  const appointments: AdminAppointment[] = rows.map((row) => ({
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
    partyGroupId: row.party_group_id,
    isGuest: row.is_guest ?? false,
    partySize: row.party_group_id ? (partySizes.get(row.party_group_id) ?? 1) : 1,
    services:
      row.appointment_services?.map((item) => getServiceById(item.service_id)?.name ?? item.service_id) ??
      [],
  }));

  const offTechnicianIds = [
    ...((timeOffRows as TimeOffRow[]) ?? []).map((row) => row.technician_id),
    ...scheduleOverrides
      .filter((override) => !override.is_working)
      .map((override) => override.technician_id),
  ].filter((id, index, array) => array.indexOf(id) === index);

  return (
    <AdminDashboard
      today={today}
      agendaDate={agendaDate}
      appointments={appointments}
      offTechnicianIds={offTechnicianIds}
      highlightId={searchParams?.highlight ?? null}
      technicians={technicians.map((technician) => ({
        id: technician.id,
        name: technician.name,
        role: technician.role,
      }))}
    />
  );
}
