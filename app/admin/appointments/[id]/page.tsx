import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";

import {
  AppointmentDetailView,
  type AppointmentDetailData,
} from "@/components/admin/AppointmentDetailView";
import { getCurrentUser, isAdminUser } from "@/lib/admin/auth";
import { getServiceById, getTechnicianById } from "@/lib/config/salonData";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Appointment Details",
};

interface PageProps {
  params: { id: string };
}

export default async function AppointmentDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!(await isAdminUser(user.id))) redirect("/admin/login");

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("appointments")
    .select(
      `
      id, technician_id, customer_name, customer_phone, customer_email,
      starts_at, ends_at, status, source, notes, estimated_total,
      appointment_services ( id, service_id, price_at_booking, duration_at_booking )
    `
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error || !row) notFound();

  const bookedServices =
    row.appointment_services?.map(
      (svc: {
        id: string;
        service_id: string;
        price_at_booking: number;
        duration_at_booking: number;
      }) => ({
        id: svc.id,
        serviceId: svc.service_id,
        name: getServiceById(svc.service_id)?.name ?? svc.service_id,
        priceAtBooking: Number(svc.price_at_booking),
        durationAtBooking: svc.duration_at_booking,
      })
    ) ?? [];

  const estimatedTotal =
    row.estimated_total != null
      ? Number(row.estimated_total)
      : bookedServices.reduce((sum, s) => sum + s.priceAtBooking, 0);

  let transaction = null;
  if (row.status === "completed") {
    const { data: txRow } = await supabase
      .from("completed_transactions")
      .select(
        `
        completed_at, payment_method, final_total, discount_amount, tax_amount, tip_amount,
        transaction_line_items ( name, line_type, quantity, unit_price, line_total )
      `
      )
      .eq("appointment_id", params.id)
      .maybeSingle();

    if (txRow) {
      transaction = {
        completedAt: txRow.completed_at,
        paymentMethod: txRow.payment_method,
        finalTotal: Number(txRow.final_total),
        discountAmount: Number(txRow.discount_amount),
        taxAmount: Number(txRow.tax_amount),
        tipAmount: Number(txRow.tip_amount),
        lineItems:
          txRow.transaction_line_items?.map(
            (item: {
              name: string;
              line_type: string;
              quantity: number;
              unit_price: number;
              line_total: number;
            }) => ({
              name: item.name,
              lineType: item.line_type,
              quantity: item.quantity,
              unitPrice: Number(item.unit_price),
              lineTotal: Number(item.line_total),
            })
          ) ?? [],
      };
    }
  }

  const appointment: AppointmentDetailData = {
    id: row.id,
    technicianName: getTechnicianById(row.technician_id ?? "")?.name ?? "Unassigned",
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    source: row.source,
    notes: row.notes,
    estimatedTotal,
    bookedServices,
    transaction,
  };

  return <AppointmentDetailView appointment={appointment} />;
}
