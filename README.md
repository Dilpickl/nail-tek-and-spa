# Nail Tek & Spa

A premium website and booking management app for Nail Tek & Spa in Algonquin, IL.

**Stack:** Next.js (App Router) · React · Tailwind CSS · Framer Motion · Supabase · shadcn-style UI · Lucide icons.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase values
npm run dev
```

Open http://localhost:3000.

## Editing salon content (no code needed)

**All** business copy — services, prices, durations, technicians, hours,
contact info, careers, social links — lives in one file:

```
lib/config/salonData.ts
```

Change the text and numbers there and the whole site updates. Keep the
structure (the keys) intact.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run `supabase/schema.sql`, then migrations `002`–`007`, then `supabase/seed.sql` for a fresh environment.
3. Copy your Project URL + anon key into `.env.local` (see `.env.example`).

The schema covers `services`, `technicians`, `appointments`,
`appointment_services` (multi-service bookings), and `technician_time_off`
(the admin "Off / Out Sick" toggle), with Row Level Security configured.

## Project structure

```
app/                       Next.js routes
  page.tsx                 Home (hero, about, services, reviews, careers)
  services/                Full service menu
  book/                    Booking entry point (full engine: next phase)
  terms/ · privacy/        Auto-generated legal pages
components/
  layout/                  Header (sticky) + Footer (contact/hours/map)
  sections/                Hero, About, ServiceGallery, Reviews, Careers, ...
  ui/                      Reusable primitives (Button, Reveal)
lib/
  config/salonData.ts      SINGLE SOURCE OF TRUTH for all content
  supabase/                Browser + server clients
  utils.ts                 Helpers (cn, price/duration formatting)
supabase/                  schema.sql + seed.sql
```

## Roadmap (next phases)

- Multi-step booking engine (services → technician → date/time → details → confirm)
- Availability logic (service duration × technician schedule, 15-min blocks, "Any" tech)
- iPad-optimized admin dashboard (`/admin`): daily agenda, walk-in/phone bookings,
  new-booking notifications, technician off/sick toggle.

## Brand palette

- Background: warm beige `#F5F1E6`
- Containers: off-white `#FAFAFA`
- Typography & primary buttons: sharp black `#111111`
