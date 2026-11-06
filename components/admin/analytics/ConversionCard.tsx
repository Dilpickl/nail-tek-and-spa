"use client";

import { Phone, CalendarCheck, Users } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { WebsiteConversion } from "@/lib/analytics/types";

interface ConversionCardProps {
  conversion: WebsiteConversion;
  /** Inclusive range end, YYYY-MM-DD, from the analytics date picker. */
  rangeTo: string;
}

export function ConversionCard({ conversion, rangeTo }: ConversionCardProps) {
  if (!conversion.available) {
    return (
      <article className="rounded-3xl bg-offwhite p-6 ring-1 ring-ink/5 md:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
          Website conversion
        </p>
        <h2 className="mt-2 font-serif text-3xl font-semibold text-ink">
          Ready once the database is updated
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">
          Run the one-time update in{" "}
          <span className="font-medium text-ink">supabase/migrations/013_website_conversion.sql</span>{" "}
          in the Supabase SQL editor. After that, visitors, online bookings, and
          taps on the phone number are saved here for any date range — not just
          the last 30 days Vercel keeps.
        </p>
      </article>
    );
  }

  const startedLabel = formatStarted(conversion.trackingStartedAt);
  const rangeEndsBeforeTracking =
    conversion.trackingStartedAt !== null &&
    rangeTo < conversion.trackingStartedAt.slice(0, 10);
  const showChart = conversion.trend.some(
    (day) => day.visitors > 0 || day.calls > 0 || day.bookings > 0
  );

  return (
    <article className="rounded-3xl bg-offwhite p-6 ring-1 ring-ink/5 md:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
            Website conversion
          </p>
          <p className="mt-2 font-serif text-5xl font-semibold tracking-tight text-ink md:text-6xl">
            {formatRate(conversion.conversionRate, conversion.uniqueVisitors, conversion.conversions)}
          </p>
          <p className="mt-2 max-w-md text-sm text-ink-muted">
            of visitors booked online or tapped Call. Each person counts once.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Stat icon={Users} label="Visitors" value={conversion.uniqueVisitors} />
          <Stat icon={CalendarCheck} label="Booked" value={conversion.onlineBookings} />
          <Stat icon={Phone} label="Called" value={conversion.callers} />
        </div>
      </div>

      {showChart && (
        <div className="mt-6 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={conversion.trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#E8E0D6" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDayLabel}
                tick={{ fill: "#6B6B66", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                minTickGap={28}
              />
              <YAxis
                allowDecimals={false}
                width={32}
                tick={{ fill: "#6B6B66", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                labelFormatter={(label) => formatDayLabel(String(label))}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #E8E0D6",
                  fontSize: 13,
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
              <Line
                type="monotone"
                dataKey="visitors"
                name="Visitors"
                stroke="#111111"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="bookings"
                name="Booked online"
                stroke="#C7826F"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="calls"
                name="Called"
                stroke="#6B6B66"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-5 space-y-2 text-sm leading-relaxed text-ink-muted">
        {rangeEndsBeforeTracking && startedLabel ? (
          <p>Visit tracking started {startedLabel}. This period is earlier, so there is nothing to compare yet.</p>
        ) : conversion.uniqueVisitors === 0 ? (
          <p>
            Visits start counting with the next person who opens the site. The history stays in
            your database, with no 30-day cutoff.
          </p>
        ) : (
          <p>
            {conversion.pageviews.toLocaleString("en-US")} page views
            {conversion.callTaps > conversion.callers
              ? ` · ${conversion.callTaps.toLocaleString("en-US")} call taps from ${conversion.callers.toLocaleString("en-US")} people`
              : ""}
            . A call is a tap on the phone number. The call itself happens on their phone, so a
            tap is the success we can measure.
            {startedLabel
              ? ` Booked and Called start on ${startedLabel}. Older appointments stay in the rest of this page.`
              : ""}
          </p>
        )}
        {conversion.unattributedBookings > 0 && (
          <p>
            {conversion.unattributedBookings.toLocaleString("en-US")} online{" "}
            {conversion.unattributedBookings === 1 ? "booking was" : "bookings were"} not tied to
            a measured visit, so {conversion.unattributedBookings === 1 ? "it is" : "they are"} left
            out of the percentage.
          </p>
        )}
        {conversion.phoneAppointments > 0 && (
          <p>
            {conversion.phoneAppointments.toLocaleString("en-US")} phone{" "}
            {conversion.phoneAppointments === 1 ? "appointment was" : "appointments were"} typed in
            at the front desk. Those are real bookings, and they are separate from this percentage
            because they are not tied to a site visit.
          </p>
        )}
      </div>
    </article>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl bg-background px-3 py-3 ring-1 ring-ink/5 sm:px-4">
      <div className="flex items-center gap-1.5 text-ink-muted">
        <Icon className="size-3.5" />
        <p className="text-[11px] font-medium uppercase tracking-wide sm:text-xs">{label}</p>
      </div>
      <p className="mt-1 text-xl font-semibold text-ink">{value.toLocaleString("en-US")}</p>
    </div>
  );
}

function formatRate(rate: number, visitors: number, conversions: number): string {
  if (visitors === 0 && conversions === 0) return "—";
  const rounded = Math.round(rate * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

function formatDayLabel(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function formatStarted(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  });
}
