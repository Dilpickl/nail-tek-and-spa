"use client";

import {
  type CallPlacement,
  isCallPlacement,
  isTrackingId,
  sanitizeEventPath,
} from "@/lib/analytics/collect";

const VISITOR_KEY = "nt_visitor";
const SESSION_KEY = "nt_session";
const IDLE_MS = 30 * 60 * 1000;

type CollectEvent =
  | {
      visitorId: string;
      sessionId: string;
      eventType: "pageview";
      path: string;
    }
  | {
      visitorId: string;
      sessionId: string;
      eventType: "call_click";
      path: string;
      placement: CallPlacement;
    };

let lastPageviewKey = "";
let lastCallKey = "";

export function getVisitorId(): string | null {
  try {
    return readId(localStorage, VISITOR_KEY);
  } catch {
    return null;
  }
}

export function getSessionId(): string | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const now = Date.now();
    if (raw) {
      const parsed = JSON.parse(raw) as { id?: unknown; seen?: unknown };
      if (isTrackingId(parsed.id) && typeof parsed.seen === "number" && now - parsed.seen < IDLE_MS) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: parsed.id, seen: now }));
        return parsed.id;
      }
    }
    const id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id, seen: now }));
    return id;
  } catch {
    return null;
  }
}

export function getTrackingIds(): { visitorId: string; sessionId: string } | null {
  const visitorId = getVisitorId();
  const sessionId = getSessionId();
  if (!visitorId || !sessionId) return null;
  return { visitorId, sessionId };
}

export function trackPageview(path: string): void {
  if (typeof navigator !== "undefined" && navigator.webdriver) return;
  const safePath = sanitizeEventPath(path);
  if (!safePath) return;

  const ids = getTrackingIds();
  if (!ids) return;

  const dedupeKey = `${ids.sessionId}:${safePath}:${Math.floor(Date.now() / 2000)}`;
  if (dedupeKey === lastPageviewKey) return;
  lastPageviewKey = dedupeKey;

  send({
    ...ids,
    eventType: "pageview",
    path: safePath,
  });
}

export function trackCallClick(placement: CallPlacement): void {
  if (typeof navigator !== "undefined" && navigator.webdriver) return;
  if (!isCallPlacement(placement)) return;

  const ids = getTrackingIds();
  if (!ids) return;

  const path = sanitizeEventPath(window.location.pathname) ?? "/";
  const dedupeKey = `${ids.visitorId}:${placement}:${Math.floor(Date.now() / 2000)}`;
  if (dedupeKey === lastCallKey) return;
  lastCallKey = dedupeKey;

  send({
    ...ids,
    eventType: "call_click",
    path,
    placement,
  });
}

function readId(storage: Storage, key: string): string | null {
  try {
    const existing = storage.getItem(key);
    if (isTrackingId(existing)) return existing;
    const id = crypto.randomUUID();
    storage.setItem(key, id);
    return id;
  } catch {
    return null;
  }
}

function send(event: CollectEvent): void {
  const body = JSON.stringify(event);
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/analytics/collect", blob)) return;
    }
  } catch {
    // Fall through to fetch.
  }

  void fetch("/api/analytics/collect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Measurement should never surface an error to a guest.
  });
}
