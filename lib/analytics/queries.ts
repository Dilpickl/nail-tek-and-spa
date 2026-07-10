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
  appointment_services?: { service_id: string }[];
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
    { data: allCompletedTransactions },
    { data: clients },
    { data: upcomingRows },
    { data: technicianRows },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, technician_id, customer_name, customer_phone, client_id, starts_at, ends_at, status, created_at, appointment_services(service_id)"
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
      .from("completed_transactions")
      .select("id, completed_at, appointments ( customer_phone, client_id )"),
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
  const allCompleted = (allCompletedTransactions ?? []) as unknown as {
    id: string;
    completed_at: string;
    appointments: { customer_phone: string; client_id: string | null } | null;
  }[];
  const clientRows = (clients ?? []) as ClientRow[];

  const statusCounts = countStatuses(appointments);
  const completedCount = transactions.length;
  const grossRevenue = sum(transactions.map((t) => Number(t.final_total)));
  const averageTicket = completedCount > 0 ? roundMoney(grossRevenue / completedCount) : 0;

  const clientInsights = computeClientInsights(transactions, clientRows, range);
  const revenueBreakdown = computeRevenueBreakdown(transactions);
  const revenueTrend = computeRevenueTrend(transactions, range);
  const appointmentsByHour = computeAppointmentsByHour(appointments);
  const busyDays = computeBusyDays(appointments);
  const monthlyTrends = computeMonthlyTrends(appointments, range);
  const averageLeadTimeDays = computeAverageLeadTime(appointments);
  const staffPerformance = computeStaffPerformance(
    transactions,
    allCompleted,
    appointments,
    technicians
  );
  const { most, least } = computeServicePopularity(appointments);
  const financialSummary = computeFinancialSummary(transactions);
  const paymentMethods = computePaymentMethods(transactions);
  const rebookingRate = computeRebookingRate(transactions, allCompleted);
  const rebookingTrend = computeRebookingTrend(transactions, allCompleted, range);
  const scheduleUtilization = computeScheduleUtilization(appointments, range, technicians);
  const upcoming = mapUpcoming((upcomingRows ?? []) as AppointmentRow[], technicianNameById);
  const alerts = buildAlerts(appointments, transactions);

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

function countStatuses(appointments: AppointmentRow[]) {
  const counts = { booked: 0, completed: 0, cancelled: 0, no_show: 0 };
  for (const appt of appointments) {
    counts[appt.status] += 1;
  }
  return counts;
}

function rate(part: number, total: number): number {
  if (total === 0) return 0;
  return roundMoney((part / total) * 100);
}

function sum(values: number[]): number {
  return roundMoney(values.reduce((acc, v) => acc + v, 0));
}

function computeClientInsights(
  transactions: TransactionRow[],
  clients: ClientRow[],
  range: DateRange
) {
  const clientFirstVisit = new Map(clients.map((c) => [c.id, c.first_visit_at]));
  const phonesSeenBefore = new Set<string>();

  for (const tx of transactions) {
    const phone = normalizePhone(tx.appointments?.customer_phone ?? "");
    if (phone) phonesSeenBefore.add(phone);
  }

  let newClients = 0;
  let returningClients = 0;
  const seenInPeriod = new Set<string>();

  for (const tx of transactions) {
    const clientId = tx.appointments?.client_id;
    const phone = normalizePhone(tx.appointments?.customer_phone ?? "");
    const key = clientId ?? phone;
    if (!key || seenInPeriod.has(key)) continue;
    seenInPeriod.add(key);

    const firstVisit = clientId ? clientFirstVisit.get(clientId) : null;
    const completedAt = new Date(tx.completed_at);

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

function computeRevenueBreakdown(transactions: TransactionRow[]): CategoryAmount[] {
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

function computeRevenueTrend(transactions: TransactionRow[], range: DateRange): TrendPoint[] {
  const days = eachDayInRange(range.from, range.to);
  const byDay = new Map(days.map((d) => [d, 0]));

  for (const tx of transactions) {
    const day = toIsoDateString(new Date(tx.completed_at));
    if (byDay.has(day)) {
      byDay.set(day, (byDay.get(day) ?? 0) + Number(tx.final_total));
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
  transactions: TransactionRow[],
  allCompleted: { id: string; completed_at: string; appointments: { customer_phone: string; client_id: string | null } | null }[],
  appointmentsInRange: AppointmentRow[],
  technicians: TechnicianRow[]
): StaffPerformanceRow[] {
  const byTech = new Map<string, { revenue: number; count: number; appointmentIds: string[] }>();

  for (const tx of transactions) {
    const techId = tx.appointments?.technician_id ?? "unassigned";
    const entry = byTech.get(techId) ?? { revenue: 0, count: 0, appointmentIds: [] };
    entry.revenue += Number(tx.final_total);
    entry.count += 1;
    entry.appointmentIds.push(tx.appointment_id);
    byTech.set(techId, entry);
  }

  return technicians
    .map((tech) => {
      const entry = byTech.get(tech.id) ?? { revenue: 0, count: 0, appointmentIds: [] };
      const rebookingRate = computeTechRebookingRate(entry.appointmentIds, transactions, allCompleted);
      return {
        technicianId: tech.id,
        technicianName: tech.name,
        completedCount: entry.count,
        revenue: roundMoney(entry.revenue),
        averageTicket: entry.count > 0 ? roundMoney(entry.revenue / entry.count) : 0,
        rebookingRate,
      };
    })
    .filter((row) => row.completedCount > 0 || appointmentsInRange.some((a) => a.technician_id === row.technicianId))
    .sort((a, b) => b.revenue - a.revenue);
}

function computeTechRebookingRate(
  appointmentIds: string[],
  transactions: TransactionRow[],
  allCompleted: { id: string; completed_at: string; appointments: { customer_phone: string; client_id: string | null } | null }[]
): number {
  if (appointmentIds.length === 0) return 0;

  let rebooked = 0;
  for (const apptId of appointmentIds) {
    const tx = transactions.find((t) => t.appointment_id === apptId);
    if (!tx) continue;
    const phone = normalizePhone(tx.appointments?.customer_phone ?? "");
    const completedAt = new Date(tx.completed_at).getTime();
    const hasFuture = allCompleted.some((other) => {
      if (other.id === tx.id) return false;
      const otherPhone = normalizePhone(other.appointments?.customer_phone ?? "");
      return otherPhone === phone && new Date(other.completed_at).getTime() > completedAt;
    });
    if (hasFuture) rebooked += 1;
  }

  return roundMoney((rebooked / appointmentIds.length) * 100);
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

function computeRebookingRate(
  transactions: TransactionRow[],
  allCompleted: { id: string; completed_at: string; appointments: { customer_phone: string; client_id: string | null } | null }[]
): number {
  if (transactions.length === 0) return 0;

  let rebooked = 0;
  for (const tx of transactions) {
    const phone = normalizePhone(tx.appointments?.customer_phone ?? "");
    const completedAt = new Date(tx.completed_at).getTime();
    const hasFuture = allCompleted.some((other) => {
      if (other.id === tx.id) return false;
      const otherPhone = normalizePhone(other.appointments?.customer_phone ?? "");
      return otherPhone === phone && new Date(other.completed_at).getTime() > completedAt;
    });
    if (hasFuture) rebooked += 1;
  }

  return roundMoney((rebooked / transactions.length) * 100);
}

function computeRebookingTrend(
  transactions: TransactionRow[],
  allCompleted: { id: string; completed_at: string; appointments: { customer_phone: string; client_id: string | null } | null }[],
  range: DateRange
): TrendPoint[] {
  const days = eachDayInRange(range.from, range.to);

  return days.map((date) => {
    const dayStart = new Date(`${date}T00:00:00`).getTime();
    const dayEnd = new Date(`${date}T23:59:59`).getTime();
    const dayTx = transactions.filter((tx) => {
      const t = new Date(tx.completed_at).getTime();
      return t >= dayStart && t <= dayEnd;
    });

    if (dayTx.length === 0) return { date, value: 0 };

    let rebooked = 0;
    for (const tx of dayTx) {
      const phone = normalizePhone(tx.appointments?.customer_phone ?? "");
      const completedAt = new Date(tx.completed_at).getTime();
      const hasFuture = allCompleted.some((other) => {
        if (other.id === tx.id) return false;
        const otherPhone = normalizePhone(other.appointments?.customer_phone ?? "");
        return otherPhone === phone && new Date(other.completed_at).getTime() > completedAt;
      });
      if (hasFuture) rebooked += 1;
    }

    return { date, value: roundMoney((rebooked / dayTx.length) * 100) };
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

function buildAlerts(
  appointments: AppointmentRow[],
  transactions: TransactionRow[]
): AnalyticsAlert[] {
  const alerts: AnalyticsAlert[] = [];
  const now = Date.now();

  const pastBooked = appointments.filter(
    (a) => a.status === "booked" && new Date(a.starts_at).getTime() < now
  );
  if (pastBooked.length > 0) {
    alerts.push({
      id: "pending-completion",
      type: "completion",
      message: `${pastBooked.length} past appointment(s) still marked as booked — complete or update status.`,
      severity: "warning",
    });
  }

  const onlineBooked = appointments.filter((a) => a.status === "booked");
  if (onlineBooked.length > 0) {
    alerts.push({
      id: "confirmations",
      type: "confirmation",
      message: `${onlineBooked.length} upcoming booking(s) — review confirmation status.`,
      severity: "info",
    });
  }

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
    message: "Review clients due for rebooking from completed appointments.",
    severity: "info",
  });

  return alerts.slice(0, 5);
}
