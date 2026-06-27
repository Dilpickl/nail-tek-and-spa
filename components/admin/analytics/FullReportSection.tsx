"use client";

import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";

import { DetailedCharts } from "@/components/admin/analytics/DetailedCharts";
import type { AnalyticsResponse } from "@/lib/analytics/types";
import { formatMoney } from "@/lib/admin/format";
import { cn } from "@/lib/utils";

interface FullReportSectionProps {
  data: AnalyticsResponse;
  onOpenChange?: (open: boolean) => void;
}

export function FullReportSection({ data, onOpenChange }: FullReportSectionProps) {
  const [open, setOpen] = useState(false);
  const topStaff = data.staffPerformance.slice(0, 4);

  function toggleOpen() {
    setOpen((v) => {
      const next = !v;
      onOpenChange?.(next);
      return next;
    });
  }

  return (
    <section className="rounded-3xl bg-offwhite ring-1 ring-ink/5">
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-secondary/30 md:px-8 rounded-3xl"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-ink">
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="text-lg font-semibold text-ink">Full Report</p>
            <p className="text-sm text-ink-muted">
              Staff, services, finances, and scheduling details
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-ink-muted transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="space-y-6 border-t border-ink/8 px-6 pb-8 pt-6 md:px-8">
          <DetailedCharts data={data} />

          <div className="grid gap-5 lg:grid-cols-2">
            <StaffPanel staff={topStaff} />
            <ServicePanel services={data.mostBookedServices} />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <InsightCard
              title="New Clients"
              value={String(data.clientInsights.newClients)}
              subtitle="First-time visitors"
            />
            <InsightCard
              title="Returning Clients"
              value={String(data.clientInsights.returningClients)}
              subtitle="Came back again"
            />
            <InsightCard
              title="Chair Usage"
              value={`${data.scheduleUtilization.occupancyPercent.toFixed(0)}%`}
              subtitle={`${data.scheduleUtilization.bookedHours.toFixed(0)}h booked of ${data.scheduleUtilization.availableHours.toFixed(0)}h available`}
            />
          </div>

          <FinancialBreakdown data={data} />
        </div>
      )}
    </section>
  );
}

function StaffPanel({
  staff,
}: {
  staff: AnalyticsResponse["staffPerformance"];
}) {
  return (
    <section className="rounded-2xl bg-background p-5 ring-1 ring-ink/5">
      <h4 className="font-semibold text-ink">Team Performance</h4>
      {staff.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">No completed appointments yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {staff.map((row, index) => (
            <li
              key={row.technicianId}
              className="flex items-center justify-between gap-4 rounded-xl bg-offwhite px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-ink text-xs font-bold text-offwhite">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-ink">{row.technicianName}</p>
                  <p className="text-xs text-ink-muted">
                    {row.completedCount} completed
                  </p>
                </div>
              </div>
              <p className="font-semibold text-ink">{formatMoney(row.revenue)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ServicePanel({
  services,
}: {
  services: AnalyticsResponse["mostBookedServices"];
}) {
  return (
    <section className="rounded-2xl bg-background p-5 ring-1 ring-ink/5">
      <h4 className="font-semibold text-ink">Popular Services</h4>
      {services.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">No bookings in this period.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {services.map((item, index) => (
            <li
              key={item.serviceId}
              className="flex items-center justify-between rounded-xl bg-offwhite px-4 py-2.5 text-sm"
            >
              <span className="text-ink">
                <span className="mr-2 text-ink-muted">{index + 1}.</span>
                {item.name}
              </span>
              <span className="font-semibold text-ink-muted">{item.count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function InsightCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <article className="rounded-2xl bg-background p-5 ring-1 ring-ink/5">
      <p className="text-xs font-medium uppercase tracking-[0.15em] text-ink-muted">
        {title}
      </p>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
    </article>
  );
}

function FinancialBreakdown({ data }: { data: AnalyticsResponse }) {
  const f = data.financialSummary;

  return (
    <section className="rounded-2xl bg-background p-5 ring-1 ring-ink/5">
      <h4 className="font-semibold text-ink">Financial Breakdown</h4>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <FinCell label="Gross Sales" value={f.grossSales} />
        <FinCell label="Tips" value={f.tips} />
        <FinCell label="Taxes" value={f.taxes} />
        <FinCell label="Discounts" value={f.discounts} negative />
        <FinCell label="Refunds" value={f.refunds} negative />
        <FinCell label="Net Revenue" value={f.netRevenue} highlight />
      </div>
    </section>
  );
}

function FinCell({
  label,
  value,
  negative,
  highlight,
}: {
  label: string;
  value: number;
  negative?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl px-4 py-3",
        highlight ? "bg-ink text-offwhite sm:col-span-2 lg:col-span-1" : "bg-offwhite"
      )}
    >
      <p className={cn("text-xs font-medium", highlight ? "text-offwhite/70" : "text-ink-muted")}>
        {label}
      </p>
      <p className={cn("mt-1 text-lg font-semibold", highlight ? "text-offwhite" : "text-ink")}>
        {negative && value > 0 ? "−" : ""}
        {formatMoney(value)}
      </p>
    </div>
  );
}
