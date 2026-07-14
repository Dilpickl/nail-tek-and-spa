"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

import {
  areNotificationAlertsEnabled,
  setNotificationAlertsEnabled,
} from "@/lib/admin/notification-preferences";
import { cn } from "@/lib/utils";

export function SettingsDashboard() {
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAlertsEnabled(areNotificationAlertsEnabled());
    setReady(true);
  }, []);

  function handleToggle(checked: boolean) {
    setAlertsEnabled(checked);
    setNotificationAlertsEnabled(checked);
  }

  return (
    <div className="container py-8 md:py-10">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
          Admin
        </p>
        <h1 className="mt-2 text-4xl font-semibold text-ink">Settings</h1>
        <p className="mt-2 max-w-xl text-ink-muted">
          Preferences for this device.
        </p>
      </div>

      <div className="mt-10 max-w-xl">
        <div className="flex items-start justify-between gap-6 rounded-2xl bg-offwhite p-6 ring-1 ring-ink/5">
          <div className="flex gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary">
              <Bell className="size-5 text-ink" />
            </span>
            <div>
              <p className="text-lg font-semibold text-ink">Notification alerts</p>
              <p className="mt-1 text-sm text-ink-muted">
                Highlight new bookings on the agenda when they come in.
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={alertsEnabled}
            aria-label="Notification alerts"
            disabled={!ready}
            onClick={() => handleToggle(!alertsEnabled)}
            className={cn(
              "relative mt-1 h-8 w-14 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50",
              alertsEnabled ? "bg-ink" : "bg-ink/20"
            )}
          >
            <span
              className={cn(
                "absolute top-1 left-1 size-6 rounded-full bg-offwhite shadow-sm transition-transform",
                alertsEnabled && "translate-x-6"
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
