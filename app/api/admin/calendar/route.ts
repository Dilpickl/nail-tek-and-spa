import { NextResponse } from "next/server";

import { ANY_EMPLOYEE_LABEL } from "@/lib/admin/constants";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceById } from "@/lib/config/salonData";
import { toIsoDate } from "@/lib/booking/time-utils";
import { createAdminClient } from "@/lib/supabase/admin";

interface AppointmentRow {
  id: string;
  technician_id: string | null;
  any_technician: boolean;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  source: string;
  notes: string | null;
  party_group_id: string | null;
  is_guest: boolean;
  appointment_services?: { service_id: string }[];
}

interface TechnicianRow {
  id: string;
  name: string;
  role: string | null;
  is_active: boolean;
}

function isValidIsoDate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function toStartOfDayIso(value: string): string {
  return `${value}T00:00:00.000Z`;
}

function toEndOfDayIso(value: string): string {
  return `${value}T23:59:59.999Z`;
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!isValidIsoDate(start) || !isValidIsoDate(end)) {
    return NextResponse.json(
      { error: "Valid start and end dates are required." },
      { status: 400 }
    );
  }

  if (start > end) {
    return NextResponse.json(
      { error: "Start date must be before end date." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const [appointmentsResult, techniciansResult] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, technician_id, any_technician, customer_name, customer_phone, customer_email, starts_at, ends_at, status, source, notes, party_group_id, is_guest, appointment_services(service_id)"
      )
      .gte("starts_at", toStartOfDayIso(start))
      .lte("starts_at", toEndOfDayIso(end))
      .order("starts_at", { ascending: true }),
    supabase
      .from("technicians")
      .select("id, name, role, is_active")
      .order("display_order", { ascending: true }),
  ]);

  if (appointmentsResult.error) {
    return NextResponse.json(
      { error: appointmentsResult.error.message },
      { status: 500 }
    );
  }

  if (techniciansResult.error) {
    return NextResponse.json(
      { error: techniciansResult.error.message },
      { status: 500 }
    );
  }

  const technicians = ((techniciansResult.data as TechnicianRow[] | null) ?? []).map(
    (tech) => ({
      id: tech.id,
      name: tech.name,
      role: tech.role,
      isActive: tech.is_active,
    })
  );

  const technicianNameById = new Map(technicians.map((tech) => [tech.id, tech.name]));

  const appointments = ((appointmentsResult.data as AppointmentRow[] | null) ?? []).map(
    (row) => ({
      id: row.id,
      technicianId: row.technician_id,
      technicianName:
        row.any_technician || !row.technician_id
          ? ANY_EMPLOYEE_LABEL
          : technicianNameById.get(row.technician_id) ?? "Unassigned",
      anyTechnician: row.any_technician ?? false,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      customerEmail: row.customer_email,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      status: row.status,
      source: row.source,
      notes: row.notes,
      partyGroupId: row.party_group_id,
      isGuest: row.is_guest ?? false,
      services:
        row.appointment_services?.map(
          (item) => getServiceById(item.service_id)?.name ?? item.service_id
        ) ?? [],
    })
  );

  return NextResponse.json({
    range: { start, end, fetchedAt: toIsoDate(new Date()) },
    technicians,
    appointments,
  });
}
