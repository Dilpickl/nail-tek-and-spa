import type { SupabaseClient } from "@supabase/supabase-js";

import type { DateRange } from "@/lib/analytics/date-ranges";
import { eachDayInRange, toIsoDateString } from "@/lib/analytics/date-ranges";
import type {
  AnalyticsAlert,
  AnalyticsResponse,
  CategoryAmount,
  DayCount,
  HourCount,
  PaymentMethodAmount,
  ServiceCount,
  StaffPerformanceRow,
  TrendPoint,
  UpcomingAppointment,
} from "@/lib/analytics/types";
import { getAppointmentPhase, isDonePhase } from "@/lib/admin/appointment-phase";
import { getSalonDateParts } from "@/lib/booking/time-utils";
import {
  allServices,
  getServiceById,
  hours as businessHours,
} from "@/lib/config/salonData";
import { roundMoney } from "@/lib/completion/calculate-totals";
import { normalizePhone } from "@/lib/clients/resolve-client";

interface AppointmentRow {
  id: string;
  technician_id: string | null;
  customer_name: string;
  customer_phone: string;
  client_id: string | null;
  starts_at: string;
  ends_at: string;
  status: "booked" | "completed" | "cancelled" | "no_show";
  created_at: string;
  appointment_services?: { service_id: string; price_at_booking?: number | string | null }[];
  completed_transactions?: { id: string } | { id: string }[] | null;
}

function hasCheckout(appt: AppointmentRow): boolean {
  const tx = appt.completed_transactions;
  if (!tx) return false;
  return Array.isArray(tx) ? tx.length > 0 : Boolean(tx.id);
}

interface VisitRow {
  id: string;
  customer_phone: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentRow["status"];
}

/**
 * One served visit that contributes revenue: either a recorded checkout
 * (actual amount) or a past booked appointment with no checkout (estimated
 * from booked service prices).
 */
interface RevenueEntry {
  appointmentId: string;
  technicianId: string | null;
  customerPhone: string;
  clientId: string | null;
  /** When the revenue is attributed (checkout time, or appointment start). */
  revenueAt: string;
  /** Appointment start, used for rebooking comparisons. */
  visitAt: string;
  amount: number;
  estimated: boolean;
  services: { service_id: string; price: number }[];
}

interface TransactionRow {
  id: string;
  appointment_id: string;
  completed_at: string;
  payment_method: string;
  subtotal_services: number;
  subtotal_retail: number;
  discount_amount: number;
  tax_amount: number;
  tip_amount: number;
  refund_amount: number;
  final_total: number;
  appointments: {
    technician_id: string | null;
    customer_phone: string;
    client_id: string | null;
    starts_at: string;
  };
  transaction_line_items?: {
    line_type: string;
    service_id: string | null;
    name: string;
    line_total: number;
  }[];
}

interface ClientRow {
  id: string;
  phone: string;
  first_visit_at: string | null;
}

interface TechnicianRow {
  id: string;
  name: string;
  is_active: boolean;
  display_order: number;
}

const REBOOKING_LOOKBACK_MS = 31 * 24 * 60 * 60 * 1000;

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Credit Card",
  apple_pay: "Apple Pay",
  other: "Other",
};

export async function fetchAnalytics(
  supabase: SupabaseClient,
  range: DateRange
): Promise<AnalyticsResponse> {
  const fromIso = range.from.toISOString();
  const toIso = range.to.toISOString();

  const [
    { data: appointmentsInRange },
    { data: transactionsInRange },
    { data: allVisitRows },
    { data: clients },
    { data: upcomingRows },
    { data: technicianRows },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, technician_id, customer_name, customer_phone, client_id, starts_at, ends_at, status, created_at, appointment_services(service_id, price_at_booking), completed_transactions(id)"
      )
      .gte("starts_at", fromIso)
      .lte("starts_at", toIso),
    supabase
      .from("completed_transactions")
      .select(
        `
        id, appointment_id, completed_at, payment_method,
        subtotal_services, subtotal_retail, discount_amount, tax_amount, tip_amount, refund_amount, final_total,
        appointments ( technician_id, customer_phone, client_id, starts_at ),
        transaction_line_items ( line_type, service_id, name, line_total )
      `
      )
      .gte("completed_at", fromIso)
      .lte("completed_at", toIso),
    supabase
      .from("appointments")
      .select("id, customer_phone, starts_at, ends_at, status")
      .in("status", ["booked", "completed"])
      // Only visits after the period start matter for "came back"; pad a bit
      // for checkouts whose appointment began just before the range.
      .gte("starts_at", new Date(range.from.getTime() - REBOOKING_LOOKBACK_MS).toISOString()),
    supabase.from("clients").select("id, phone, first_visit_at"),
    supabase
      .from("appointments")
      .select(
        "id, customer_name, starts_at, technician_id, appointment_services(service_id)"
      )
      .eq("status", "booked")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(12),
    supabase
      .from("technicians")
      .select("id, name, is_active, display_order")
      .order("display_order", { ascending: true }),
  ]);

  const technicians = (technicianRows ?? []) as TechnicianRow[];
  const technicianNameById = new Map(technicians.map((tech) => [tech.id, tech.name]));

  const appointments = (appointmentsInRange ?? []) as AppointmentRow[];
  const transactions = (transactionsInRange ?? []) as unknown as TransactionRow[];
  const appointmentIdsWithCheckout = new Set(
    appointments.filter((a) => hasCheckout(a)).map((a) => a.id)
  );
  const visits = (allVisitRows ?? []) as VisitRow[];
  const clientRows = (clients ?? []) as ClientRow[];
  const now = Date.now();

  const statusCounts = countStatuses(appointments, now);
  const revenueEntries = buildRevenueEntries(
    appointments,
    transactions,
    appointmentIdsWithCheckout,
    now
  );
  const laterVisits = buildLaterVisitIndex(visits, now);
  const completedCount = revenueEntries.length;
  const grossRevenue = sum(revenueEntries.map((e) => e.amount));
  const averageTicket = completedCount > 0 ? roundMoney(grossRevenue / completedCount) : 0;
  const estimatedEntries = revenueEntries.filter((e) => e.estimated);

  const clientInsights = computeClientInsights(revenueEntries, clientRows, range);
  const revenueBreakdown = computeRevenueBreakdown(transactions, estimatedEntries);
  const revenueTrend = computeRevenueTrend(revenueEntries, range);
  const appointmentsByHour = computeAppointmentsByHour(appointments);
  const busyDays = computeBusyDays(appointments);
  const monthlyTrends = computeMonthlyTrends(appointments, range);
  const averageLeadTimeDays = computeAverageLeadTime(appointments);
  const staffPerformance = computeStaffPerformance(
    revenueEntries,
    laterVisits,
    appointments,
    technicians
  );
  const { most, least } = computeServicePopularity(appointments);
  const financialSummary = computeFinancialSummary(transactions);
  const paymentMethods = computePaymentMethods(transactions);
  const rebookingRate = computeRebookingRate(revenueEntries, laterVisits);
  const rebookingTrend = computeRebookingTrend(revenueEntries, laterVisits, range);
  const scheduleUtilization = computeScheduleUtilization(appointments, range, technicians);
  const upcoming = mapUpcoming((upcomingRows ?? []) as AppointmentRow[], technicianNameById);
  const alerts = buildAlerts(transactions);

  const totalAppointments = appointments.length;

  return {
    range: {
      from: toIsoDateString(range.from),
      to: toIsoDateString(range.to),
      label: range.label,
    },
    kpis: {
      totalAppointments,
      completedAppointments: completedCount,
      grossRevenue,
      averageTicket,
      newClients: clientInsights.newClients,
      returningClients: clientInsights.returningClients,
      cancellations: statusCounts.cancelled,
      noShows: statusCounts.no_show,
    },
    revenueBreakdown,
    revenueTrend,
    revenueEstimate: {
      included: estimatedEntries.length > 0,
      estimatedCount: estimatedEntries.length,
      estimatedAmount: sum(estimatedEntries.map((e) => e.amount)),
    },
    hasTransactions: transactions.length > 0,
    appointmentsByHour,
    busyDays,
    monthlyTrends,
    averageLeadTimeDays,
    staffPerformance,
    mostBookedServices: most,
    leastBookedServices: least,
    clientInsights,
    statusSummary: {
      booked: statusCounts.booked,
      completed: statusCounts.completed,
      cancelled: statusCounts.cancelled,
      noShow: statusCounts.no_show,
      completionRate: rate(statusCounts.completed, totalAppointments),
      cancellationRate: rate(statusCounts.cancelled, totalAppointments),
      noShowRate: rate(statusCounts.no_show, totalAppointments),
    },
    financialSummary,
    paymentMethods,
    rebookingRate,
    rebookingTrend,
    scheduleUtilization,
    upcoming,
    alerts,
  };
}

function phaseOf(appt: { status: string; starts_at: string; ends_at: string }, now: number) {
  return getAppointmentPhase(
    { status: appt.status, startsAt: appt.starts_at, endsAt: appt.ends_at },
    now
  );
}

/**
 * Status counts using the derived phase: a past `booked` appointment counts as
 * completed, and `booked` only covers visits that are upcoming or in progress.
 */
function countStatuses(appointments: AppointmentRow[], now: number) {
  const counts = { booked: 0, completed: 0, cancelled: 0, no_show: 0 };
  for (const appt of appointments) {
    const phase = phaseOf(appt, now);
    if (isDonePhase(phase)) counts.completed += 1;
    else if (phase === "cancelled") counts.cancelled += 1;
    else if (phase === "no_show") counts.no_show += 1;
    else counts.booked += 1;
  }
  return counts;
}

/**
 * Revenue entries for the period: every checkout recorded in the range, plus
 * every done appointment in the range that never got a checkout, valued at
 * the sum of its booked service prices.
 */
function buildRevenueEntries(
  appointments: AppointmentRow[],
  transactions: TransactionRow[],
  appointmentIdsWithCheckout: Set<string>,
  now: number
): RevenueEntry[] {
  const entries: RevenueEntry[] = transactions.map((tx) => ({
    appointmentId: tx.appointment_id,
    technicianId: tx.appointments?.technician_id ?? null,
    customerPhone: tx.appointments?.customer_phone ?? "",
    clientId: tx.appointments?.client_id ?? null,
    revenueAt: tx.completed_at,
    visitAt: tx.appointments?.starts_at ?? tx.completed_at,
    amount: Number(tx.final_total),
    estimated: false,
    services: [],
  }));

  for (const appt of appointments) {
    if (appointmentIdsWithCheckout.has(appt.id)) continue;
    if (!isDonePhase(phaseOf(appt, now))) continue;

    const services = (appt.appointment_services ?? []).map((svc) => ({
      service_id: svc.service_id,
      price: Number(svc.price_at_booking ?? 0) || 0,
    }));

    entries.push({
      appointmentId: appt.id,
      technicianId: appt.technician_id,
      customerPhone: appt.customer_phone,
      clientId: appt.client_id,
      revenueAt: appt.starts_at,
      visitAt: appt.starts_at,
      amount: roundMoney(services.reduce((acc, svc) => acc + svc.price, 0)),
      estimated: true,
      services,
    });
  }

  return entries;
}

/** Normalized phone -> sorted start times of visits that were kept or are still coming. */
function buildLaterVisitIndex(visits: VisitRow[], now: number) {
  const byPhone = new Map<string, number[]>();
  for (const visit of visits) {
    const phase = phaseOf(visit, now);
    if (phase === "cancelled" || phase === "no_show") continue;
    const phone = normalizePhone(visit.customer_phone ?? "");
    if (!phone) continue;
    const list = byPhone.get(phone) ?? [];
    list.push(new Date(visit.starts_at).getTime());
    byPhone.set(phone, list);
  }
  return byPhone;
}

type LaterVisitIndex = ReturnType<typeof buildLaterVisitIndex>;

/** True when the same client has another visit (done or booked) after this one. */
function hasLaterVisit(entry: RevenueEntry, index: LaterVisitIndex): boolean {
  const phone = normalizePhone(entry.customerPhone);
  if (!phone) return false;
  const visitAt = new Date(entry.visitAt).getTime();
  return (index.get(phone) ?? []).some((t) => t > visitAt);
}

function rate(part: number, total: number): number {
  if (total === 0) return 0;
  return roundMoney((part / total) * 100);
}

function sum(values: number[]): number {
  return roundMoney(values.reduce((acc, v) => acc + v, 0));
}

function computeClientInsights(
  entries: RevenueEntry[],
  clients: ClientRow[],
  range: DateRange
) {
  const clientFirstVisit = new Map(clients.map((c) => [c.id, c.first_visit_at]));

  let newClients = 0;
  let returningClients = 0;
  const seenInPeriod = new Set<string>();

  for (const entry of entries) {
    const clientId = entry.clientId;
    const phone = normalizePhone(entry.customerPhone);
    const key = clientId ?? phone;
    if (!key || seenInPeriod.has(key)) continue;
    seenInPeriod.add(key);

    const firstVisit = clientId ? clientFirstVisit.get(clientId) : null;

    if (firstVisit && new Date(firstVisit) >= range.from && new Date(firstVisit) <= range.to) {
      newClients += 1;
    } else if (firstVisit && new Date(firstVisit) < range.from) {
      returningClients += 1;
    } else if (!firstVisit) {
      newClients += 1;
    } else {
      returningClients += 1;
    }
  }

  const totalUnique = seenInPeriod.size;
  const repeatClientRate = totalUnique > 0 ? roundMoney((returningClients / totalUnique) * 100) : 0;

  return { newClients, returningClients, repeatClientRate };
}

function computeRevenueBreakdown(
  transactions: TransactionRow[],
  estimatedEntries: RevenueEntry[]
): CategoryAmount[] {
  let nailServices = 0;
  let addons = 0;
  let retail = 0;
  let tips = 0;

  for (const tx of transactions) {
    tips += Number(tx.tip_amount);
    retail += Number(tx.subtotal_retail);

    for (const item of tx.transaction_line_items ?? []) {
      if (item.line_type === "retail") continue;
      const amount = Number(item.line_total);
      if (item.line_type === "addon" || isAddonServiceId(item.service_id)) {
        addons += amount;
      } else if (item.line_type === "service") {
        nailServices += amount;
      }
    }
  }

  for (const entry of estimatedEntries) {
    for (const svc of entry.services) {
      if (isAddonServiceId(svc.service_id)) addons += svc.price;
      else nailServices += svc.price;
    }
  }

  return [
    { category: "Nail Services", amount: roundMoney(nailServices) },
    { category: "Add-on Services", amount: roundMoney(addons) },
    { category: "Retail Products", amount: roundMoney(retail) },
    { category: "Tips", amount: roundMoney(tips) },
    { category: "Gift Cards", amount: 0 },
    { category: "Deposits", amount: 0 },
  ].filter((item) => item.amount > 0 || ["Nail Services", "Add-on Services", "Retail Products", "Tips"].includes(item.category));
}

function isAddonServiceId(serviceId: string | null): boolean {
  if (!serviceId) return false;
  return serviceId.startsWith("addon-");
}

function computeRevenueTrend(entries: RevenueEntry[], range: DateRange): TrendPoint[] {
  const days = eachDayInRange(range.from, range.to);
  const byDay = new Map(days.map((d) => [d, 0]));

  for (const entry of entries) {
    const day = toIsoDateString(new Date(entry.revenueAt));
    if (byDay.has(day)) {
      byDay.set(day, (byDay.get(day) ?? 0) + entry.amount);
    }
  }

  return days.map((date) => ({
    date,
    value: roundMoney(byDay.get(date) ?? 0),
  }));
}

function computeAppointmentsByHour(appointments: AppointmentRow[]): HourCount[] {
  const counts = new Map<number, number>();
  for (let h = 0; h < 24; h += 1) counts.set(h, 0);

  for (const appt of appointments) {
    if (appt.status === "cancelled") continue;
    const hour = getSalonDateParts(new Date(appt.starts_at)).hour;
    counts.set(hour, (counts.get(hour) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([hour]) => hour >= 8 && hour <= 20)
    .map(([hour, count]) => ({ hour, count }));
}

function computeBusyDays(appointments: AppointmentRow[]): DayCount[] {
  const counts = new Map(DAY_NAMES.map((d) => [d, 0]));

  for (const appt of appointments) {
    if (appt.status === "cancelled") continue;
    const day = DAY_NAMES[getSalonDateParts(new Date(appt.starts_at)).dayOfWeek];
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  return DAY_NAMES.map((day) => ({ day, count: counts.get(day) ?? 0 }));
}

function computeMonthlyTrends(appointments: AppointmentRow[], range: DateRange): TrendPoint[] {
  const months = new Map<string, number>();

  for (const appt of appointments) {
    if (appt.status === "cancelled") continue;
    const d = new Date(appt.starts_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.set(key, (months.get(key) ?? 0) + 1);
  }

  if (months.size === 0) {
    const key = `${range.from.getFullYear()}-${String(range.from.getMonth() + 1).padStart(2, "0")}`;
    months.set(key, 0);
  }

  return Array.from(months.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
}

function computeAverageLeadTime(appointments: AppointmentRow[]): number {
  const leadTimes: number[] = [];

  for (const appt of appointments) {
    if (appt.status === "cancelled") continue;
    const created = new Date(appt.created_at).getTime();
    const starts = new Date(appt.starts_at).getTime();
    const days = (starts - created) / (1000 * 60 * 60 * 24);
    if (days >= 0) leadTimes.push(days);
  }

  if (leadTimes.length === 0) return 0;
  return roundMoney(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length);
}

function computeStaffPerformance(
  entries: RevenueEntry[],
  laterVisits: LaterVisitIndex,
  appointmentsInRange: AppointmentRow[],
  technicians: TechnicianRow[]
): StaffPerformanceRow[] {
  const byTech = new Map<string, { revenue: number; entries: RevenueEntry[] }>();

  for (const entry of entries) {
    const techId = entry.technicianId ?? "unassigned";
    const bucket = byTech.get(techId) ?? { revenue: 0, entries: [] };
    bucket.revenue += entry.amount;
    bucket.entries.push(entry);
    byTech.set(techId, bucket);
  }

  return technicians
    .map((tech) => {
      const bucket = byTech.get(tech.id) ?? { revenue: 0, entries: [] };
      const count = bucket.entries.length;
      return {
        technicianId: tech.id,
        technicianName: tech.name,
        completedCount: count,
        revenue: roundMoney(bucket.revenue),
        averageTicket: count > 0 ? roundMoney(bucket.revenue / count) : 0,
        rebookingRate: rebookedPercent(bucket.entries, laterVisits),
      };
    })
    .filter((row) => row.completedCount > 0 || appointmentsInRange.some((a) => a.technician_id === row.technicianId))
    .sort((a, b) => b.revenue - a.revenue);
}

function rebookedPercent(entries: RevenueEntry[], laterVisits: LaterVisitIndex): number {
  if (entries.length === 0) return 0;
  const rebooked = entries.filter((entry) => hasLaterVisit(entry, laterVisits)).length;
  return roundMoney((rebooked / entries.length) * 100);
}

function computeServicePopularity(appointments: AppointmentRow[]) {
  const counts = new Map<string, number>();

  for (const appt of appointments) {
    if (appt.status === "cancelled") continue;
    for (const svc of appt.appointment_services ?? []) {
      counts.set(svc.service_id, (counts.get(svc.service_id) ?? 0) + 1);
    }
  }

  const ranked: ServiceCount[] = allServices.map((service) => ({
    serviceId: service.id,
    name: service.name,
    count: counts.get(service.id) ?? 0,
  }));

  ranked.sort((a, b) => b.count - a.count);
  const withBookings = ranked.filter((r) => r.count > 0);
  const most = withBookings.slice(0, 5);
  const least = [...withBookings].reverse().slice(0, 5);

  return { most, least };
}

function computeFinancialSummary(transactions: TransactionRow[]) {
  let grossSales = 0;
  let discounts = 0;
  let refunds = 0;
  let tips = 0;
  let taxes = 0;

  for (const tx of transactions) {
    grossSales += Number(tx.subtotal_services) + Number(tx.subtotal_retail);
    discounts += Number(tx.discount_amount);
    refunds += Number(tx.refund_amount);
    tips += Number(tx.tip_amount);
    taxes += Number(tx.tax_amount);
  }

  const netRevenue = roundMoney(grossSales - discounts - refunds + tips + taxes);

  return {
    grossSales: roundMoney(grossSales),
    discounts: roundMoney(discounts),
    refunds: roundMoney(refunds),
    tips: roundMoney(tips),
    taxes: roundMoney(taxes),
    netRevenue,
  };
}

function computePaymentMethods(transactions: TransactionRow[]): PaymentMethodAmount[] {
  const totals = new Map<string, number>();

  for (const tx of transactions) {
    const method = tx.payment_method;
    totals.set(method, (totals.get(method) ?? 0) + Number(tx.final_total));
  }

  return ["card", "cash", "apple_pay", "other"].map((method) => ({
    method,
    label: PAYMENT_LABELS[method] ?? method,
    amount: roundMoney(totals.get(method) ?? 0),
  }));
}

function computeRebookingRate(entries: RevenueEntry[], laterVisits: LaterVisitIndex): number {
  return rebookedPercent(entries, laterVisits);
}

function computeRebookingTrend(
  entries: RevenueEntry[],
  laterVisits: LaterVisitIndex,
  range: DateRange
): TrendPoint[] {
  const days = eachDayInRange(range.from, range.to);

  return days.map((date) => {
    const dayEntries = entries.filter(
      (entry) => toIsoDateString(new Date(entry.visitAt)) === date
    );
    return { date, value: rebookedPercent(dayEntries, laterVisits) };
  });
}

function computeScheduleUtilization(
  appointments: AppointmentRow[],
  range: DateRange,
  technicians: TechnicianRow[]
) {
  const activeTechnicianCount = technicians.filter((tech) => tech.is_active).length || 1;
  const days = eachDayInRange(range.from, range.to);
  let availableMinutes = 0;

  for (const day of days) {
    const weekday = new Date(`${day}T12:00:00`).getDay();
    const dayName = DAY_NAMES[weekday];
    const schedule = businessHours.find((h) => h.day === dayName);
    if (!schedule?.open || !schedule?.close) continue;

    const [openH, openM] = schedule.open.split(":").map(Number);
    const [closeH, closeM] = schedule.close.split(":").map(Number);
    const minutes = closeH * 60 + closeM - (openH * 60 + openM);
    availableMinutes += minutes * activeTechnicianCount;
  }

  let bookedMinutes = 0;
  for (const appt of appointments) {
    if (appt.status === "cancelled" || appt.status === "no_show") continue;
    const start = new Date(appt.starts_at).getTime();
    const end = new Date(appt.ends_at).getTime();
    bookedMinutes += (end - start) / 60_000;
  }

  const availableHours = roundMoney(availableMinutes / 60);
  const bookedHours = roundMoney(bookedMinutes / 60);
  const occupancyPercent =
    availableMinutes > 0 ? roundMoney((bookedMinutes / availableMinutes) * 100) : 0;

  return { availableHours, bookedHours, occupancyPercent };
}

function mapUpcoming(
  rows: AppointmentRow[],
  technicianNameById: Map<string, string>
): UpcomingAppointment[] {
  return rows.map((row) => ({
    id: row.id,
    customerName: row.customer_name,
    startsAt: row.starts_at,
    services:
      row.appointment_services?.map(
        (s) => getServiceById(s.service_id)?.name ?? s.service_id
      ) ?? [],
    technicianName: technicianNameById.get(row.technician_id ?? "") ?? "Unassigned",
  }));
}

function buildAlerts(transactions: TransactionRow[]): AnalyticsAlert[] {
  const alerts: AnalyticsAlert[] = [];

  if (transactions.some((t) => Number(t.refund_amount) > 0)) {
    alerts.push({
      id: "refunds",
      type: "refund",
      message: "Refunds recorded in this period — review financial summary.",
      severity: "info",
    });
  }

  alerts.push({
    id: "rebooking",
    type: "rebooking",
    message: "Review clients due for rebooking from recent visits.",
    severity: "info",
  });

  return alerts.slice(0, 5);
}
