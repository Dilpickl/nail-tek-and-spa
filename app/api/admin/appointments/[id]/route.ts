import { NextResponse } from "next/server";

import { ANY_EMPLOYEE_ID, ANY_EMPLOYEE_LABEL } from "@/lib/admin/constants";
import { requireAdmin } from "@/lib/admin/require-admin";
import {
  getTechnicianById,
  validateAndBuildUpdate,
  type UpdateAppointmentPayload,
} from "@/lib/admin/update-appointment";
import { getServiceById, getTechnicianById as getTechById } from "@/lib/config/salonData";
import { createAdminClient } from "@/lib/supabase/admin";

interface AppointmentServiceRow {
  id: string;
  service_id: string;
  price_at_booking: number;
  duration_at_booking: number;
}

interface TransactionRow {
  id: string;
  completed_at: string;
  payment_method: string;
  subtotal_services: number;
  subtotal_retail: number;
  discount_amount: number;
  tax_amount: number;
  tip_amount: number;
  refund_amount: number;
  final_total: number;
  notes: string | null;
  transaction_line_items?: {
    id: string;
    line_type: string;
    service_id: string | null;
    product_id: string | null;
    name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[];
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  let payload: UpdateAppointmentPayload;
  try {
    payload = (await request.json()) as UpdateAppointmentPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const built = await validateAndBuildUpdate(params.id, payload);
  if ("error" in built) {
    return NextResponse.json({ error: built.error }, { status: built.status });
  }

  const supabase = createAdminClient();

  const { error: updateError } = await supabase
    .from("appointments")
    .update(built.updates)
    .eq("id", params.id)
    .eq("status", "booked");

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (built.serviceRows) {
    await supabase.from("appointment_services").delete().eq("appointment_id", params.id);
    const { error: servicesError } = await supabase.from("appointment_services").insert(
      built.serviceRows.map((row) => ({
        appointment_id: params.id,
        ...row,
      }))
    );
    if (servicesError) {
      return NextResponse.json({ error: servicesError.message }, { status: 500 });
    }
  }

  const technician = built.anyTechnician
    ? null
    : getTechnicianById(built.technicianId ?? "");

  return NextResponse.json({
    ok: true,
    startsAt: built.startsAt.toISOString(),
    endsAt: built.endsAt.toISOString(),
    technicianName: built.anyTechnician
      ? "Any Employee"
      : technician?.name ?? "Unassigned",
    anyTechnician: built.anyTechnician,
  });
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("appointments")
    .select(
      `
      id, technician_id, any_technician, customer_name, customer_phone, customer_email,
      starts_at, ends_at, status, source, notes, estimated_total, client_id,
      appointment_services ( id, service_id, price_at_booking, duration_at_booking )
    `
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!row) {
    return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  }

  const bookedServices = ((row.appointment_services ?? []) as AppointmentServiceRow[]).map(
    (svc) => ({
      id: svc.id,
      serviceId: svc.service_id,
      name: getServiceById(svc.service_id)?.name ?? svc.service_id,
      priceAtBooking: Number(svc.price_at_booking),
      durationAtBooking: svc.duration_at_booking,
    })
  );

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
        id, completed_at, payment_method,
        subtotal_services, subtotal_retail, discount_amount, tax_amount, tip_amount, refund_amount, final_total, notes,
        transaction_line_items ( id, line_type, service_id, product_id, name, quantity, unit_price, line_total )
      `
      )
      .eq("appointment_id", params.id)
      .maybeSingle();

    if (txRow) {
      const tx = txRow as TransactionRow;
      transaction = {
        id: tx.id,
        completedAt: tx.completed_at,
        paymentMethod: tx.payment_method,
        subtotalServices: Number(tx.subtotal_services),
        subtotalRetail: Number(tx.subtotal_retail),
        discountAmount: Number(tx.discount_amount),
        taxAmount: Number(tx.tax_amount),
        tipAmount: Number(tx.tip_amount),
        refundAmount: Number(tx.refund_amount),
        finalTotal: Number(tx.final_total),
        notes: tx.notes,
        lineItems: (tx.transaction_line_items ?? []).map((item) => ({
          id: item.id,
          lineType: item.line_type,
          serviceId: item.service_id,
          productId: item.product_id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          lineTotal: Number(item.line_total),
        })),
      };
    }
  }

  return NextResponse.json({
    appointment: {
      id: row.id,
      technicianId: row.any_technician ? ANY_EMPLOYEE_ID : row.technician_id,
      technicianName: row.any_technician
        ? ANY_EMPLOYEE_LABEL
        : getTechById(row.technician_id ?? "")?.name ?? "Unassigned",
      anyTechnician: row.any_technician ?? false,
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
    },
  });
}
