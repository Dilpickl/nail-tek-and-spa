import {
  type EngagementRaw,
  type SiteInsights,
  buildSiteInsights,
  emptyEngagement,
  parseEngagement,
} from "./engagement";

export interface ConversionDay {
  date: string;
  visitors: number;
  calls: number;
  bookings: number;
}

/** Raw aggregates from `website_conversion`. */
export interface WebsiteConversionStats {
  trackingStartedAt: string | null;
  pageviews: number;
  visitors: number;
  sessions: number;
  callers: number;
  callTaps: number;
  bookers: number;
  converters: number;
  onlineBookings: number;
  phoneAppointments: number;
  daily: ConversionDay[];
  /** True after migration 014. Older databases still return conversion totals. */
  engagementReady: boolean;
  engagement: EngagementRaw;
}

export interface WebsiteConversion {
  /** False until migration 013 is applied. */
  available: boolean;
  /** First measured page view. Null before anyone is counted. */
  trackingStartedAt: string | null;
  uniqueVisitors: number;
  sessions: number;
  pageviews: number;
  /** Online bookings created after visit tracking started. */
  onlineBookings: number;
  /** People who finished an online booking. */
  bookers: number;
  /**
   * Online bookings in the period that were not tied to a measured visitor.
   * Kept out of the percentage.
   */
  unattributedBookings: number;
  /** People who tapped a phone number. */
  callers: number;
  /** Raw taps, before counting each person once. */
  callTaps: number;
  /** People who booked online or tapped Call. Each person counts once. */
  conversions: number;
  /** conversions / measured visitors, 0–100 with one decimal. */
  conversionRate: number;
  /** Phone appointments typed in at the front desk since tracking started. */
  phoneAppointments: number;
  trend: ConversionDay[];
  /** Null until migration 014 is applied. */
  insights: SiteInsights | null;
}

export function unavailableWebsiteConversion(): WebsiteConversion {
  return {
    available: false,
    trackingStartedAt: null,
    uniqueVisitors: 0,
    sessions: 0,
    pageviews: 0,
    onlineBookings: 0,
    bookers: 0,
    unattributedBookings: 0,
    callers: 0,
    callTaps: 0,
    conversions: 0,
    conversionRate: 0,
    phoneAppointments: 0,
    trend: [],
    insights: null,
  };
}

function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function dayFromUnknown(value: unknown): ConversionDay | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) return null;
  return {
    date: row.date,
    visitors: num(row.visitors),
    calls: num(row.calls),
    bookings: num(row.bookings),
  };
}

export function parseWebsiteConversionStats(raw: unknown): WebsiteConversionStats | null {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const started = row.trackingStartedAt;
  const daily = Array.isArray(row.daily)
    ? row.daily.map(dayFromUnknown).filter((day): day is ConversionDay => day !== null)
    : [];

  return {
    trackingStartedAt: typeof started === "string" ? started : null,
    pageviews: num(row.pageviews),
    visitors: num(row.visitors),
    sessions: num(row.sessions),
    callers: num(row.callers),
    callTaps: num(row.callTaps),
    bookers: num(row.bookers),
    converters: num(row.converters),
    onlineBookings: num(row.onlineBookings),
    phoneAppointments: num(row.phoneAppointments),
    daily,
    engagementReady: row.engagementReady === true,
    engagement: row.engagementReady === true ? parseEngagement(row.engagement) : emptyEngagement(),
  };
}

/**
 * Conversion rate is people who booked online or tapped Call, divided by
 * measured visitors. Someone who does both counts once. Online bookings from
 * before visit tracking (or with no visitor id) stay in `unattributedBookings`
 * and out of the rate, so a year of old appointments cannot dwarf a new
 * visitor count.
 */
export function buildWebsiteConversion(
  stats: WebsiteConversionStats,
  days: string[]
): WebsiteConversion {
  const visitors = stats.visitors;
  const converters = stats.converters;
  const people = Math.max(visitors, converters);
  const conversionRate = people === 0 ? 0 : Math.round((converters / people) * 1000) / 10;
  const byDate = new Map(stats.daily.map((day) => [day.date, day]));

  return {
    available: true,
    trackingStartedAt: stats.trackingStartedAt,
    uniqueVisitors: visitors,
    sessions: stats.sessions,
    pageviews: stats.pageviews,
    onlineBookings: stats.onlineBookings,
    bookers: stats.bookers,
    unattributedBookings: Math.max(0, stats.onlineBookings - stats.bookers),
    callers: stats.callers,
    callTaps: stats.callTaps,
    conversions: converters,
    conversionRate,
    phoneAppointments: stats.phoneAppointments,
    trend: days.map((date) => ({
      date,
      visitors: byDate.get(date)?.visitors ?? 0,
      calls: byDate.get(date)?.calls ?? 0,
      bookings: byDate.get(date)?.bookings ?? 0,
    })),
    insights: stats.engagementReady
      ? buildSiteInsights(stats.engagement, stats.pageviews, stats.sessions)
      : null,
  };
}
