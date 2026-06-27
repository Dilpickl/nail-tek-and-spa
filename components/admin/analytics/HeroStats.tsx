"use client";

import { DollarSign, Receipt, Users, XCircle } from "lucide-react";

import type { AnalyticsKpis } from "@/lib/analytics/types";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface HeroStatsProps {
  kpis: AnalyticsKpis;
  periodLabel: string;
}

export function HeroStats({ kpis, periodLabel }: HeroStatsProps) {
  const problems = kpis.cancellations + kpis.noShows;
  const hasProblems = problems > 0;

  return (
    <div className="space-y-4">
      <article className="relative overflow-hidden rounded-3xl bg-ink p-6 text-offwhite shadow-lg md:p-8">
        <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-offwhite/5" />
        <div className="pointer-events-none absolute -bottom-12 -left-6 size-32 rounded-full bg-offwhite/5" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-offwhite/60">
              <DollarSign className="size-4" />
              <p className="text-xs font-medium uppercase tracking-[0.2em]">Money Made</p>
            </div>
            <p className="mt-3 font-serif text-5xl font-semibold tracking-tight md:text-6xl">
              {formatMoney(kpis.grossRevenue)}
            </p>
            <p className="mt-2 text-sm text-offwhite/70">
              {kpis.completedAppointments}{" "}
              {kpis.completedAppointments === 1 ? "client served" : "clients served"} ·{" "}
              {periodLabel}
            </p>
          </div>

          <div className="flex gap-3">
            <MiniStat
              icon={Users}
              label="Completed"
              value={String(kpis.completedAppointments)}
              inverted
            />
            <MiniStat
              icon={Receipt}
              label="Avg Visit"
              value={formatMoney(kpis.averageTicket)}
              inverted
            />
          </div>
        </div>
      </article>

      <div
        className={cn(
          "grid gap-4",
          hasProblems ? "sm:grid-cols-2" : "sm:grid-cols-1"
        )}
      >
        {!hasProblems ? (
          <article className="rounded-2xl bg-offwhite px-5 py-4 ring-1 ring-ink/5">
            <p className="text-sm text-ink-muted">
              No cancellations or no-shows in this period.
            </p>
          </article>
        ) : (
          <>
            {kpis.noShows > 0 && (
              <ProblemCard label="No-Shows" count={kpis.noShows} />
            )}
            {kpis.cancellations > 0 && (
              <ProblemCard label="Cancellations" count={kpis.cancellations} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  inverted,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  inverted?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl px-4 py-3",
        inverted ? "bg-offwhite/10" : "bg-offwhite ring-1 ring-ink/5"
      )}
    >
      <div className={cn("flex items-center gap-1.5", inverted ? "text-offwhite/60" : "text-ink-muted")}>
        <Icon className="size-3.5" />
        <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className={cn("mt-1 text-xl font-semibold", inverted ? "text-offwhite" : "text-ink")}>
        {value}
      </p>
    </div>
  );
}

function ProblemCard({ label, count }: { label: string; count: number }) {
  return (
    <article className="flex items-center gap-4 rounded-2xl bg-amber-50 px-5 py-4 ring-1 ring-amber-200/60">
      <span className="flex size-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
        <XCircle className="size-5" />
      </span>
      <div>
        <p className="text-2xl font-semibold text-amber-950">{count}</p>
        <p className="text-sm text-amber-800">{label}</p>
      </div>
    </article>
  );
}
