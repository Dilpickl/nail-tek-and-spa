import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";

import {
  AppointmentDetailView,
  type AppointmentDetailData,
} from "@/components/admin/AppointmentDetailView";
import { getCurrentUser, isAdminUser } from "@/lib/admin/auth";
import { getServiceById } from "@/lib/config/salonData";
import { getAllTechnicians } from "@/lib/booking/technicians";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Appointment Details",
};

interface PageProps {
  params: { id: string };
}

interface AppointmentRow {
  id: string;
  technician_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  starts_at: string;
  ends_at: string;
  status: AppointmentDetailData["status"];
  source: string;
  notes: string | null;
  estimated_total: number | null;
  party_group_id: string | null;
  is_guest: boolean;
  appointment_services?: {
    id: string;
    service_id: string;
    price_at_booking: number;
    duration_at_booking: number;
  }[];
}

function mapBookedServices(
  services:
    | {
        id: string;
        service_id: string;
        price_at_booking: number;
        duration_at_booking: number;
      }[]
    | null
    | undefined
) {
  return (
    services?.map((svc) => ({
      id: svc.id,
      serviceId: svc.service_id,
      name: getServiceById(svc.service_id)?.name ?? svc.service_id,
      priceAtBooking: Number(svc.price_at_booking),
      durationAtBooking: svc.duration_at_booking,
    })) ?? []
  );
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
      party_group_id, is_guest,
      appointment_services ( id, service_id, price_at_booking, duration_at_booking )
    `
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error || !row) notFound();

  const allTechnicians = await getAllTechnicians();
  const technicianNameById = new Map(allTechnicians.map((tech) => [tech.id, tech.name]));
  const technicianLabel = (technicianId: string | null) =>
    technicianId ? technicianNameById.get(technicianId) ?? "Unassigned" : "Unassigned";

  const appointmentRow = row as AppointmentRow;
  const bookedServices = mapBookedServices(appointmentRow.appointment_services);
  const estimatedTotal =
    appointmentRow.estimated_total != null
      ? Number(appointmentRow.estimated_total)
      : bookedServices.reduce((sum, service) => sum + service.priceAtBooking, 0);

  let transaction = null;
  if (appointmentRow.status === "completed") {
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

  let partyMembers: AppointmentDetailData["partyMembers"] = [];
  if (appointmentRow.party_group_id) {
    const { data: partyRows } = await supabase
      .from("appointments")
      .select(
        `
        id, technician_id, customer_name, starts_at, ends_at, status,
        appointment_services ( service_id )
      `
      )
      .eq("party_group_id", appointmentRow.party_group_id)
      .order("is_guest", { ascending: true })
      .order("starts_at", { ascending: true });

    partyMembers =
      (partyRows as AppointmentRow[] | null)?.map((member) => ({
        id: member.id,
        customerName: member.customer_name,
        technicianName: technicianLabel(member.technician_id),
        startsAt: member.starts_at,
        endsAt: member.ends_at,
        status: member.status,
        services:
          member.appointment_services?.map(
            (service) => getServiceById(service.service_id)?.name ?? service.service_id
          ) ?? [],
        isCurrent: member.id === appointmentRow.id,
      })) ?? [];
  }

  const appointment: AppointmentDetailData = {
    id: appointmentRow.id,
    technicianName: technicianLabel(appointmentRow.technician_id),
    customerName: appointmentRow.customer_name,
    customerPhone: appointmentRow.customer_phone,
    customerEmail: appointmentRow.customer_email,
    startsAt: appointmentRow.starts_at,
    endsAt: appointmentRow.ends_at,
    status: appointmentRow.status,
    source: appointmentRow.source,
    notes: appointmentRow.notes,
    estimatedTotal,
    bookedServices,
    transaction,
    partyGroupId: appointmentRow.party_group_id,
    isGuest: appointmentRow.is_guest ?? false,
    partyMembers,
  };

  return <AppointmentDetailView appointment={appointment} />;
}
