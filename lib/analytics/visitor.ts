"use client";

import {
  type BookingStep,
  type CallPlacement,
  type CtaPlacement,
  isBookingStep,
  isCallPlacement,
  isCtaPlacement,
  isDeviceKind,
  isTrackingId,
  sanitizeEventPath,
  sanitizeReferrerHost,
  type DeviceKind,
} from "@/lib/analytics/collect";

const VISITOR_KEY = "nt_visitor";
const SESSION_KEY = "nt_session";
const IDLE_MS = 30 * 60 * 1000;

type CollectEvent = {
  visitorId: string;
  sessionId: string;
  eventType: "pageview" | "call_click" | "cta_click" | "booking_step";
  path: string;
  placement?: string;
  referrerHost: string | null;
  device: DeviceKind | null;
};

let lastPageviewKey = "";
let lastCallKey = "";
let lastCtaKey = "";
const seenBookingSteps = new Set<string>();

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
    ...context(),
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
    ...context(),
    eventType: "call_click",
    path,
    placement,
  });
}

export function trackCta(placement: CtaPlacement): void {
  if (typeof navigator !== "undefined" && navigator.webdriver) return;
  if (!isCtaPlacement(placement)) return;

  const ids = getTrackingIds();
  if (!ids) return;

  const path = sanitizeEventPath(window.location.pathname) ?? "/";
  const dedupeKey = `${ids.visitorId}:${placement}:${Math.floor(Date.now() / 2000)}`;
  if (dedupeKey === lastCtaKey) return;
  lastCtaKey = dedupeKey;

  send({
    ...ids,
    ...context(),
    eventType: "cta_click",
    path,
    placement,
  });
}

export function trackBookingStep(step: BookingStep): void {
  if (typeof navigator !== "undefined" && navigator.webdriver) return;
  if (!isBookingStep(step)) return;

  const ids = getTrackingIds();
  if (!ids) return;

  const dedupeKey = `${ids.sessionId}:${step}`;
  if (seenBookingSteps.has(dedupeKey)) return;
  seenBookingSteps.add(dedupeKey);

  send({
    ...ids,
    ...context(),
    eventType: "booking_step",
    path: "/book",
    placement: step,
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

function context(): { referrerHost: string | null; device: DeviceKind | null } {
  return {
    referrerHost: readReferrerHost(),
    device: readDevice(),
  };
}

function readReferrerHost(): string | null {
  try {
    if (!document.referrer) return null;
    const host = new URL(document.referrer).hostname;
    if (host === window.location.hostname) return null;
    return sanitizeReferrerHost(host);
  } catch {
    return null;
  }
}

function readDevice(): DeviceKind | null {
  const width = window.innerWidth;
  const kind = width < 768 ? "phone" : width < 1024 ? "tablet" : "desktop";
  return isDeviceKind(kind) ? kind : null;
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
