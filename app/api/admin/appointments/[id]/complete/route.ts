import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";
import type { CompleteAppointmentInput } from "@/lib/completion/types";
import {
  buildCompletionTotals,
  validateCompletionPayload,
} from "@/lib/completion/validate";
import { resolveClient } from "@/lib/clients/resolve-client";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const { user } = auth;

  let payload: CompleteAppointmentInput;
  try {
    payload = (await request.json()) as CompleteAppointmentInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validationError = validateCompletionPayload(payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: appointment, error: fetchError } = await supabase
    .from("appointments")
    .select("id, status, any_technician, technician_id, customer_name, customer_phone, customer_email")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  }

  if (appointment.status !== "booked") {
    return NextResponse.json(
      { error: "Only booked appointments can be completed." },
      { status: 409 }
    );
  }

  if (appointment.any_technician || !appointment.technician_id) {
    return NextResponse.json(
      {
        error:
          "Assign a technician before completing this appointment. Move it out of the Any column first.",
      },
      { status: 400 }
    );
  }

  const { data: existingTx } = await supabase
    .from("completed_transactions")
    .select("id")
    .eq("appointment_id", params.id)
    .maybeSingle();

  if (existingTx) {
    return NextResponse.json(
      { error: "This appointment already has a completed transaction." },
      { status: 409 }
    );
  }

  try {
    const clientId = await resolveClient(supabase, {
      name: appointment.customer_name,
      phone: appointment.customer_phone,
      email: appointment.customer_email,
    });

    const { totals, lineRows } = buildCompletionTotals(payload);

    const { data: transaction, error: txError } = await supabase
      .from("completed_transactions")
      .insert({
        appointment_id: params.id,
        completed_by: user!.id,
        payment_method: payload.paymentMethod,
        subtotal_services: totals.subtotalServices,
        subtotal_retail: totals.subtotalRetail,
        discount_amount: totals.discountAmount,
        tax_amount: totals.taxAmount,
        tip_amount: totals.tipAmount,
        final_total: totals.finalTotal,
        notes: payload.notes?.trim() || null,
      })
      .select("id, final_total, completed_at")
      .single();

    if (txError || !transaction) {
      throw txError ?? new Error("Transaction insert failed.");
    }

    const lineItemRows = lineRows.map((row) => ({
      ...row,
      transaction_id: transaction.id,
    }));

    const { error: lineError } = await supabase
      .from("transaction_line_items")
      .insert(lineItemRows);

    if (lineError) {
      await supabase.from("completed_transactions").delete().eq("id", transaction.id);
      throw lineError;
    }

    const { error: statusError } = await supabase
      .from("appointments")
      .update({ status: "completed", client_id: clientId })
      .eq("id", params.id)
      .eq("status", "booked");

    if (statusError) {
      throw statusError;
    }

    return NextResponse.json({
      ok: true,
      transactionId: transaction.id,
      finalTotal: Number(transaction.final_total),
      completedAt: transaction.completed_at,
    });
  } catch (error) {
    console.error("Appointment completion failed", error);
    return NextResponse.json(
      { error: "Unable to complete appointment right now." },
      { status: 500 }
    );
  }
}
