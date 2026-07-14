# Nail Tek & Spa — AI Handoff / Context Refresh

> **Purpose:** Give the next Cursor AI session everything needed to continue work without re-discovering the codebase.  
> **Last updated:** July 14, 2026  
> **Repo:** https://github.com/Dilpickl/nail-tek-and-spa  
> **Local path:** `C:\Users\dangi\Projects\nail-tek-and-spa`

---

## 1. What This Project Is

A **Next.js salon website + booking engine + iPad-friendly admin operations dashboard** for Nail Tek & Spa in Algonquin, IL — premium nail care at affordable prices.

**Core goals:**
- High customer conversion (easy mobile booking)
- Premium aesthetic (warm beige, off-white, sharp black — *not* loud pink/gold)
- Simple admin for a non-tech-savvy owner
- **Revenue only from completed appointments** — bookings are estimates; analytics use `completed_transactions`
- Admin iOS Home Screen web push for new bookings + 5-minute-before reminders

---

## 2. Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 App Router, React 18, TypeScript |
| Styling | Tailwind CSS, shadcn-style tokens in `app/globals.css` |
| Animation | Framer Motion (customer site sections + scroll reveals) |
| Icons | Lucide React |
| Database / Auth | Supabase (PostgreSQL, RLS, email/password auth) |
| Hosting | **Vercel** (production, GitHub auto-deploy on `master`) |
| Charts | **Recharts** (`recharts` in `package.json`) |
| Web push | **web-push** (admin iOS/Android PWA notifications) |
| E2E tests | **Playwright** (`@playwright/test`, `npm run test:e2e`) |

---

## 3. Environment & Supabase

### Local env (gitignored)
File: `.env.local` (exists locally, never committed)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...   # server-only, never expose to browser

# Admin web push (iOS Home Screen PWA)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:Nailtekandspa52018@yahoo.com

# Protects GET /api/cron/appointment-reminders
CRON_SECRET=generate-a-long-random-string
```

Template: `.env.example`  
Generate VAPID keys: `npm run generate:vapid` (from repo root after `npm install`)

### Vercel env (production)
Set in **Vercel → Project → Settings → Environment Variables** (Production + Preview):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `CRON_SECRET`

Redeploy after adding/changing env vars.

**Production URL:** https://nail-tek-and-spa.vercel.app  
**Vercel project:** `dylpicklemcshmickle/nail-tek-and-spa` (connected to GitHub `master`)

### Supabase setup (required for live booking/admin)
1. Run `supabase/schema.sql` in Supabase SQL Editor
2. Run `supabase/migrations/002_completion_analytics.sql`
3. Run `supabase/migrations/003_any_technician.sql`
4. Run `supabase/migrations/004_anon_any_technician_grant.sql`
5. Run `supabase/migrations/005_technician_schedules.sql`
6. Run `supabase/migrations/006_service_variants_and_overrides.sql`
7. Run `supabase/migrations/007_real_salon_catalog.sql` (**required for production** — real menu + staff)
8. Run `supabase/migrations/008_remove_legacy_technicians.sql` (removes old seed staff: Linh, Maria, James, Amy)
9. Run `supabase/migrations/009_remove_princess_deluxe_pedicures.sql` (soft-deactivates Princess + Deluxe)
10. Run `supabase/migrations/010_push_subscriptions.sql` (**required for admin push**)
11. Run `supabase/seed.sql` (dev/staging only — not needed if 007 applied on prod; keep in sync with catalog)
12. Create auth user: Dashboard → Authentication → Users → Add user
13. Grant admin:
   ```sql
   insert into public.admin_users (user_id, email)
   values ('USER-UUID-FROM-AUTH', 'owner@email.com');
   ```
14. Supabase Auth → URL Configuration: add Vercel domain redirect URLs (e.g. `https://nail-tek-and-spa.vercel.app/**`)

### Security model (important)
- **Anon key** is public (browser-safe)
- **Service role key** is server-only (`lib/supabase/admin.ts`)
- Online bookings go through **Next.js API routes** with server validation
- Admin access gated by `admin_users` table + `private.is_admin()` RLS function
- **Rotate** the service role key if it was ever pasted in chat

---

## 4. Git State

| Item | Value |
|------|-------|
| Branch | `master` (tracks `origin/master`) |
| Remote | `https://github.com/Dilpickl/nail-tek-and-spa.git` |
| HEAD | `2f6f7a1` — Merge PR #16 Update Pink & White starting prices |

### Recent work (July 10–14, 2026)

**Customer mobile / homepage**
- Horizontal swipe carousels on phone for About, Services, Gallery, Reviews (shared `.h-scroll` utilities)
- Services carousel ends with “See all / Open full menu”; Gallery keeps “See all looks”
- Footer Terms / Privacy / copyright centered on phone
- Hero: removed Crystal Lake badge; tightened mobile top padding
- Scroll reveal animations restored / polished (`components/ui/reveal.tsx`)
- Reviews order: Jozie T. → Mary → Julie T. → Iris → Samantha F.; Mary’s testimony shortened (Jul 13)
- Attempted Read-more for Mary caused carousel wobble — **reverted** to simple stretch + static `line-clamp-9` on mobile

**Catalog / pricing / durations**
- Duration ranges: Classic pedi 20–30, Luxury 30–40, Organic 45–60, Volcanic 60, Eyelash services 15
- **Booking blocks the upper end** of any range (`durationMinutes`); `durationMinutesMin` is display-only
- Removed **Princess** + **Deluxe** pedicures (migration 009 soft-deactivates DB rows)
- Removed **Eyebrows & Lips** combo; wax prices: Eyebrows $10, Chin $10, Under Arms $30
- **From pricing** on Acrylic, Gel, Pink & White, Gel Powder, Dipping, Lash Extensions (+ fills)
- Pink & White: Full **From $55**; Fill-In + Pink Fill **From $45**
- Admin completion requires confirm/update of every “From” price before checkout

**Admin**
- Walk-in Start Time: compact overlay picker; full half-column width (iPad alignment)
- Walk-in / phone booking services default to empty selection
- Demo seed: `npm run seed:demo` (`scripts/seed-demo-bookings.mjs`)
- **iOS Home Screen web push** (PR #12): new-booking + 5-min-before reminders
  - PWA manifest + icons + `public/sw.js`
  - Admin banner: Enable alerts (`AdminPushPrompt`)
  - Tables: `push_subscriptions`, `appointment_reminder_sends` (migration 010)
  - Cron endpoint: `GET /api/cron/appointment-reminders` (Bearer `CRON_SECRET`)
  - Vercel Hobby cannot run every-minute crons — use external cron (cron-job.org etc.)

**Current focus (next session):**
1. Confirm migrations **009** + **010** applied on production Supabase
2. Set Vercel VAPID + `CRON_SECRET` env vars; redeploy; enable Home Screen alerts on owner iPad
3. Point an every-minute external cron at `/api/cron/appointment-reminders`
4. Smoke-test From-price completion flow + updated Pink & White prices on live site

---

## 5. Design & Content Decisions

### Visual direction
- Premium warm-beige/serif aesthetic (not the brief trendy redesign that was reverted)
- Brand story: Algonquin location, premium affordable care, custom nail art, walk-ins + gift cards — not a decades-established claim
- Admin uses **Agenda | Calendar | Employees | Analytics** nav; customer site uses Header/Footer via `SiteChrome` (admin routes hide site chrome)
- Admin login heading: **"Hello, Travis."**
- **Complete Appointment** button uses emerald green (`emerald-700`), not black primary
- Homepage mobile: prefer horizontal swipe over long vertical card stacks

### Brand palette
- Background: warm beige `#F5F1E6` / `--background`
- Cards: off-white `#FAFAFA`
- Typography & primary buttons: sharp black `#111111`
- Fonts: Inter (body) + Cormorant Garamond (headings)

### Data sources
- **`lib/config/salonData.ts`** — services, prices, durations (incl. ranges), salon-wide hours, retail, careers, testimonials, Google/Facebook review stats. Static `technicians[]` is a **marketing mirror only** — operational roster/roles come from Supabase.
- **Public contact:** `(847) 458-4560` · `Nailtekandspa52018@yahoo.com` · 2403 W Algonquin Road, Algonquin, IL 60102
- **`technicians` + schedules + overrides (Supabase)** — who works when; Employees tab CRUD
- **`services` table (Supabase)** — must stay in sync with bookable IDs from `salonData.ts` / migrations for online booking FK validation
- **Pricing flags:** `priceFrom` → display “From $X” + admin must confirm at completion; `pricingTbd` → “Priced at visit” (nail art)

---

## 6. What's Built Today

### Customer-facing site
| Route | Description |
|-------|-------------|
| `/` | Home: Hero, About, NailGallery, ServiceGallery, Reviews, Careers |
| `/services` | Full service menu with “Book This” links |
| `/gallery` | Full nail art gallery |
| `/book` | Multi-step booking flow |
| `/terms`, `/privacy` | Legal pages |

**Homepage mobile UX:** About / Services / Gallery / Reviews use horizontal snap scrollers (`.h-scroll` in `globals.css`). Desktop keeps grids.

### Booking engine (`/book`)
**Component:** `components/booking/BookingFlow.tsx`

5 steps: Services → Technician(s) → Date & Time → Details → Confirm

**Duration ranges:** menu may show e.g. `20–30 min`; **slot blocking always uses `durationMinutes` (max)**.

**From / TBD pricing:** booking totals show “From $X” when applicable; copy explains final price confirmed in person.

**Technician list:** from DB via `/book` server props (`getActiveTechnicians()`).

**Availability model (three layers):**
1. Recurring `technician_schedules`
2. Date overrides `technician_schedule_overrides` (ranges supported)
3. Same-day `technician_time_off` (Agenda Off/Sick)

**Nail art:** multi-select variants; `pricingTbd`; estimated_total excludes TBD at booking.

**Multi-guest:** per-guest services + tech prefs; no duplicate specific tech; Any stays unassigned; N appointment rows with `party_group_id`.

**Timezone:** all salon times `America/Chicago` via `lib/booking/time-utils.ts` (critical on Vercel UTC).

**APIs:** `GET /api/availability`, `GET /api/technicians`, `POST /api/appointments` (also fires admin push on success).

### Admin (`/admin`)
**Auth:** `/admin/login` → must be in `admin_users`

**Nav:** Agenda | Calendar | Employees | Analytics  
**Push banner:** `AdminPushPrompt` under nav (hidden on login) — Enable alerts for Home Screen PWA

**Agenda:** day nav, Any + tech columns, DnD, walk-in / phone quick booking, Off/Sick, clickable still-booked badge, realtime new-booking highlight + push deep-link `?date=&highlight=`

**Walk-in / phone quick booking:** services start empty; Start Time uses compact overlay control (full half-column width)

**Completion:** assign tech if needed; TBD nail art requires price; **From-price lines require Confirm price** (or edit) before Complete enabled

**Calendar / Employees / Analytics:** as before (week/month calendar; employee schedules + exceptions; completed-transaction revenue)

### Admin APIs (additions)
| Route | Purpose |
|-------|---------|
| `POST /api/admin/push/subscribe` | Save Web Push subscription for logged-in admin |
| `POST /api/admin/push/unsubscribe` | Remove subscription |
| `GET /api/cron/appointment-reminders` | 5-min-before push fan-out (`Authorization: Bearer CRON_SECRET`) |

Existing: appointments CRUD/complete/status, analytics, calendar, employees, quick-booking, time-off.

---

## 7. Database Architecture

### Core (schema.sql)
- `appointments` — `party_group_id`, `is_guest`, `any_technician`, …
- `appointment_services`, `services`, `technicians`, schedules, overrides, time_off, `admin_users`

### Migration 009 — retire Princess / Deluxe pedicures
- Soft-deactivates `pedi-deluxe`, `pedi-princess` (`is_active = false`) so historical FKs remain

### Migration 010 — admin web push
- `push_subscriptions` (endpoint + keys per admin user)
- `appointment_reminder_sends` (idempotent `upcoming_5min` sends)

### Status flow
```
booked → completed (creates completed_transactions + line items)
booked → cancelled
booked → no_show
```
**Never modify `appointment_services` after booking.**

### Analytics rule
Revenue / avg ticket / tips → **`completed_transactions` only**.

---

## 8. Known Issues / Next Steps

| Area | Notes |
|------|-------|
| **Push setup** | Run migration **010**; set VAPID + `CRON_SECRET` on Vercel; Add to Home Screen + Enable alerts; schedule external every-minute cron |
| Supabase migrations | Confirm **002–010** applied in production |
| `services` table sync | Bookable IDs must match `salonData.ts` (Princess/Deluxe retired; wax/enhancement prices updated Jul 14) |
| Google / Facebook widgets | Static counts in `salonData.ts` — update when live profiles change |
| Vercel Hobby cron | Cannot run `* * * * *`; use external cron hitting `/api/cron/appointment-reminders` |
| SMS confirmations | Consent collected; **no Twilio send yet** |
| Employee specialties | Not in DB; booking does not filter techs by service type |
| Salon hours in admin | Still in `salonData.ts`; manual admin bookings not blocked outside hours |
| Custom domain | Still on `*.vercel.app` unless added |

### Production checklist (push + catalog)
1. Run migrations **009** + **010** in Supabase SQL Editor
2. `npm run generate:vapid` → paste keys into Vercel env (+ `CRON_SECRET`) → redeploy
3. On owner iPad: Safari → admin URL → **Add to Home Screen** → open app → **Enable alerts**
4. Configure cron-job.org (or similar) every minute → `GET https://nail-tek-and-spa.vercel.app/api/cron/appointment-reminders` with `Authorization: Bearer <CRON_SECRET>`
5. Smoke-test: online book → admin push; complete Acrylic/From appointment → must confirm prices; Pink & White shows From $55 / $45

---

## 9. File Map (key files)

```
app/
  manifest.ts                       # PWA manifest (admin installable)
  admin/
    page.tsx                        # Agenda (+ highlight query param)
    layout.tsx                      # AdminNav + AdminPushPrompt
  api/
    appointments/route.ts           # Online book + notifyNewBooking
    admin/quick-booking/route.ts    # Walk-in/phone + notifyNewBooking
    admin/push/subscribe|unsubscribe/
    cron/appointment-reminders/     # 5-min reminder fan-out

components/
  booking/BookingFlow.tsx
  sections/
    About.tsx / ServiceGallery.tsx / NailGallery.tsx / Reviews.tsx
    GoogleReviewWidget.tsx / FacebookReviewWidget.tsx
  ui/reveal.tsx
  admin/
    AdminDashboard.tsx              # Agenda + walk-in/phone forms
    AdminPushPrompt.tsx             # Enable/disable web push
    CompleteAppointmentForm.tsx     # From-price confirm + TBD prices
    AppointmentDetailView.tsx

lib/
  config/salonData.ts               # Single source of truth for menu/prices/durations
  booking/pricing.ts                # From / TBD / display totals
  booking/time-utils.ts             # America/Chicago
  admin/push.ts                     # web-push helpers
  utils.ts                          # formatDuration(minutes, minMinutes?)

public/
  sw.js                             # Service worker (push + notificationclick)
  icons/icon-192.png, icon-512.png, apple-touch-icon.png

supabase/migrations/
  009_remove_princess_deluxe_pedicures.sql
  010_push_subscriptions.sql

scripts/
  generate-vapid-keys.mjs           # npm run generate:vapid
  seed-demo-bookings.mjs            # npm run seed:demo
  run-reminder-cron.mjs             # optional local reminder poller
```

---

## 10. How to Run Locally

```powershell
cd C:\Users\dangi\Projects\nail-tek-and-spa
npm install
# ensure .env.local exists (copy from .env.example; fill Supabase + optional VAPID/CRON)
npm run generate:vapid   # if setting up push locally
npm run dev
# → http://localhost:3000
```

If build/runtime errors after many hot reloads: `Remove-Item -Recurse -Force .next` then `npm run dev`.

### E2E tests
```powershell
npm run test:e2e
```

### Admin access
1. Local: `http://localhost:3000/admin/login`
2. Production: `https://nail-tek-and-spa.vercel.app/admin/login`
3. Sign in with user in `admin_users`

### Deploy
- Push to `master` → Vercel auto-deploys
- Env vars: Vercel project settings (Supabase + VAPID + CRON_SECRET)

---

## 11. User Preferences

- Production-quality, scalable code — refactor don't layer hacks
- Minimize owner clicks, but **never skip confirming variable (“From”) prices at completion**
- iPad-first admin, mobile-first customer site (swipe carousels over tall stacks)
- Use `salonData.ts` for business data — no hardcoded fake services
- Employee schedules and roster managed from admin Employees tab (DB-backed)
- Prefer merge-to-`master` so Vercel production updates quickly
- Don't expose internal admin concepts in customer-facing copy
- Duration ranges: display range, book the **max**
- iOS web push only works for **Home Screen** installed PWA (iOS 16.4+)

---

## 12. Copy-Paste Prompt for Next AI Session

```
Read plan.md in the project root first.

Status (July 14, 2026): App live on Vercel (nail-tek-and-spa.vercel.app). HEAD 2f6f7a1.

Recent features:
- Mobile swipe carousels (About/Services/Gallery/Reviews); hero tightened; Mary testimonial
- Duration ranges (book max); Princess/Deluxe removed; wax price tweaks
- From pricing on enhancements + admin must confirm From prices at completion
- Pink & White: Full from $55; Fill / Pink Fill from $45
- Admin iOS web push (new booking + 5-min reminder API); migration 010; external cron needed

Confirm migrations 002–010 on Supabase prod. Set VAPID + CRON_SECRET on Vercel if not done.

Rules:
- Revenue metrics = completed transactions only
- Never overwrite original booking data (appointment_services)
- Technicians/roles for booking/admin = Supabase DB; salon hours still in salonData.ts
- All appointment times = America/Chicago via time-utils
- Match existing design (warm beige, serif headings, sharp black; emerald for Complete)
- Split client vs server imports carefully
- Prefer clear PRs; user often wants push + merge to master
```

---

*End of handoff document.*
