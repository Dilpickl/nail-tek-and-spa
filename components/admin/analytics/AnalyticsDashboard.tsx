"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { AnalyticsDatePicker } from "@/components/admin/analytics/AnalyticsDatePicker";
import { FullReportSection } from "@/components/admin/analytics/FullReportSection";
import { HeroStats } from "@/components/admin/analytics/HeroStats";
import { NeedsAttention } from "@/components/admin/analytics/NeedsAttention";
import { RevenueTrendChart } from "@/components/admin/analytics/RevenueTrendChart";
import type { DateRangePreset } from "@/lib/analytics/date-ranges";
import type { AnalyticsResponse } from "@/lib/analytics/types";

export function AnalyticsDashboard() {
  const [preset, setPreset] = useState<DateRangePreset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [fullReportOpen, setFullReportOpen] = useState(false);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams({ preset });
    if (preset === "custom") {
      if (!customFrom || !customTo) {
        setLoading(false);
        return;
      }
      params.set("from", customFrom);
      params.set("to", customTo);
    }

    try {
      const response = await fetch(`/api/admin/analytics?${params.toString()}`);
      const body = (await response.json()) as AnalyticsResponse & { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to load analytics.");
      setData(body);
    } catch (err) {
      setError((err as Error).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [preset, customFrom, customTo]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return (
    <div className="container max-w-4xl py-8 md:py-10">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
          Your Business
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold text-ink md:text-5xl">
          How&apos;s it going?
        </h1>
        {data && (
          <p className="mt-2 text-ink-muted">
            A quick snapshot for <span className="font-medium text-ink">{data.range.label}</span>
          </p>
        )}
      </header>

      <AnalyticsDatePicker
        preset={preset}
        customFrom={customFrom}
        customTo={customTo}
        showExtended={fullReportOpen}
        onPresetChange={setPreset}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
      />

      {loading && (
        <div className="mt-16 flex items-center justify-center gap-2 text-ink-muted">
          <Loader2 className="size-5 animate-spin" />
          Loading your numbers…
        </div>
      )}

      {error && (
        <p className="mt-8 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-700">{error}</p>
      )}

      {data && !loading && (
        <div className="mt-8 space-y-6">
          <HeroStats kpis={data.kpis} periodLabel={data.range.label} />

          <RevenueTrendChart data={data.revenueTrend} />

          <NeedsAttention alerts={data.alerts} />

          <FullReportSection
            data={data}
            onOpenChange={setFullReportOpen}
          />
        </div>
      )}
    </div>
  );
}
