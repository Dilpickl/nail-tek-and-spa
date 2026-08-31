# Nail Tek & Spa

A production website and operations platform for a family-owned nail salon in Algonquin, Illinois. Customers can browse the menu, view work, and book online. Staff get an iPad-friendly admin app for walk-ins, schedules, checkout, and revenue.

This is a real business product, not a demo: availability, pricing, and analytics are modeled around how a salon actually runs.

**Live site:** [nail-tek-and-spa.vercel.app](https://nail-tek-and-spa.vercel.app)

## What it includes

**Customer site**
- Marketing home page, full service menu, and nail-art gallery
- Multi-step online booking: services, technician, date/time, details, confirm
- Multi-guest parties with per-person services and technician preferences
- Starting prices shown as estimates when the final amount is confirmed in person

**Admin operations (`/admin`)**
- Daily agenda with technician columns, drag-and-drop, and walk-in / phone booking
- Week/month calendar, employee schedules, and day-off exceptions
- Appointment completion with confirmed prices, tax, tips, and payment method
- Analytics from completed visits only (not unconfirmed online estimates)
- Installable PWA with web-push alerts for new bookings and upcoming appointments

## Tech stack

| Layer | Choice |
| --- | --- |
| App | Next.js 14 (App Router), React 18, TypeScript |
| UI | Tailwind CSS, Framer Motion, Lucide |
| Data | Supabase (PostgreSQL, Auth, Row Level Security) |
| Charts | Recharts |
| Push | Web Push / VAPID, installable admin PWA |
| Tests | Playwright |
| Hosting | Vercel |

## Architecture

```
┌──────────────┐     ┌─────────────────────┐     ┌────────────────┐
│ Public site  │────▶│ Next.js API routes  │────▶│ Supabase       │
│ /book        │     │ validation + auth   │     │ Postgres + RLS │
└──────────────┘     └──────────┬──────────┘     └────────────────┘
                                │
┌──────────────┐                │                ┌────────────────┐
│ Admin PWA    │────────────────┘                │ Web Push       │
│ /admin       │     cron → /api/cron/...  ─────▶│ iPad / phone   │
└──────────────┘                                 └────────────────┘
```

Online bookings never write straight from the browser to privileged tables. API routes validate services, duration, and availability, then persist with a server-side Supabase client. Admin routes require an authenticated user in `admin_users`.

## Design decisions worth discussing

**Estimates vs. actual revenue.** Acrylics, gel, and similar services are listed as "from" prices. Booking totals are estimates. Revenue, average ticket, and tips come from `completed_transactions` created at checkout, so analytics match money collected rather than what was booked online.

**Availability is layered.** Open slots come from recurring technician schedules, date-specific overrides, same-day off/sick blocks, and existing appointments. Times are computed in `America/Chicago` so Vercel's UTC runtime does not shift salon hours.

**Duration uses the conservative end of a range.** A classic pedicure may display as 20-30 minutes, but slot blocking uses the upper bound so back-to-back bookings do not overlap.

**Content stays in one file.** Menu, prices, hours, and marketing copy live in `lib/config/salonData.ts`. The public site maps over that data; bookable IDs stay aligned with the `services` table.

**History is not rewritten.** `appointment_services` stores price and duration at booking time. Completing a visit records the confirmed amounts separately.

## Project structure

```
app/                      Routes (public site, /book, /admin, API)
components/
  booking/                Multi-step customer booking flow
  admin/                  Agenda, calendar, employees, analytics, settings
  sections/               Home, services, gallery, reviews
lib/
  config/salonData.ts     Menu, prices, hours, copy
  booking/                Availability, party scheduling, timezone, pricing
  admin/                  Auth, push, appointment updates
  analytics/              Completed-visit reporting
supabase/                 Schema, migrations, seed
e2e/                      Playwright booking coverage
```

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Fill in `.env.local` with a Supabase project URL, anon key, and server-only service role key.

### Database

In the Supabase SQL editor:

1. Run `supabase/schema.sql`
2. Run migrations `002` through `010` in order
3. For a fresh environment, run `supabase/seed.sql`
4. Create an Auth user and insert that user into `admin_users`

Admin push also needs VAPID keys (`npm run generate:vapid`) and `CRON_SECRET`.

## Tests

```bash
npm run lint
npm run test:e2e
```

Playwright covers availability for multi-service and party bookings, plus the customer flow through the confirm step. It expects a running app and a configured Supabase project.

## License

Private project built for Nail Tek & Spa.
