import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CompleteAppointmentForm } from "@/components/admin/CompleteAppointmentForm";
import { getCurrentUser, isAdminUser } from "@/lib/admin/auth";
import { formatDateTime, formatMoney } from "@/lib/admin/format";
import { formatBookingTotalLabel, isPricingTbdService } from "@/lib/booking/pricing";
import { getServiceById } from "@/lib/config/salonData";
import { getTechnicianByIdFromDb } from "@/lib/booking/technicians";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Complete Appointment",
};

interface PageProps {
  params: { id: string };
}

export default async function CompleteAppointmentPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!(await isAdminUser(user.id))) redirect("/admin/login");

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("appointments")
    .select(
      `
      id, technician_id, customer_name, customer_phone, starts_at, status, estimated_total,
      appointment_services ( id, service_id, price_at_booking )
    `
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error || !row) notFound();
  if (row.status !== "booked") redirect(`/admin/appointments/${params.id}`);

  const bookedServices =
    row.appointment_services?.map(
      (svc: { id: string; service_id: string; price_at_booking: number }) => ({
        id: svc.id,
        serviceId: svc.service_id,
        name: getServiceById(svc.service_id)?.name ?? svc.service_id,
        priceAtBooking: Number(svc.price_at_booking),
      })
    ) ?? [];

  const estimatedTotal =
    row.estimated_total != null
      ? Number(row.estimated_total)
      : bookedServices.reduce((sum, s) => sum + s.priceAtBooking, 0);

  const hasTbdPricing = bookedServices.some((svc) => isPricingTbdService(svc.serviceId));

  const technicianName =
    (await getTechnicianByIdFromDb(row.technician_id ?? ""))?.name ?? "Unassigned";

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
          Complete Appointment
        </p>
        <h1 className="mt-2 text-4xl font-semibold text-ink">{row.customer_name}</h1>
        <p className="mt-2 text-ink-muted">
          {formatDateTime(row.starts_at)} · {technicianName} · Estimate{" "}
          {formatBookingTotalLabel(estimatedTotal, hasTbdPricing)}
        </p>
      </div>

      <div className="mt-8">
        <CompleteAppointmentForm
          appointmentId={row.id}
          bookedServices={bookedServices}
          estimatedTotal={estimatedTotal}
        />
      </div>
    </div>
  );
}
