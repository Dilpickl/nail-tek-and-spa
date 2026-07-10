# Nail Tek & Spa — AI Handoff / Context Refresh

> **Purpose:** Give the next Cursor AI session everything needed to continue work without re-discovering the codebase.  
> **Last updated:** July 9, 2026  
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

---

## 2. Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 App Router, React 18, TypeScript |
| Styling | Tailwind CSS, shadcn-style tokens in `app/globals.css` |
| Animation | Framer Motion (customer site sections) |
| Icons | Lucide React |
| Database / Auth | Supabase (PostgreSQL, RLS, email/password auth) |
| Hosting | **Vercel** (production, GitHub auto-deploy on `master`) |
| Charts | **Recharts** (`recharts` in `package.json`) |
| E2E tests | **Playwright** (`@playwright/test`, `npm run test:e2e`) |

---

## 3. Environment & Supabase

### Local env (gitignored)
File: `.env.local` (exists locally, never committed)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...   # server-only, never expose to browser
```

Template: `.env.example`

### Vercel env (production)
Set in **Vercel → Project → Settings → Environment Variables** (Production + Preview):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Copy values from local `.env.local` (project root). Redeploy after adding/changing env vars.

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
9. Run `supabase/seed.sql` (dev/staging only — not needed if 007 applied on prod)
10. Create auth user: Dashboard → Authentication → Users → Add user
11. Grant admin:
   ```sql
   insert into public.admin_users (user_id, email)
   values ('USER-UUID-FROM-AUTH', 'owner@email.com');
   ```
12. Supabase Auth → URL Configuration: add Vercel domain redirect URLs (e.g. `https://nail-tek-and-spa.vercel.app/**`)

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
| HEAD | `90937ed` — Improve admin booking UX and tablet layouts |

**Recent work (July 9, 2026 — evening):**
- **Booking timezone fix:** all salon times use `America/Chicago` in `lib/booking/time-utils.ts` (`toLocalDateTime`, `formatInSalonTime`, `formatSalonTime`) — fixes selected slot vs confirmation mismatch on Vercel (UTC server)
- **Simplified Calendar tab:** week + month views only; employee + status filters; day summary side panel (removed day/schedule views, service/sort/date-range clutter)
- **Employees:** removed "Week at a glance"; **Delete** button for permanent removal (`DELETE ?hard=true`); migration **008** removes legacy seed staff (`tech-linh`, `tech-maria`, `tech-james`, `tech-amy`)
- **Analytics:** **This Year** in primary date presets (with Today / This Week / This Month)
- **Agenda:** black **still booked** badge is clickable — scrolls to next uncompleted (`booked`) appointment with highlight
- **Manual booking / edits:** no longer blocked by "outside business hours" (quick-booking + `update-appointment.ts`); time wheel uses 6:00 AM–11:45 PM range
- **iPad/tablet UX:** Employees accordion until `xl` (fixes overlapping white schedule bubbles); phone booking date/phone on separate rows; admin nav pills scroll horizontally; `TimeWheelPicker` infinite loop scroll (iOS-style)
- **Hero:** compact mobile review chips (desktop keeps floating card)

**Recent work (July 9, 2026 — earlier):**
- **Real salon data on customer site:** `lib/config/salonData.ts` — Algonquin address, hours, full menu (pedicures through lashes), waxing, Google reviews/testimonials, social links, Travis/Daisy/Adam/Vickie
- **Contact:** phone `(847) 458-4560`, email `Nailtekandspa52018@yahoo.com` (footer, careers, terms, privacy)
- **Migration 007:** `supabase/migrations/007_real_salon_catalog.sql` — sync DB services/technicians with real catalog (must run on production Supabase)
- **Brand copy:** removed fake “est. 1994 / 30+ years” story; hero uses owner-provided Algonquin description
- **Google widget:** static 4.4 / 181 reviews with Maps + write-a-review links (update manually in `salonData.ts` when Google changes)

**Prior work (June 28 – July 1, 2026):**
- **Vercel deploy:** production live at `nail-tek-and-spa.vercel.app`; GitHub auto-deploy enabled; env vars configured
- **Admin Calendar tab** (`/admin/calendar`): Day / Week / Month / Schedule views; status color coding; inline side panel for appointment details; filter by employee, service, status; sort + date range
- **Guest booking fixes:** cannot select same technician for multiple party guests (UI + API validation); guests who choose **Any** stay unassigned (`any_technician: true`) and appear in Agenda **Any Employee** column
- **Schedule exceptions:** date **range** support (start + optional end date) in Employees tab + overrides API
- **Completion flow:** assign technician on complete page without leaving; backend blocks completion if still unassigned; completion assignment skips schedule/capacity constraints (`forCompletionAssignment: true`)
- **Agenda UX:** fixed bottom-right badge showing count still booked; heading shows month+day (e.g. "June 30") for dates other than today/tomorrow/yesterday
- Prior: nail art variants, per-guest tech prefs, three-layer availability, Playwright E2E (`e2e/booking.spec.ts`)

**Current focus (next session):** Run migrations **007** + **008** on production Supabase if not done yet; smoke-test `/book` time selection → confirmation on Vercel; verify iPad admin (Employees, phone booking, time wheel).

---

## 5. Design & Content Decisions

### Visual direction
- Premium warm-beige/serif aesthetic (not the brief trendy redesign that was reverted)
- Brand story: Algonquin location, premium affordable care, custom nail art, walk-ins + gift cards — not a decades-established claim
- Admin uses **Agenda | Calendar | Employees | Analytics** nav; customer site uses Header/Footer via `SiteChrome` (admin routes hide site chrome)
- Admin login heading: **"Hello, Travis."**
- **Complete Appointment** button uses emerald green (`emerald-700`), not black primary

### Brand palette
- Background: warm beige `#F5F1E6` / `--background`
- Cards: off-white `#FAFAFA`
- Typography & primary buttons: sharp black `#111111`
- Fonts: Inter (body) + Cormorant Garamond (headings)

### Data sources
- **`lib/config/salonData.ts`** — services, prices, durations, **salon-wide hours**, retail products, careers, trust pillars, testimonials, Google rating links (marketing copy and business hours). Static `technicians[]` is a **marketing mirror only** — operational roster/roles come from Supabase.
- **Public contact (Jul 9, 2026):** `(847) 458-4560` · `Nailtekandspa52018@yahoo.com` · 2403 W Algonquin Road, Algonquin, IL 60102
- **`technicians` + `technician_schedules` + `technician_schedule_overrides` tables (Supabase)** — operational source of truth for **who works when**; admin Employees tab manages CRUD, weekly schedules, and date exceptions
- **`services` table (Supabase)** — must stay in sync with bookable IDs from `salonData.ts` / migrations `006` + `007_real_salon_catalog.sql` for online booking FK validation
- Run migration **007** (or refresh `seed.sql`) on production Supabase after deploy so new service/tech IDs validate

---

## 6. What's Built Today

### Customer-facing site
| Route | Description |
|-------|-------------|
| `/` | Home: Hero, About, ServiceGallery, Reviews, Careers |
| `/services` | Full service menu with "Book This" links |
| `/book` | Multi-step booking flow |
| `/terms`, `/privacy` | Auto-generated legal pages |

### Booking engine (`/book`)
**Component:** `components/booking/BookingFlow.tsx`

5 steps: Services → Technician(s) → Date & Time → Details → Confirm

**Technician list:** loaded from DB via server props on `/book` (`getActiveTechnicians()`). Active employees only; roles shown on tech cards.

**Availability model (three layers):**
1. **Recurring schedule** — `technician_schedules` (per weekday, start/end times, managed in Employees tab)
2. **Date-specific overrides** — `technician_schedule_overrides` (planned day off or custom hours, Employees tab; supports **date ranges**)
3. **Same-day exceptions** — `technician_time_off` (Agenda Off/Sick toggle)

Resolution order in `getSchedulesForDate()`: override for that date → weekly row → intersect with salon hours. Time-off blocks applied in slot logic.

**Nail art booking:**
- Variant services (hand-painted, gemstones, etc.) are **multi-select checkboxes** — not a single dropdown
- TBD pricing at visit (`pricingTbd`); `estimated_total` excludes nail art at booking time
- Server rejects parent-only `addon-art-simple` IDs; migration 006 upserts all variant rows into `services`

**Multi-guest / party bookings:**
- User can add guests on step 1; each added guest **must type a name** (`Guest name *`)
- **Each party member must have at least one service** (validated per person)
- **Each guest picks their own technician** (dropdown, default **Any**); single guest uses card picker
- **Same technician cannot be selected for more than one guest** (disabled options + server validation)
- Online API creates **one `appointments` row per guest**, linked by `party_group_id`
- Guests who choose **Any** are stored as `any_technician: true` / `technician_id: null` (not auto-assigned at booking time)
- Party JSON: `{ label, serviceIds, technicianId? }[]` passed to availability and appointments APIs

**Step 1 validation UX:**
- **Continue** is always clickable (not disabled)
- On invalid step, scrolls to and highlights the problem field (red ring + inline message)
- Validates guests in order: name → services, then primary services

**Other booking behavior:**
- Time slot resets when date/party/technician prefs change (not on step advance)
- Past slots filtered; closed days disabled; auto-skip to next open day
- **All times are salon-local (`America/Chicago`)** — slot generation, API storage, and confirmation display use `lib/booking/time-utils.ts` (critical on Vercel UTC)

**APIs:**
- `GET /api/availability` — accepts `party` JSON query param; rejects duplicate party tech prefs
- `GET /api/technicians` — public list of active employees (id, name, role)
- `POST /api/appointments` — creates N appointments for party; rollback on failure; duplicate tech validation

**Logic split (important for imports):**
- `lib/booking/time-utils.ts` — date/time helpers + **`SALON_TIMEZONE` (`America/Chicago`)**; safe on client and server
- `lib/booking/service-utils.ts` — client-safe service lookups + `BookingPartyMember` type
- `lib/booking/normalize-services.ts` — **server-only** bookable service ID validation/normalization
- `lib/booking/technicians.ts` — **server-only** DB technician + schedule + override queries
- `lib/booking/party-scheduling.ts` — **server-only** party assignment + schedule-aware checks
- `lib/booking/slot-capacity.ts` — **server-only** chair/tech usage per slot
- `lib/booking/availability.ts` — **server-only** slot computation + Supabase queries
- `lib/technicians/types.ts` + `lib/technicians/schedule-utils.ts` — shared/client schedule helpers

### Admin (`/admin`)
**Auth:** `/admin/login` → must be in `admin_users`

**Nav:** `components/admin/AdminNav.tsx` — **Agenda** | **Calendar** | **Employees** | **Analytics**

Admin pages use `export const dynamic = "force-dynamic"` to avoid stale employee role data.

**Agenda** (`/admin`):
- **Day navigation:** `?date=YYYY-MM-DD`, prev/next, "Back to today"
- Heading: Today / Tomorrow / Yesterday / **Month Day** (e.g. June 30) for other dates
- **Booked count badge** (fixed bottom-right): shows uncompleted (`booked`) count; **tap to scroll** to next booked appointment (cycles through day)
- Columns: **Any Employee** + each **active** technician; subtitle shows **role from DB**
- Full-day off from agenda toggle **or** schedule override for that date
- Drag-and-drop booked appointments between columns
- **Party bookings** show as separate cards per guest; badge "Party of N"
- Walk-In / Phone Booking: multi-service dropdown; tech select shows `Name — Role`
- Off / Sick toggle per technician (same-day `technician_time_off`)
- Click appointment → detail page

**Calendar** (`/admin/calendar`):
- **Views:** Week (default) and Month only
- **Filters:** employee, status
- **Side panel:** selected day summary or appointment detail
- **Navigation:** prev/next, Today, Refresh
- Data via `GET /api/admin/calendar?start=&end=` (salon-timezone day bounds)

**Employees** (`/admin/employees`):
- Full employee CRUD: add, edit name/role, active/inactive, **Deactivate** or **Delete** (permanent; `?hard=true` clears schedules/overrides)
- **Weekly schedule** editor with **Quick weekly setup** (reset to salon hours, copy Mon → weekdays) + save hint
- **Schedule exceptions** panel: single date or **date range** (start + optional end); day off or custom hours; list/delete upcoming (60 days)
- Display order controls; future booking conflict warning on schedule save
- **Tablet layout:** accordion list below `xl`; side-by-side team list + editor at `xl+` (avoids overlapping schedule rows on iPad)
- Save profile triggers `router.refresh()` so agenda picks up role changes

**Appointment detail** (`/admin/appointments/[id]`):
- View original booking snapshot (never overwritten)
- **Party section** links to sibling appointments when `party_group_id` set
- Complete / Cancel / No-Show with confirmation modals / Edit / Move

**Completion** (`/admin/appointments/[id]/complete`):
- **Must assign technician** before completing if appointment is in Any/unassigned
- **Inline technician assignment** on complete page (no need to return to agenda)
- Completion assignment bypasses schedule/capacity checks (`forCompletionAssignment`)
- Nail art TBD lines require final price at checkout
- Editable line items, retail, discount, tip, tax, payment method

**Analytics** (`/admin/analytics`):
- Revenue from **completed transactions only**
- Primary date presets: **Today | This Week | This Month | This Year**; extended ranges in Full Report toggle

### Admin APIs
| Route | Purpose |
|-------|---------|
| `GET/PATCH /api/admin/appointments/[id]` | Read / update appointment |
| `POST /api/admin/appointments/[id]/complete` | Finalize transaction (requires assigned tech) |
| `PATCH /api/admin/appointments/[id]/status` | cancel, no_show |
| `GET /api/admin/analytics` | KPIs + chart data |
| `GET /api/admin/calendar` | Calendar range query (appointments + technicians) |
| `GET/POST /api/admin/employees` | List/create employees + schedules |
| `PATCH/DELETE /api/admin/employees/[id]` | Update profile / deactivate (`DELETE`) or permanent delete (`DELETE ?hard=true`) |
| `PUT /api/admin/employees/[id]/schedule` | Replace 7-day schedule |
| `GET/POST/DELETE /api/admin/employees/[id]/overrides` | Date-specific schedule exceptions (supports range) |
| `POST /api/admin/employees/reorder` | Update display_order |
| `POST /api/admin/quick-booking` | walk-in or phone (multi-service, any tech) |
| `POST /api/admin/time-off` | mark tech off for day (agenda shortcut) |

---

## 7. Database Architecture

### Core (schema.sql)
- `appointments` — includes `party_group_id uuid`, `is_guest boolean`, `any_technician boolean`
- `appointment_services`, `services`, `technicians`, `technician_time_off`, `technician_schedules`, `technician_schedule_overrides`, `admin_users`
- `technicians` — `role`, optional `bio`, `avatar_url`; `is_active`, `display_order`
- `technician_schedules` — one row per tech per weekday (0=Sun … 6=Sat)
- `technician_schedule_overrides` — one row per tech per calendar date (day off or custom hours)

### Migration 006 — service variants sync + schedule overrides
- Upserts all bookable service IDs including nail art variants (`addon-art-*`)
- Creates `technician_schedule_overrides` table + RLS

### Slot capacity model (`lib/booking/slot-capacity.ts`)
- **Assigned** bookings block only that technician
- **Any employee** bookings consume one chair but do not block named techs until assigned
- Multi-guest bookings count as **N separate appointments** → N chairs at same start time

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
| **Real data migration** | Customer site + `salonData.ts` done (Jul 9). **Still pending:** run migrations **007** + **008** on production Supabase, then smoke-test booking times on Vercel |
| Supabase migrations | Confirm 002–**008** applied in production Supabase |
| `services` table sync | Bookable service IDs in DB must match `salonData.ts` / migration 007 |
| Google rating widget | Static `business.googleRating` / `googleReviewCount` — update when the live Google profile changes |
| Dev server cache | If white screen / module errors, delete `.next` and restart `npm run dev` |
| Legacy party bookings | Old single-row multi-guest bookings may still exist in DB |
| Partial-day time-off | Schema supports it; agenda toggle is full-day only; use custom-hours override for partial |
| Employee specialties | Not in DB yet; booking does not filter techs by service type |
| Salon hours in admin | Still in `salonData.ts`; not editable from admin UI. **Manual admin bookings are NOT blocked** outside salon hours (overlap/tech-off still enforced) |
| SMS confirmations | Alert stubs only — no Twilio integration yet |
| Custom domain | Vercel default `*.vercel.app`; add custom domain when ready |

### Real data checklist (production)
1. **Run migration 007** (`supabase/migrations/007_real_salon_catalog.sql`) in Supabase SQL Editor — upserts real services + Travis/Daisy/Adam/Vickie + default schedules
2. **Run migration 008** (`supabase/migrations/008_remove_legacy_technicians.sql`) — hard-deletes legacy placeholder staff (Linh, Maria, James, Amy) or use Employees **Delete** in admin
3. **Employees:** confirm all four techs are active in `/admin/employees`; adjust weekly schedules if anyone does not work “all hours”
4. **Schedule exceptions:** add planned time off / custom hours via Employees tab (use date ranges for vacations)
5. **Salon hours:** Mon–Fri 9–8, Sat 9–6, Sun 11–5 in `salonData.ts` (affects **online** availability; admin can book outside hours)
6. **Admin user:** confirm owner account in `admin_users`
7. **Smoke test on Vercel:** `/book` (pick time → confirm same time), `/admin`, `/admin/calendar`, phone booking on iPad, complete flow with real employee assignment
8. **Remove/clear test appointments** if old seed data was loaded in production

---

## 9. File Map (key files)

```
app/
  admin/
    page.tsx                        # Agenda (force-dynamic)
    calendar/page.tsx               # Calendar tab (force-dynamic)
    employees/page.tsx              # Employees tab (force-dynamic)
  api/
    admin/calendar/route.ts         # Calendar range API
    admin/employees/[id]/overrides/ # Schedule exceptions CRUD (date ranges)
    availability/route.ts
    appointments/route.ts

components/
  booking/BookingFlow.tsx           # Multi-guest; salon-timezone confirmation display
  ui/TimeWheelPicker.tsx            # iOS-style infinite loop time wheel (admin)
  admin/
    AdminDashboard.tsx              # Agenda + clickable booked-count badge + quick booking
    AdminCalendar.tsx               # Week/month calendar + side panel
    AdminNav.tsx                    # Agenda | Calendar | Employees | Analytics (scrollable on tablet)
    EditAppointmentForm.tsx           # Time wheel for reschedule
    CompleteAppointmentForm.tsx     # Inline tech assignment at checkout
  admin/employees/
    EmployeeScheduleEditor.tsx      # Quick weekly setup; tablet-friendly grid
    EmployeeScheduleExceptions.tsx  # Date + range exceptions UI
  admin/analytics/
    AnalyticsDatePicker.tsx         # Today / Week / Month / Year primary presets

lib/
  admin/format.ts                   # Display times in salon timezone
  admin/update-appointment.ts       # forCompletionAssignment bypass; no business-hours block
  booking/time-utils.ts             # America/Chicago timezone helpers (critical)
  booking/normalize-services.ts     # Server validation for bookable service IDs
  booking/party-scheduling.ts       # Party assignment; Any stays unassigned
  booking/technicians.ts            # Schedules + overrides resolution
  analytics/date-ranges.ts          # Includes this_year preset

supabase/
  migrations/006_service_variants_and_overrides.sql
  migrations/007_real_salon_catalog.sql      # Real menu + staff (production)
  migrations/008_remove_legacy_technicians.sql  # Delete placeholder staff

e2e/
  booking.spec.ts                   # Playwright E2E (5 tests)

playwright.config.ts
```

---

## 10. How to Run Locally

```bash
cd C:\Users\dangi\Projects\nail-tek-and-spa
npm install
# ensure .env.local exists (copy from .env.example, fill from Supabase Dashboard → API)
npm run dev
# → http://localhost:3000
```

If build/runtime errors after many hot reloads: `Remove-Item -Recurse -Force .next` then `npm run dev`.

### E2E tests
```bash
npm run dev          # in one terminal
npm run test:e2e     # in another (or auto-starts dev server via playwright.config.ts)
```

### Admin access
1. Local: `http://localhost:3000/admin/login`
2. Production: `https://nail-tek-and-spa.vercel.app/admin/login`
3. Sign in with user in `admin_users`
4. Agenda `/admin`, Calendar `/admin/calendar`, Employees `/admin/employees`, Analytics `/admin/analytics`

### Deploy
- Push to `master` → Vercel auto-deploys
- Manual: `npx vercel deploy --prod`
- Env vars: Vercel project settings (same three Supabase keys as `.env.local`)

---

## 11. User Preferences

- Production-quality, scalable code — refactor don't layer hacks
- Minimize owner clicks (one-click complete when unchanged)
- iPad-first admin, mobile-first customer site
- Use `salonData.ts` for business data — no hardcoded fake services
- Employee schedules and roster managed from admin Employees tab (DB-backed)
- Only commit when user asks
- Simplified analytics default view; full report collapsed behind toggle
- Don't expose internal admin concepts in customer-facing copy
- Deploy to Vercel before loading final production data (done)

---

## 12. Copy-Paste Prompt for Next AI Session

```
Read plan.md in the project root first.

Status (July 2026): App is live on Vercel (nail-tek-and-spa.vercel.app). HEAD 90937ed.

Recent features:
- Booking times fixed for America/Chicago (Vercel UTC) — lib/booking/time-utils.ts
- Simplified Calendar (week/month only); clickable still-booked badge on Agenda
- Employees: Delete button + migration 008 for legacy staff; iPad layout fixes
- Analytics: This Year in primary presets
- Admin manual bookings NOT blocked by salon hours; TimeWheelPicker infinite scroll

Confirm migrations 002–008 applied in Supabase prod. services table must match salonData bookable IDs.

Rules:
- Revenue metrics = completed transactions only
- Never overwrite original booking data (appointment_services)
- Technicians/roles for booking/admin = Supabase DB; salon hours still in salonData.ts
- All displayed/stored appointment times = America/Chicago via time-utils
- Match existing design (warm beige, serif headings, sharp black; emerald for Complete)
- Split client vs server imports: time-utils/service-utils/schedule-utils (client) vs availability/party-scheduling/slot-capacity/technicians/normalize-services (server-only)
- Only commit when user asks
```

---

*End of handoff document.*
