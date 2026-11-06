import { NextResponse } from "next/server";

import {
  isCallPlacement,
  isLikelyBot,
  isPrefetchRequest,
  isTrackingId,
  sanitizeEventPath,
} from "@/lib/analytics/collect";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const recentHits = new Map<string, number[]>();
const MAX_EVENTS_PER_MINUTE = 30;

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

  let row: {
    visitor_id: string;
    session_id: string;
    event_type: "pageview" | "call_click";
    path: string;
    placement: string | null;
  };

  if (body.eventType === "pageview") {
    row = {
      visitor_id: body.visitorId,
      session_id: body.sessionId,
      event_type: "pageview",
      path,
      placement: null,
    };
  } else if (body.eventType === "call_click" && isCallPlacement(body.placement)) {
    row = {
      visitor_id: body.visitorId,
      session_id: body.sessionId,
      event_type: "call_click",
      path,
      placement: body.placement,
    };
  } else {
    return noContent();
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("site_events").insert(row);
    if (error) console.error("Site event insert failed", error.message);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Site event insert skipped", message);
  }

  return noContent();
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
