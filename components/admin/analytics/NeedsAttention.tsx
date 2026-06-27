"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import type { AnalyticsAlert } from "@/lib/analytics/types";

interface NeedsAttentionProps {
  alerts: AnalyticsAlert[];
}

export function NeedsAttention({ alerts }: NeedsAttentionProps) {
  const actionable = alerts.filter((a) => a.severity === "warning");

  if (actionable.length === 0) {
    return (
      <section className="flex items-center gap-4 rounded-3xl bg-emerald-50 px-6 py-5 ring-1 ring-emerald-200/60">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="size-6" />
        </span>
        <div>
          <p className="font-semibold text-emerald-950">All caught up</p>
          <p className="text-sm text-emerald-800">Nothing needs your attention right now.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-amber-50 p-5 ring-1 ring-amber-200/60 md:p-6">
      <h3 className="text-lg font-semibold text-amber-950">Needs Attention</h3>
      <ul className="mt-4 space-y-3">
        {actionable.map((alert) => (
          <li key={alert.id}>
            <Link
              href="/admin"
              className="group flex items-center justify-between gap-4 rounded-2xl bg-offwhite/80 px-4 py-4 transition-shadow hover:shadow-sm"
            >
              <p className="text-sm font-medium text-amber-950">{alert.message}</p>
              <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-ink-muted group-hover:text-ink">
                View agenda
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
