"use client";

import type { ReactNode } from "react";

import type { CountRow, SiteInsights as SiteInsightsData } from "@/lib/analytics/engagement";
import { getServiceById, getServiceParent } from "@/lib/config/salonData";

export function SiteInsights({ insights }: { insights: SiteInsightsData }) {
  const quiet =
    insights.measuredSessions === 0 &&
    insights.pages.length === 0 &&
    insights.funnel.every((step) => step.people === 0);

  return (
    <article className="rounded-3xl bg-offwhite p-6 ring-1 ring-ink/5 md:p-8">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
        How people use the site
      </p>
      <h2 className="mt-2 font-serif text-3xl font-semibold text-ink">Where to improve</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
        Pages, buttons, and the booking steps. A person who leaves after one page, or
        drops out of booking, is the part of the site to look at first.
      </p>

      {quiet ? (
        <p className="mt-5 text-sm text-ink-muted">
          These details show up with the next visit. Nothing is stored from before this
          tracking started.
        </p>
      ) : (
        <div className="mt-6 space-y-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="New visitors" value={String(insights.newVisitors)} />
            <Metric label="Returning" value={String(insights.returningVisitors)} />
            <Metric
              label="Left after one page"
              value={formatPercent(insights.bounceRate, insights.measuredSessions)}
              detail={
                insights.measuredSessions > 0
                  ? `${insights.bounceSessions} of ${insights.measuredSessions} visits`
                  : undefined
              }
            />
            <Metric
              label="Pages per visit"
              value={insights.measuredSessions === 0 ? "—" : String(insights.pagesPerVisit)}
            />
          </div>

          {insights.devices.length > 0 && (
            <Section title="Phones, tablets, and computers">
              <ul className="space-y-2">
                {insights.devices.map((device) => (
                  <li key={device.label} className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="text-ink">{device.label}</span>
                    <span className="text-ink-muted">
                      {device.visitors} {device.visitors === 1 ? "visitor" : "visitors"}
                      {" · "}
                      {formatPercent(device.conversionRate, device.visitors)} booked or called
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <div className="grid gap-8 lg:grid-cols-2">
            <Section title="Where visits start">
              <CountList
                rows={insights.sources}
                empty="No visits in this period."
                noun="visit"
              />
            </Section>
            <Section title="First page of the visit">
              <CountList rows={insights.landings} empty="No visits in this period." noun="visit" />
            </Section>
          </div>

          <Section title="Pages they open">
            {insights.pages.length === 0 ? (
              <p className="text-sm text-ink-muted">No page views in this period.</p>
            ) : (
              <ul className="space-y-2">
                {insights.pages.map((page) => (
                  <li key={page.path} className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="text-ink">{page.label}</span>
                    <span className="text-ink-muted">
                      {page.visitors} {page.visitors === 1 ? "person" : "people"} · {page.views}{" "}
                      {page.views === 1 ? "view" : "views"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Booking, step by step">
            {insights.biggestDrop && (
              <p className="mb-4 text-sm font-medium text-ink">
                The biggest drop is between {insights.biggestDrop.from} and {insights.biggestDrop.to}
                {" · "}
                {insights.biggestDrop.people}{" "}
                {insights.biggestDrop.people === 1 ? "person leaves" : "people leave"}.
              </p>
            )}
            <ol className="space-y-3">
              {insights.funnel.map((step) => (
                <li key={step.label}>
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="text-ink">{step.label}</span>
                    <span className="text-ink-muted">
                      {step.people} · {step.percentOfStart}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-sand">
                    <div
                      className="h-full rounded-full bg-ink"
                      style={{ width: `${step.percentOfStart}%` }}
                    />
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-ink-muted">
              Percent is of the people who started by choosing services.
            </p>
          </Section>

          <Section title="Buttons they tap">
            <CountList
              rows={insights.taps.map((tap) => ({
                label: friendlyTap(tap.placement, tap.label),
                value: tap.people,
              }))}
              empty="No call or booking buttons tapped in this period."
              noun="person"
            />
          </Section>
        </div>
      )}
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl bg-background px-4 py-3 ring-1 ring-ink/5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
      {detail && <p className="mt-1 text-xs text-ink-muted">{detail}</p>}
    </div>
  );
}

function CountList({ rows, empty, noun }: { rows: CountRow[]; empty: string; noun: string }) {
  if (rows.length === 0) return <p className="text-sm text-ink-muted">{empty}</p>;
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.label} className="flex items-baseline justify-between gap-4 text-sm">
          <span className="text-ink">{row.label}</span>
          <span className="text-ink-muted">
            {row.value} {row.value === 1 ? noun : `${noun}s`}
          </span>
        </li>
      ))}
    </ul>
  );
}

function formatPercent(rate: number, base: number): string {
  if (base === 0) return "—";
  const rounded = Math.round(rate * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

function friendlyTap(placement: string, fallback: string): string {
  if (!placement.startsWith("service:")) return fallback;
  const id = placement.slice("service:".length);
  const direct = getServiceById(id);
  if (direct) return `Book ${direct.name}`;
  const parent = getServiceParent(id);
  const variant = parent?.variants?.find((item) => item.id === id);
  if (parent && variant) return `Book ${parent.name} · ${variant.name}`;
  return fallback;
}
