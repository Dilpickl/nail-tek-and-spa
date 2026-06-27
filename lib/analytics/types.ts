export interface AnalyticsKpis {
  totalAppointments: number;
  completedAppointments: number;
  grossRevenue: number;
  averageTicket: number;
  newClients: number;
  returningClients: number;
  cancellations: number;
  noShows: number;
}

export interface CategoryAmount {
  category: string;
  amount: number;
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface HourCount {
  hour: number;
  count: number;
}

export interface DayCount {
  day: string;
  count: number;
}

export interface StaffPerformanceRow {
  technicianId: string;
  technicianName: string;
  completedCount: number;
  revenue: number;
  averageTicket: number;
  rebookingRate: number;
}

export interface ServiceCount {
  serviceId: string;
  name: string;
  count: number;
}

export interface ClientInsights {
  newClients: number;
  returningClients: number;
  repeatClientRate: number;
}

export interface StatusSummary {
  booked: number;
  completed: number;
  cancelled: number;
  noShow: number;
  completionRate: number;
  cancellationRate: number;
  noShowRate: number;
}

export interface FinancialSummary {
  grossSales: number;
  discounts: number;
  refunds: number;
  tips: number;
  taxes: number;
  netRevenue: number;
}

export interface PaymentMethodAmount {
  method: string;
  label: string;
  amount: number;
}

export interface ScheduleUtilization {
  availableHours: number;
  bookedHours: number;
  occupancyPercent: number;
}

export interface UpcomingAppointment {
  id: string;
  customerName: string;
  startsAt: string;
  services: string[];
  technicianName: string;
}

export interface AnalyticsAlert {
  id: string;
  type: string;
  message: string;
  severity: "info" | "warning";
}

export interface AnalyticsResponse {
  range: { from: string; to: string; label: string };
  kpis: AnalyticsKpis;
  revenueBreakdown: CategoryAmount[];
  revenueTrend: TrendPoint[];
  appointmentsByHour: HourCount[];
  busyDays: DayCount[];
  monthlyTrends: TrendPoint[];
  averageLeadTimeDays: number;
  staffPerformance: StaffPerformanceRow[];
  mostBookedServices: ServiceCount[];
  leastBookedServices: ServiceCount[];
  clientInsights: ClientInsights;
  statusSummary: StatusSummary;
  financialSummary: FinancialSummary;
  paymentMethods: PaymentMethodAmount[];
  rebookingRate: number;
  rebookingTrend: TrendPoint[];
  scheduleUtilization: ScheduleUtilization;
  upcoming: UpcomingAppointment[];
  alerts: AnalyticsAlert[];
}
