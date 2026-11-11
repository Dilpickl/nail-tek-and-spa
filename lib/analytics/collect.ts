export const TRACKING_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const CALL_PLACEMENTS = [
  "header",
  "footer",
  "hero",
  "mobile_bar",
  "privacy",
  "terms",
  "careers",
] as const;

export type CallPlacement = (typeof CALL_PLACEMENTS)[number];

export const CTA_PLACEMENTS = [
  "header_book",
  "menu_book",
  "hero_book",
  "mobile_book",
  "gallery_book",
  "nailart_book",
  "look_book",
  "addon_book",
] as const;

export type CtaPlacement = (typeof CTA_PLACEMENTS)[number] | `service:${string}`;

export const BOOKING_STEPS = ["services", "technician", "time", "details", "confirm"] as const;

export type BookingStep = (typeof BOOKING_STEPS)[number];

export const DEVICES = ["phone", "tablet", "desktop"] as const;

export type DeviceKind = (typeof DEVICES)[number];

const BOT_USER_AGENT =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegrambot|headless|lighthouse/i;

export function isTrackingId(value: unknown): value is string {
  return typeof value === "string" && TRACKING_ID_PATTERN.test(value);
}

export function isCallPlacement(value: unknown): value is CallPlacement {
  return typeof value === "string" && (CALL_PLACEMENTS as readonly string[]).includes(value);
}

export function isCtaPlacement(value: unknown): value is CtaPlacement {
  if (typeof value !== "string") return false;
  if ((CTA_PLACEMENTS as readonly string[]).includes(value)) return true;
  return /^service:[a-z0-9-]{1,40}$/.test(value);
}

export function isBookingStep(value: unknown): value is BookingStep {
  return typeof value === "string" && (BOOKING_STEPS as readonly string[]).includes(value);
}

export function isDeviceKind(value: unknown): value is DeviceKind {
  return typeof value === "string" && (DEVICES as readonly string[]).includes(value);
}

/** Hostname only, so referral links cannot carry names, phones, or search queries. */
export function sanitizeReferrerHost(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const host = value.trim().toLowerCase().replace(/^www\./, "");
  if (!host || host.length > 80) return null;
  if (!/^[a-z0-9.-]+$/.test(host)) return null;
  return host;
}

/** Public paths only. Query strings are dropped so booking details never land here. */
export function sanitizeEventPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const path = value.split("?")[0]?.split("#")[0] ?? "";
  if (!path.startsWith("/")) return null;
  if (path.startsWith("/admin") || path.startsWith("/api")) return null;
  if (path.length > 180) return null;
  if (!/^\/[a-zA-Z0-9/_\-.]*$/.test(path)) return null;
  return path;
}

export function isLikelyBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return BOT_USER_AGENT.test(userAgent);
}

export function isPrefetchRequest(request: Request): boolean {
  const purpose = request.headers.get("purpose") ?? request.headers.get("sec-purpose");
  if (purpose && /prefetch/i.test(purpose)) return true;
  if (request.headers.get("next-router-prefetch") === "1") return true;
  return false;
}
