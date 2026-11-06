import { NextResponse } from "next/server";

import {
  isBookingStep,
  isCallPlacement,
  isCtaPlacement,
  isDeviceKind,
  isLikelyBot,
  isPrefetchRequest,
  isTrackingId,
  sanitizeEventPath,
  sanitizeReferrerHost,
} from "@/lib/analytics/collect";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const recentHits = new Map<string, number[]>();
const MAX_EVENTS_PER_MINUTE = 80;

type EventType = "pageview" | "call_click" | "cta_click" | "booking_step";

export async function POST(request: Request) {
  if (isPrefetchRequest(request) || isLikelyBot(request.headers.get("user-agent"))) {
    return noContent();
  }

  let payload: unknown;
  try {
    const text = await request.text();
    if (text.length > 2000) return noContent();
    payload = JSON.parse(text) as unknown;
  } catch {
    return noContent();
  }

  if (!payload || typeof payload !== "object") return noContent();
  const body = payload as Record<string, unknown>;
  if (!isTrackingId(body.visitorId) || !isTrackingId(body.sessionId)) return noContent();
  if (!allowEvent(body.visitorId)) return noContent();

  const path = sanitizeEventPath(body.path);
  if (!path) return noContent();

  const eventType = readEventType(body);
  if (!eventType) return noContent();

  const placement = readPlacement(eventType, body.placement);
  if (eventType !== "pageview" && !placement) return noContent();

  const row = {
    visitor_id: body.visitorId,
    session_id: body.sessionId,
    event_type: eventType,
    path,
    placement,
    referrer_host: sanitizeReferrerHost(body.referrerHost),
    device: isDeviceKind(body.device) ? body.device : null,
  };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("site_events").insert(row);
    if (error && legacySchema(error.message) && (eventType === "pageview" || eventType === "call_click")) {
      const { error: retryError } = await supabase.from("site_events").insert({
        visitor_id: row.visitor_id,
        session_id: row.session_id,
        event_type: eventType,
        path: row.path,
        placement: row.placement,
      });
      if (retryError) console.error("Site event insert failed", retryError.message);
    } else if (error) {
      console.error("Site event insert failed", error.message);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Site event insert skipped", message);
  }

  return noContent();
}

function readEventType(body: Record<string, unknown>): EventType | null {
  if (body.eventType === "pageview") return "pageview";
  if (body.eventType === "call_click") return "call_click";
  if (body.eventType === "cta_click") return "cta_click";
  if (body.eventType === "booking_step") return "booking_step";
  return null;
}

function readPlacement(eventType: EventType, value: unknown): string | null {
  if (eventType === "pageview") return null;
  if (eventType === "call_click" && isCallPlacement(value)) return value;
  if (eventType === "cta_click" && isCtaPlacement(value)) return value;
  if (eventType === "booking_step" && isBookingStep(value)) return value;
  return null;
}

function legacySchema(message: string): boolean {
  return /referrer_host|device|cta_click|booking_step|check constraint/i.test(message);
}

function noContent() {
  return new NextResponse(null, { status: 204 });
}

function allowEvent(visitorId: string): boolean {
  const now = Date.now();
  const recent = (recentHits.get(visitorId) ?? []).filter((stamp) => now - stamp < 60_000);
  if (recent.length >= MAX_EVENTS_PER_MINUTE) {
    recentHits.set(visitorId, recent);
    return false;
  }
  recent.push(now);
  recentHits.set(visitorId, recent);
  if (recentHits.size > 5000) {
    const oldest = recentHits.keys().next().value;
    if (oldest) recentHits.delete(oldest);
  }
  return true;
}
