"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AnalyticsResponse } from "@/lib/analytics/types";
import { formatMoney } from "@/lib/utils";

const CHART_COLORS = ["#111111", "#6B6B66", "#E0D5BB", "#2A2A2A", "#EDE6D3"];

interface DetailedChartsProps {
  data: AnalyticsResponse;
}

export function DetailedCharts({ data }: DetailedChartsProps) {
  const revenueBreakdown = data.revenueBreakdown.filter(
    (item) =>
      item.amount > 0 &&
      item.category !== "Gift Cards" &&
      item.category !== "Deposits"
  );
  const paymentWithAmount = data.paymentMethods.filter((p) => p.amount > 0);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ChartCard title="Where the Money Came From">
        {revenueBreakdown.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={revenueBreakdown}
                dataKey="amount"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
              >
                {revenueBreakdown.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message="No revenue data for this period." />
        )}
      </ChartCard>

      <ChartCard title="When You're Busiest">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.appointmentsByHour}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0D5BB" vertical={false} />
            <XAxis
              dataKey="hour"
              tickFormatter={(h) => `${h}:00`}
              tick={{ fontSize: 11, fill: "#6B6B66" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#6B6B66" }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip labelFormatter={(h) => `${h}:00`} />
            <Bar dataKey="count" fill="#111111" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Busiest Days">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.busyDays}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0D5BB" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: "#6B6B66" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(d) => d.slice(0, 3)}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#6B6B66" }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Bar dataKey="count" fill="#2A2A2A" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="How Clients Paid">
        {paymentWithAmount.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={paymentWithAmount}
                dataKey="amount"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
              >
                {paymentWithAmount.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message="No payment data for this period." />
        )}
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-background p-5 ring-1 ring-ink/5">
      <h4 className="font-semibold text-ink">{title}</h4>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-ink-muted">
      {message}
    </div>
  );
}
