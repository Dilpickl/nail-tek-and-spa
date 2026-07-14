"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Smartphone } from "lucide-react";

import { cn } from "@/lib/utils";

type PermissionState = NotificationPermission | "unsupported" | "loading";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

/** Push notification enable/disable — for Settings only (not a global banner). */
export function AdminPushPrompt() {
  const [permission, setPermission] = useState<PermissionState>("loading");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (
        typeof window === "undefined" ||
        !("Notification" in window) ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        if (!cancelled) setPermission("unsupported");
        return;
      }

      if (!cancelled) setPermission(Notification.permission);

      try {
        const registration = await registerServiceWorker();
        const existing = await registration?.pushManager.getSubscription();
        if (!cancelled) setSubscribed(Boolean(existing));
      } catch {
        /* ignore */
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enableNotifications() {
    if (!vapidPublicKey) {
      setMessage("Push keys are not configured on the server yet.");
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== "granted") {
        setMessage("Notifications were blocked. Enable them in iOS Settings → Nail Tek.");
        return;
      }

      const registration = await registerServiceWorker();
      if (!registration) {
        setMessage("Service worker is not available in this browser.");
        return;
      }

      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const response = await fetch("/api/admin/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Unable to save subscription.");
      }

      setSubscribed(true);
      setMessage("Notifications enabled on this device.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "Unable to enable notifications."
      );
    } finally {
      setBusy(false);
    }
  }

  async function disableNotifications() {
    setBusy(true);
    setMessage(null);

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/admin/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      setMessage("Notifications turned off on this device.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to disable notifications."
      );
    } finally {
      setBusy(false);
    }
  }

  if (permission === "loading") {
    return (
      <div className="rounded-2xl bg-offwhite p-6 ring-1 ring-ink/5">
        <p className="text-sm text-ink-muted">Checking notification support…</p>
      </div>
    );
  }

  if (permission === "unsupported") {
    return (
      <div className="rounded-2xl bg-offwhite p-6 ring-1 ring-ink/5">
        <div className="flex gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary">
            <Smartphone className="size-5 text-ink" />
          </span>
          <div>
            <p className="text-lg font-semibold text-ink">Notification alerts</p>
            <p className="mt-1 text-sm text-ink-muted">
              Push alerts need Safari on iPhone or iPad with this site added to the Home
              Screen.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-offwhite p-6 ring-1 ring-ink/5">
      <div className="flex items-start justify-between gap-6">
        <div className="flex gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary">
            <Smartphone className="size-5 text-ink" />
          </span>
          <div>
            <p className="text-lg font-semibold text-ink">Notification alerts</p>
            <p className="mt-1 text-sm text-ink-muted">
              {subscribed
                ? "You’ll get a notification for new bookings and 5 minutes before each appointment."
                : "Add this admin site to your Home Screen, then enable alerts for new bookings and upcoming appointments."}
            </p>
            {message ? (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-soft">
                <CheckCircle2 className="size-3.5" />
                {message}
              </p>
            ) : null}
            {!vapidPublicKey ? (
              <p className="mt-2 text-xs text-ink-muted">
                Push keys are not configured on the server yet.
              </p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={subscribed}
          aria-label="Notification alerts"
          disabled={busy || (!subscribed && !vapidPublicKey)}
          onClick={() =>
            void (subscribed ? disableNotifications() : enableNotifications())
          }
          className={cn(
            "relative mt-1 h-8 w-14 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50",
            subscribed ? "bg-ink" : "bg-ink/20"
          )}
        >
          <span
            className={cn(
              "absolute top-1 left-1 size-6 rounded-full bg-offwhite shadow-sm transition-transform",
              subscribed && "translate-x-6"
            )}
          />
        </button>
      </div>
    </div>
  );
}
