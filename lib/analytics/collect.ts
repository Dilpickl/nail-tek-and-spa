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

const BOT_USER_AGENT =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegrambot|headless|lighthouse/i;

export function isTrackingId(value: unknown): value is string {
  return typeof value === "string" && TRACKING_ID_PATTERN.test(value);
}

export function isCallPlacement(value: unknown): value is CallPlacement {
  return typeof value === "string" && (CALL_PLACEMENTS as readonly string[]).includes(value);
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
