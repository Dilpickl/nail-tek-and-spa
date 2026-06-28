# Nail Tek & Spa — AI Handoff / Context Refresh

> **Purpose:** Give the next Cursor AI session everything needed to continue work without re-discovering the codebase.  
> **Last updated:** June 28, 2026  
> **Repo:** https://github.com/Dilpickl/nail-tek-and-spa  
> **Local path:** `C:\Users\dangi\Projects\nail-tek-and-spa`

---

## 1. What This Project Is

A **Next.js salon website + booking engine + iPad-friendly admin operations dashboard** for a nail salon with **30+ years** of experience (est. 1994).

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
| Charts | **Recharts** (`recharts` in `package.json`) |
| E2E tests | **Playwright** (`@playwright/test`, `npm run test:e2e`) |

---

## 3. Environment & Supabase

### Local env (gitignored)
File: `.env.local` (exists locally, never committed)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xjspoxubwnncvdbdmarx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...   # server-only, never expose to browser
```

Template: `.env.example`

### Supabase setup (required for live booking/admin)
1. Run `supabase/schema.sql` in Supabase SQL Editor
2. Run `supabase/migrations/002_completion_analytics.sql`
3. Run `supabase/migrations/003_any_technician.sql`
4. Run `supabase/migrations/004_anon_any_technician_grant.sql`
5. Run `supabase/migrations/005_technician_schedules.sql`
6. Run `supabase/migrations/006_service_variants_and_overrides.sql`
7. Run `supabase/seed.sql`
8. Create auth user: Dashboard → Authentication → Users → Add user
9. Grant admin:
   ```sql
   insert into public.admin_users (user_id, email)
   values ('USER-UUID-FROM-AUTH', 'owner@email.com');
   ```

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
| HEAD | run `git log -1 --oneline` after pull |

**Recent work (June 28, 2026):**
- Nail art booking fix: service variant upsert (migration 006), server validation via `lib/booking/normalize-services.ts`
- Online booking: multi-select nail art variant checkboxes; per-guest technician preference (default Any)
- Employees tab: date-specific schedule exceptions (`technician_schedule_overrides`); quick weekly setup UX
- Role propagation from DB across agenda, booking, quick-book, edit forms; admin pages `force-dynamic`
- Playwright E2E suite (`e2e/booking.spec.ts`, 5 tests)

---

## 5. Design & Content Decisions

### Visual direction
- Premium warm-beige/serif aesthetic (not the brief trendy redesign that was reverted)
- Keep **30+ years** (established 1994), not 40+
- Admin uses Agenda | Employees | Analytics nav; customer site uses Header/Footer via `SiteChrome` (admin routes hide site chrome)
- Admin login heading: **"Hello, Travis."**
- **Complete Appointment** button uses emerald green (`emerald-700`), not black primary

### Brand palette
- Background: warm beige `#F5F1E6` / `--background`
- Cards: off-white `#FAFAFA`
- Typography & primary buttons: sharp black `#111111`
- Fonts: Inter (body) + Cormorant Garamond (headings)

### Data sources
- **`lib/config/salonData.ts`** — services, prices, durations, **salon-wide hours**, retail products, careers, trust pillars (marketing copy and business hours). Static `technicians[]` is a **marketing mirror only** — operational roster/roles come from Supabase.
- **`technicians` + `technician_schedules` + `technician_schedule_overrides` tables (Supabase)** — operational source of truth for **who works when**; admin Employees tab manages CRUD, weekly schedules, and date exceptions

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
2. **Date-specific overrides** — `technician_schedule_overrides` (planned day off or custom hours, Employees tab)
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
- Online API creates **one `appointments` row per guest**, linked by `party_group_id`
- Party JSON: `{ label, serviceIds, technicianId? }[]` passed to availability and appointments APIs
- Assignment in `lib/booking/party-scheduling.ts` honors per-member tech prefs; `"any"` members auto-assigned

**Step 1 validation UX:**
- **Continue** is always clickable (not disabled)
- On invalid step, scrolls to and highlights the problem field (red ring + inline message)
- Validates guests in order: name → services, then primary services

**Other booking behavior:**
- Time slot resets when date/party/technician prefs change (not on step advance)
- Past slots filtered; closed days disabled; auto-skip to next open day

**APIs:**
- `GET /api/availability` — accepts `party` JSON query param
- `GET /api/technicians` — public list of active employees (id, name, role)
- `POST /api/appointments` — creates N appointments for party; rollback on failure; clearer errors for service FK issues

**Logic split (important for imports):**
- `lib/booking/time-utils.ts` — client-safe date/time helpers
- `lib/booking/service-utils.ts` — client-safe service lookups + `BookingPartyMember` type
- `lib/booking/normalize-services.ts` — **server-only** bookable service ID validation/normalization
- `lib/booking/technicians.ts` — **server-only** DB technician + schedule + override queries
- `lib/booking/party-scheduling.ts` — **server-only** party assignment + schedule-aware checks
- `lib/booking/slot-capacity.ts` — **server-only** chair/tech usage per slot
- `lib/booking/availability.ts` — **server-only** slot computation + Supabase queries
- `lib/technicians/types.ts` + `lib/technicians/schedule-utils.ts` — shared/client schedule helpers

### Admin (`/admin`)
**Auth:** `/admin/login` → must be in `admin_users`

**Nav:** `components/admin/AdminNav.tsx` — **Agenda** | **Employees** | **Analytics**

Admin pages use `export const dynamic = "force-dynamic"` to avoid stale employee role data.

**Agenda** (`/admin`):
- **Day navigation:** `?date=YYYY-MM-DD`, prev/next, "Back to today"
- Columns: **Any Employee** + each **active** technician; subtitle shows **role from DB** (fallback "Team member")
- Full-day off from agenda toggle **or** schedule override for that date
- Drag-and-drop booked appointments between columns
- **Party bookings** show as separate cards per guest; badge "Party of N"
- Walk-In / Phone Booking: multi-service dropdown; tech select shows `Name — Role`
- Off / Sick toggle per technician (same-day `technician_time_off`)
- Click appointment → detail page

**Employees** (`/admin/employees`):
- Full employee CRUD: add, edit name/role, active/inactive, deactivate or hard delete
- **Weekly schedule** editor with **Quick weekly setup** (reset to salon hours, copy Mon → weekdays) + save hint
- **Schedule exceptions** panel: add future day off or custom hours; list/delete upcoming (60 days)
- Display order controls; future booking conflict warning on schedule save
- Save profile triggers `router.refresh()` so agenda picks up role changes

**Appointment detail** (`/admin/appointments/[id]`):
- View original booking snapshot (never overwritten)
- **Party section** links to sibling appointments when `party_group_id` set
- Complete / Cancel / No-Show with confirmation modals / Edit / Move

**Completion** (`/admin/appointments/[id]/complete`):
- Nail art TBD lines require final price at checkout
- Editable line items, retail, discount, tip, tax, payment method

**Analytics** (`/admin/analytics`):
- Revenue from **completed transactions only**

### Admin APIs
| Route | Purpose |
|-------|---------|
| `GET/PATCH /api/admin/appointments/[id]` | Read / update appointment |
| `POST /api/admin/appointments/[id]/complete` | Finalize transaction |
| `PATCH /api/admin/appointments/[id]/status` | cancel, no_show |
| `GET /api/admin/analytics` | KPIs + chart data |
| `GET/POST /api/admin/employees` | List/create employees + schedules |
| `PATCH/DELETE /api/admin/employees/[id]` | Update profile / deactivate |
| `PUT /api/admin/employees/[id]/schedule` | Replace 7-day schedule |
| `GET/POST/DELETE /api/admin/employees/[id]/overrides` | Date-specific schedule exceptions |
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
| Supabase migrations | Must run 002–**006** in Supabase if not already applied |
| Dev server cache | If white screen / module errors, delete `.next` and restart `npm run dev` |
| Port conflicts | Kill stale node on :3000 if dev server falls back to :3001; set `PLAYWRIGHT_BASE_URL` for E2E |
| Legacy party bookings | Old single-row multi-guest bookings may still exist in DB |
| Partial-day time-off | Schema supports it; agenda toggle is full-day only; use custom-hours override for partial |
| Employee specialties | Not in DB yet; booking does not filter techs by service type |
| Salon hours in admin | Still in `salonData.ts`; not editable from admin UI |
| SMS confirmations | Alert stubs only — no Twilio integration yet |

---

## 9. File Map (key files)

```
app/
  admin/
    page.tsx                        # Agenda + overrides/time-off (force-dynamic)
    employees/page.tsx              # Employees tab (force-dynamic)
  api/
    availability/route.ts
    appointments/route.ts
    admin/employees/[id]/overrides/ # Schedule exceptions CRUD

components/
  booking/BookingFlow.tsx           # Multi-select nail art, per-guest tech
  admin/employees/
    EmployeeScheduleEditor.tsx      # Quick weekly setup
    EmployeeScheduleExceptions.tsx  # Date-specific overrides UI

lib/
  booking/normalize-services.ts     # Server validation for bookable service IDs
  booking/technicians.ts            # Schedules + overrides resolution
  booking/party-scheduling.ts       # Per-member technician assignment

supabase/
  migrations/006_service_variants_and_overrides.sql

e2e/
  booking.spec.ts                   # Playwright E2E (5 tests)

playwright.config.ts
```

---

## 10. How to Run Locally

```bash
cd C:\Users\dangi\Projects\nail-tek-and-spa
npm install
# ensure .env.local exists
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
1. `http://localhost:3000/admin/login`
2. Sign in with user in `admin_users`
3. Agenda at `/admin`, Employees at `/admin/employees`, Analytics at `/admin/analytics`

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

---

## 12. Copy-Paste Prompt for Next AI Session

```
Read plan.md in the project root first.

Recent work (June 2026): Migration 006 (nail art service variant sync + technician_schedule_overrides). Online booking multi-select nail art variants, per-guest technician preference (default Any), three-layer availability (weekly + date overrides + time-off). Employees tab schedule exceptions UI, quick weekly setup UX, DB role propagation. Playwright E2E suite (npm run test:e2e).

Confirm migrations 002–006 applied in Supabase.

Rules:
- Revenue metrics = completed transactions only
- Never overwrite original booking data (appointment_services)
- Technicians/roles for booking/admin = Supabase DB; salon hours still in salonData.ts
- Match existing design (warm beige, serif headings, sharp black; emerald for Complete)
- Split client vs server imports: time-utils/service-utils/schedule-utils (client) vs availability/party-scheduling/slot-capacity/technicians/normalize-services (server-only)
- Only commit when user asks
```

---

*End of handoff document.*
