"use client";

import { useEffect } from "react";

import {
  playBookingAlertSound,
  unlockBookingAlertSound,
} from "@/lib/admin/alert-sound";

/**
 * Plays the booking alert when a push arrives while any admin page is open,
 * and unlocks iOS audio on the first user tap.
 */
export function AdminAlertSoundListener() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

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
