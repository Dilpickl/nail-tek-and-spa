"use client";

import { useEffect } from "react";

import {
  playBookingAlertSound,
  unlockBookingAlertSound,
} from "@/lib/admin/alert-sound";

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

/**
 * Keep the admin push subscription alive on iOS:
 * - Re-register the service worker on every admin page load
 * - Re-upsert an existing PushManager subscription to the server
 *   (iOS can drop server-side rows after 410s / ITP / app offloads)
 */
async function syncPushSubscription() {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  try {
    const registration = await registerServiceWorker();
    await navigator.serviceWorker.ready;
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    await fetch("/api/admin/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });
  } catch {
    /* Best-effort — do not block admin UI. */
  }
}

/**
 * Plays the booking alert when a push arrives while any admin page is open,
 * and unlocks iOS audio on the first user tap.
 */
export function AdminAlertSoundListener() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void syncPushSubscription();

    function onMessage(event: MessageEvent) {
      if (event.data?.type === "PLAY_BOOKING_ALERT") {
        void playBookingAlertSound();
      }
    }

    navigator.serviceWorker.addEventListener("message", onMessage);

    function unlockOnGesture() {
      void unlockBookingAlertSound();
      window.removeEventListener("pointerdown", unlockOnGesture);
      window.removeEventListener("touchstart", unlockOnGesture);
    }

    window.addEventListener("pointerdown", unlockOnGesture, { once: true });
    window.addEventListener("touchstart", unlockOnGesture, { once: true });

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      window.removeEventListener("pointerdown", unlockOnGesture);
      window.removeEventListener("touchstart", unlockOnGesture);
    };
  }, []);

  return null;
}
