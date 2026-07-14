"use client";

import { AdminPushPrompt } from "@/components/admin/AdminPushPrompt";

export function SettingsDashboard() {
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
        <AdminPushPrompt />
      </div>
    </div>
  );
}
