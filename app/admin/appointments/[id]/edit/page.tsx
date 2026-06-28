import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { EditAppointmentForm } from "@/components/admin/EditAppointmentForm";
import { ANY_EMPLOYEE_ID } from "@/lib/admin/constants";
import { getCurrentUser, isAdminUser } from "@/lib/admin/auth";
import { getActiveTechnicians } from "@/lib/booking/technicians";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Edit Appointment",
};

interface PageProps {
  params: { id: string };
}

export default async function EditAppointmentPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!(await isAdminUser(user.id))) redirect("/admin/login");

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("appointments")
    .select(
      `
      id, technician_id, any_technician, customer_name, customer_phone, customer_email,
      starts_at, status, notes,
      appointment_services ( service_id )
    `
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error || !row) notFound();
  if (row.status !== "booked") redirect(`/admin/appointments/${params.id}`);

  const technicians = await getActiveTechnicians();
  const defaultTechnicianId =
    row.any_technician ? ANY_EMPLOYEE_ID : (row.technician_id ?? technicians[0]?.id ?? "");

  const serviceIds =
    row.appointment_services?.map((s: { service_id: string }) => s.service_id) ?? [];

  return (
    <div className="container py-8 md:py-10">
      <Link
        href={`/admin/appointments/${params.id}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Back to Appointment
      </Link>

      <div className="mt-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
          Edit Appointment
        </p>
        <h1 className="mt-2 text-4xl font-semibold text-ink">{row.customer_name}</h1>
        <p className="mt-2 text-ink-muted">Move, reschedule, or update client details.</p>
      </div>

      <div className="mt-8 max-w-3xl">
        <EditAppointmentForm
          appointmentId={row.id}
          technicianId={defaultTechnicianId}
          customerName={row.customer_name}
          customerPhone={row.customer_phone}
          customerEmail={row.customer_email}
          startsAt={row.starts_at}
          serviceIds={serviceIds}
          notes={row.notes}
          technicians={technicians.map((technician) => ({
            id: technician.id,
            name: technician.name,
            role: technician.role,
          }))}
        />
      </div>
    </div>
  );
}
