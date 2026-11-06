export interface CountRow {
  label: string;
  value: number;
}

export interface TapInsight {
  placement: string;
  label: string;
  people: number;
}

export interface DeviceInsight {
  label: string;
  visitors: number;
  conversionRate: number;
}

export interface PageInsight {
  label: string;
  path: string;
  views: number;
  visitors: number;
}

export interface FunnelStep {
  label: string;
  people: number;
  percentOfStart: number;
}

export interface SiteInsights {
  bounceRate: number;
  bounceSessions: number;
  measuredSessions: number;
  pagesPerVisit: number;
  newVisitors: number;
  returningVisitors: number;
  devices: DeviceInsight[];
  sources: CountRow[];
  landings: CountRow[];
  pages: PageInsight[];
  taps: TapInsight[];
  funnel: FunnelStep[];
  biggestDrop: { from: string; to: string; people: number } | null;
}

export interface EngagementRaw {
  bounceSessions: number;
  measuredSessions: number;
  newVisitors: number;
  returningVisitors: number;
  devices: { device: string; visitors: number; conversions: number }[];
  sources: { host: string; visits: number }[];
  landings: { path: string; visits: number }[];
  pages: { path: string; views: number; visitors: number }[];
  calls: { placement: string; people: number }[];
  ctas: { placement: string; people: number }[];
  funnel: { step: string; people: number }[];
}

const FUNNEL: { step: string; label: string }[] = [
  { step: "services", label: "Choose services" },
  { step: "technician", label: "Choose a technician" },
  { step: "time", label: "Pick a time" },
  { step: "details", label: "Enter contact info" },
  { step: "confirm", label: "Review" },
  { step: "booked", label: "Booked" },
];

const PAGE_LABELS: Record<string, string> = {
  "/": "Homepage",
  "/book": "Booking",
  "/services": "Services & prices",
  "/gallery": "Lookbook",
  "/privacy": "Privacy",
  "/terms": "Terms",
};

const TAP_LABELS: Record<string, string> = {
  header: "Call in the header",
  footer: "Call in the footer",
  hero: "Call on the homepage",
  mobile_bar: "Call on the bottom bar",
  privacy: "Call on the privacy page",
  terms: "Call on the terms page",
  careers: "Call on careers",
  header_book: "Book in the header",
  menu_book: "Book in the phone menu",
  hero_book: "Book on the homepage",
  mobile_book: "Book on the bottom bar",
  gallery_book: "Book from the lookbook",
  nailart_book: "Book a nail art visit",
};

const DEVICE_LABELS: Record<string, string> = {
  phone: "Phone",
  tablet: "Tablet",
  desktop: "Computer",
  unknown: "Unknown device",
};

export function labelReferrer(host: string | null | undefined): string {
  if (!host || host === "(direct)") return "Direct";
  const value = host.toLowerCase().replace(/^www\./, "");
  if (value.includes("google.")) return "Google";
  if (value === "instagram.com" || value.endsWith(".instagram.com")) return "Instagram";
  if (
    value === "fb.com" ||
    value.endsWith(".fb.com") ||
    value.includes("facebook.")
  ) {
    return "Facebook";
  }
  if (value.includes("bing.")) return "Bing";
  if (value.includes("yelp.")) return "Yelp";
  if (value === "t.co" || value.includes("twitter.") || value === "x.com" || value.endsWith(".x.com")) {
    return "X";
  }
  if (value.includes("tiktok.")) return "TikTok";
  return value;
}

export function labelPage(path: string): string {
  return PAGE_LABELS[path] ?? path;
}

export function labelTap(placement: string): string {
  if (placement.startsWith("service:")) {
    const name = placement.slice("service:".length).replace(/-/g, " ");
    return `Book ${name}`;
  }
  return TAP_LABELS[placement] ?? placement;
}

export function emptyEngagement(): EngagementRaw {
  return {
    bounceSessions: 0,
    measuredSessions: 0,
    newVisitors: 0,
    returningVisitors: 0,
    devices: [],
    sources: [],
    landings: [],
    pages: [],
    calls: [],
    ctas: [],
    funnel: [],
  };
}

export function parseEngagement(raw: unknown): EngagementRaw {
  if (!raw || typeof raw !== "object") return emptyEngagement();
  const row = raw as Record<string, unknown>;
  return {
    bounceSessions: num(row.bounceSessions),
    measuredSessions: num(row.measuredSessions),
    newVisitors: num(row.newVisitors),
    returningVisitors: num(row.returningVisitors),
    devices: objects(row.devices).map((item) => ({
      device: text(item.device),
      visitors: num(item.visitors),
      conversions: num(item.conversions),
    })),
    sources: objects(row.sources).map((item) => ({
      host: text(item.host),
      visits: num(item.visits),
    })),
    landings: objects(row.landings).map((item) => ({
      path: text(item.path),
      visits: num(item.visits),
    })),
    pages: objects(row.pages).map((item) => ({
      path: text(item.path),
      views: num(item.views),
      visitors: num(item.visitors),
    })),
    calls: objects(row.calls).map((item) => ({
      placement: text(item.placement),
      people: num(item.people),
    })),
    ctas: objects(row.ctas).map((item) => ({
      placement: text(item.placement),
      people: num(item.people),
    })),
    funnel: objects(row.funnel).map((item) => ({
      step: text(item.step),
      people: num(item.people),
    })),
  };
}

export function buildSiteInsights(
  raw: EngagementRaw,
  pageviews: number,
  sessions: number
): SiteInsights {
  const measuredSessions = raw.measuredSessions;
  const bounceRate =
    measuredSessions === 0 ? 0 : Math.round((raw.bounceSessions / measuredSessions) * 1000) / 10;
  const pagesPerVisit =
    sessions === 0 ? 0 : Math.round((pageviews / sessions) * 10) / 10;

  const funnelCounts = new Map(raw.funnel.map((step) => [step.step, step.people]));
  const start = funnelCounts.get("services") ?? 0;
  const funnel = FUNNEL.map((step) => {
    const people = funnelCounts.get(step.step) ?? 0;
    return {
      label: step.label,
      people,
      percentOfStart: start === 0 ? 0 : Math.round((people / start) * 100),
    };
  });

  let biggestDrop: SiteInsights["biggestDrop"] = null;
  for (let index = 1; index < funnel.length; index += 1) {
    const dropped = funnel[index - 1].people - funnel[index].people;
    if (dropped > 0 && (!biggestDrop || dropped > biggestDrop.people)) {
      biggestDrop = {
        from: funnel[index - 1].label,
        to: funnel[index].label,
        people: dropped,
      };
    }
  }

  return {
    bounceRate,
    bounceSessions: raw.bounceSessions,
    measuredSessions,
    pagesPerVisit,
    newVisitors: raw.newVisitors,
    returningVisitors: raw.returningVisitors,
    devices: raw.devices
      .map((device) => ({
        label: DEVICE_LABELS[device.device] ?? "Unknown device",
        visitors: device.visitors,
        conversionRate:
          device.visitors === 0
            ? 0
            : Math.round((device.conversions / device.visitors) * 1000) / 10,
      }))
      .sort((a, b) => b.visitors - a.visitors),
    sources: mergeCounts(
      raw.sources.map((source) => ({
        label: labelReferrer(source.host),
        value: source.visits,
      }))
    ).slice(0, 6),
    landings: raw.landings
      .map((landing) => ({ label: labelPage(landing.path), value: landing.visits }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4),
    pages: raw.pages
      .map((page) => ({
        label: labelPage(page.path),
        path: page.path,
        views: page.views,
        visitors: page.visitors,
      }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 6),
    taps: mergeTaps([...raw.calls, ...raw.ctas]),
    funnel,
    biggestDrop,
  };
}

function mergeTaps(rows: { placement: string; people: number }[]): TapInsight[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (!row.placement || row.people <= 0) continue;
    totals.set(row.placement, (totals.get(row.placement) ?? 0) + row.people);
  }
  return Array.from(totals.entries())
    .map(([placement, people]) => ({
      placement,
      label: labelTap(placement),
      people,
    }))
    .sort((a, b) => b.people - a.people);
}

function mergeCounts(rows: CountRow[]): CountRow[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (!row.label || row.value <= 0) continue;
    totals.set(row.label, (totals.get(row.label) ?? 0) + row.value);
  }
  return Array.from(totals.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function objects(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
}
