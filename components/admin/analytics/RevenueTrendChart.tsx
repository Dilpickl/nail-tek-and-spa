"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TrendPoint } from "@/lib/analytics/types";
import { formatMoney } from "@/lib/utils";

interface RevenueTrendChartProps {
  data: TrendPoint[];
  title?: string;
  compact?: boolean;
}

export function RevenueTrendChart({
  data,
  title = "How You're Doing",
  compact = false,
}: RevenueTrendChartProps) {
  const hasRevenue = data.some((point) => point.value > 0);
  const height = compact ? 220 : 300;

  return (
    <section className="rounded-3xl bg-offwhite p-5 ring-1 ring-ink/5 md:p-6">
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-0.5 text-sm text-ink-muted">Completed sales over time</p>

      {hasRevenue ? (
        <div className="mt-5" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#111111" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#111111" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0D5BB" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#6B6B66" }}
                tickFormatter={(d) => formatShortDate(d)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6B6B66" }}
                tickFormatter={(v) => `$${v}`}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid rgba(17,17,17,0.08)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                }}
                formatter={(value) => [formatMoney(Number(value ?? 0)), "Revenue"]}
                labelFormatter={(label) => formatShortDate(String(label))}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#111111"
                strokeWidth={2.5}
                fill="url(#revenueFill)"
                dot={false}
                activeDot={{ r: 5, fill: "#111111" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div
          className="mt-5 flex items-center justify-center rounded-2xl bg-background text-sm text-ink-muted"
          style={{ height }}
        >
          No completed sales yet for this period.
        </div>
      )}
    </section>
  );
}

function formatShortDate(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}
