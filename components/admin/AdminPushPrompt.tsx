"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, BellOff, CheckCircle2, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";

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

export function AdminPushPrompt() {
  const pathname = usePathname();
  const [permission, setPermission] = useState<PermissionState>("loading");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (pathname === "/admin/login") return;

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
  }, [pathname]);

  if (pathname === "/admin/login") {
    return null;
  }

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

  if (permission === "loading" || permission === "unsupported") {
    return null;
  }

  return (
    <div className="border-b border-ink/10 bg-secondary/60">
      <div className="container flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-offwhite text-ink ring-1 ring-ink/10">
            <Smartphone className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">
              {subscribed ? "iPhone / iPad alerts on" : "Enable booking alerts"}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {subscribed
                ? "You’ll get a notification for new bookings and 5 minutes before each appointment."
                : "Add this admin site to your Home Screen, then enable alerts for new bookings and upcoming appointments."}
            </p>
            {message ? (
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-ink-soft">
                <CheckCircle2 className="size-3.5" />
                {message}
              </p>
            ) : null}
          </div>
        </div>

        {subscribed ? (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void disableNotifications()}
            className="shrink-0"
          >
            <BellOff className="size-4" />
            Turn off
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={busy || !vapidPublicKey}
            onClick={() => void enableNotifications()}
            className="shrink-0"
          >
            <Bell className="size-4" />
            Enable alerts
          </Button>
        )}
      </div>
    </div>
  );
}
