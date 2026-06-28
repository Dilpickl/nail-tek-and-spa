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
6. Run `supabase/seed.sql`
7. Create auth user: Dashboard → Authentication → Users → Add user
8. Grant admin:
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
| HEAD | `558b97d` — run `git log -1 --oneline` after pull |

**Recent commits (newest first):**
- `558b97d` — Add Employees admin tab with weekly schedules and DB-backed availability
- `b165634` — Add TBD nail art pricing with visit-time checkout and admin agenda tweaks
- `6464073` — Update plan.md handoff for multi-guest bookings and recent admin UX
- `4d27dad` — Fix booking validation scroll-to-error for guest service selection

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
- **`lib/config/salonData.ts`** — services, prices, durations, **salon-wide hours**, retail products, careers, trust pillars (still used for marketing copy and business hours)
- **`technicians` + `technician_schedules` tables (Supabase)** — operational source of truth for **who works when**; admin Employees tab manages CRUD + weekly schedules

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

5 steps: Services → Technician (specific or "Any") → Date & Time → Details → Confirm

**Technician list:** loaded from DB via server props on `/book` (`getActiveTechnicians()`). Active employees only.

**Availability model (two layers):**
1. **Recurring schedule** — `technician_schedules` (per weekday, start/end times, managed in Employees tab)
2. **One-off exceptions** — `technician_time_off` (Agenda Off/Sick toggle)

Effective slot availability = employee is `is_active` **AND** scheduled for that weekday **AND** slot fits within intersection(employee hours, salon hours) **AND** not time-off blocked.

**Multi-guest / party bookings (important):**
- User can add guests on step 1; each added guest **must type a name** (`Guest name *`)
- **Each party member must have at least one service** (validated per person, not just globally)
- Online API creates **one `appointments` row per guest**, linked by `party_group_id`
- Primary booker: `is_guest: false`; additional guests: `is_guest: true`
- All guests share the same `starts_at` (parallel scheduling); each row has its own `ends_at` from their services
- Availability requires enough free techs/chairs for party size (`lib/booking/party-scheduling.ts`)
- Party JSON passed to `GET /api/availability?party=...`

**Step 1 validation UX:**
- **Continue** is always clickable (not disabled)
- On invalid step, scrolls to and highlights the problem field (red ring + inline message)
- Validates guests in order: name → services, then primary services
- Uses `useLayoutEffect` + `scrollToBookingField()` for scroll-after-render

**Other booking behavior:**
- Time slot resets only when date/party/technician changes (not on step advance)
- Past slots filtered; closed days disabled; auto-skip to next open day
- Technician step copy uses quoted **"Any"** for the any-tech option
- Date/time step description is customer-facing (no admin agenda jargon)

**APIs:**
- `GET /api/availability` — accepts `party` JSON query param or legacy `serviceId` list
- `GET /api/technicians` — public list of active employees (id, name, role)
- `POST /api/appointments` — creates N appointments for party; rollback on failure

**Logic split (important for imports):**
- `lib/booking/time-utils.ts` — client-safe date/time helpers
- `lib/booking/service-utils.ts` — client-safe service lookups + `BookingPartyMember` type
- `lib/booking/technicians.ts` — **server-only** DB technician + schedule queries
- `lib/booking/party-scheduling.ts` — **server-only** party assignment + schedule-aware checks
- `lib/booking/slot-capacity.ts` — **server-only** chair/tech usage per slot
- `lib/booking/availability.ts` — **server-only** slot computation + Supabase queries
- `lib/technicians/types.ts` + `lib/technicians/schedule-utils.ts` — shared/client schedule helpers

### Admin (`/admin`)
**Auth:** `/admin/login` → must be in `admin_users`

**Nav:** `components/admin/AdminNav.tsx` — **Agenda** | **Employees** | **Analytics**

**Agenda** (`/admin`):
- **Day navigation:** `?date=YYYY-MM-DD`, prev/next, "Back to today"; heading shows Today / Tomorrow / Agenda
- Columns: **Any Employee** + each **active** technician (from DB, ordered by `display_order`)
- Drag-and-drop booked appointments between columns; PATCH updates tech or `any_technician`
- **Party bookings** show as separate cards per guest; badge "Party of N" (and "Guest ·" for non-primary)
- **New booking highlight:** green ring + "New" badge for ~12s (walk-in/phone + realtime online inserts); `lib/admin/highlight-appointments.ts`
- Walk-In / Phone Booking: multi-service dropdown, default tech Any Employee, walk-in has no phone field
- Off / Sick toggle per technician (one-off time-off; does not change recurring schedule)
- Click appointment → detail page

**Employees** (`/admin/employees`):
- Full employee CRUD: add, edit name/role, active/inactive, deactivate (soft) or hard delete if no appointments
- Weekly schedule editor: per-day working on/off + start/end times (validated against salon hours)
- Week-at-a-glance staff counts; Copy Mon → Weekdays; Apply salon hours
- Display order controls (agenda column order + booking tech picker order)
- Future booking conflict warning when schedule changes affect existing appointments
- **Component:** `components/admin/employees/EmployeesDashboard.tsx`

**Appointment detail** (`/admin/appointments/[id]`):
- View original booking snapshot (never overwritten)
- **Party section** links to sibling appointments when `party_group_id` set
- Complete (emerald button) / Cancel / No-Show with **confirmation modals** / Edit / Move

**Completion** (`/admin/appointments/[id]/complete`):
- Preloads booked services; one-click complete if unchanged
- Editable line items, retail, discount, tip, tax, payment method
- Creates `completed_transactions` + `transaction_line_items`; sets status `completed`

**Edit / Move** (`/admin/appointments/[id]/edit`):
- Reschedule, change tech (including Any Employee), client info, services
- Technician-only moves allowed without services (walk-in/phone blocks)

**Analytics** (`/admin/analytics`):
- Owner-friendly simplified default view: Money Made hero, revenue trend, needs-attention alerts
- Expandable **Full Report**: staff performance, charts, financial breakdown, date ranges
- Revenue metrics from **completed transactions only**
- Staff names loaded from `technicians` table

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
| `POST /api/admin/employees/reorder` | Update display_order |
| `POST /api/admin/quick-booking` | walk-in or phone (multi-service, any tech) |
| `POST /api/admin/time-off` | mark tech off for day |

---

## 7. Database Architecture

### Core (schema.sql)
- `appointments` — includes `party_group_id uuid`, `is_guest boolean`, `any_technician boolean`
- `appointment_services`, `services`, `technicians`, `technician_time_off`, `technician_schedules`, `admin_users`
- `technicians` — optional `bio`, `avatar_url`; `is_active`, `display_order`
- `technician_schedules` — one row per tech per weekday (0=Sun … 6=Sat): `is_working`, `start_time`, `end_time`

### Migration 002 — completion & analytics
- `clients`, `retail_products`, `completed_transactions`, `transaction_line_items`
- `appointments.client_id`, `appointments.estimated_total`
- RLS: admin-only on new tables

### Migration 003 — any technician
- `appointments.any_technician boolean default false`

### Migration 004 — anon any-technician grant
- RLS/grants for anonymous availability reads needed by booking flow

### Migration 005 — technician schedules
- `technician_schedules` table + RLS
- Extends `technicians` with `bio`, `avatar_url`
- Seeds existing team with Mon–Sat salon hours, Sunday off

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
Revenue / avg ticket / tips → **`completed_transactions` only**. Scheduling metrics may include booked appointments.

---

## 8. Known Issues / Next Steps

| Area | Notes |
|------|-------|
| Supabase migrations | Must run 002–005 in Supabase if not already applied |
| Dev server cache | If white screen / module errors, delete `.next` and restart `npm run dev` |
| Port conflicts | Kill stale node on :3000 if dev server falls back to :3001 |
| Legacy party bookings | Old single-row multi-guest bookings (pre `1c6ac93`) may still exist in DB; new bookings split per guest |
| Sequential vs parallel | Online booking is **parallel same start time** only; no back-to-back party option yet |
| Partial-day time-off | Schema supports it; admin UI only exposes full-day Off/Sick toggle |
| Employee specialties | Not in DB yet; booking does not filter techs by service type |
| Salon hours in admin | Still in `salonData.ts`; not editable from admin UI |
| Gift cards / deposits | Placeholders in analytics breakdown (always $0 until implemented) |
| SMS confirmations | Alert stubs only — no Twilio integration yet |
| Payroll / inventory | Not built |

---

## 9. File Map (key files)

```
app/
  admin/
    page.tsx                        # Agenda + ?date= nav (server)
    employees/page.tsx              # Employees tab
    appointments/[id]/page.tsx      # Detail + party siblings
  api/
    availability/route.ts           # party JSON param
    appointments/route.ts           # multi-row party insert
    technicians/route.ts            # public active employee list
    admin/employees/                # CRUD + schedule + reorder
    admin/quick-booking/route.ts

components/
  booking/BookingFlow.tsx           # Party UI, DB technicians prop
  admin/AdminDashboard.tsx          # Agenda, DB technician columns
  admin/employees/                  # EmployeesDashboard, schedule editor
  admin/AppointmentCard.tsx         # Party badge, isNew highlight
  admin/AppointmentDetailView.tsx   # Confirm modals, party list, emerald Complete link
  ui/TimeWheelPicker.tsx

lib/
  booking/technicians.ts            # getActiveTechnicians, schedule resolution
  booking/party-scheduling.ts       # assignTechniciansForParty (schedule-aware)
  booking/slot-capacity.ts          # getSlotUsage
  booking/availability.ts           # getAvailableSlots (schedule + time-off)
  technicians/types.ts              # shared schedule types
  technicians/schedule-utils.ts     # client schedule helpers
  admin/highlight-appointments.ts   # sessionStorage queue for new card highlights
  admin/update-appointment.ts       # Allows tech-only moves without services

supabase/
  schema.sql
  migrations/002_completion_analytics.sql
  migrations/003_any_technician.sql
  migrations/004_anon_any_technician_grant.sql
  migrations/005_technician_schedules.sql
  seed.sql
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
- Don't expose internal admin concepts in customer-facing copy (e.g. "salon agenda")

---

## 12. Copy-Paste Prompt for Next AI Session

```
Read plan.md in the project root first.

Recent work (June 2026): Employees admin tab with weekly per-employee schedules (technician_schedules), DB-backed technician list for booking/agenda/analytics, two-layer availability (recurring schedule + agenda time-off). Multi-guest bookings, party badges, booking scroll-to-error validation, cancel/no-show modals, agenda day navigation.

Confirm migrations 002–005 applied in Supabase. HEAD should be 558b97d or later on master.

Rules:
- Revenue metrics = completed transactions only
- Never overwrite original booking data (appointment_services)
- Technicians for booking/admin = Supabase DB; salon hours still in salonData.ts
- Match existing design (warm beige, serif headings, sharp black; emerald for Complete)
- Split client vs server imports: time-utils/service-utils/schedule-utils (client) vs availability/party-scheduling/slot-capacity/technicians (server-only)
- Only commit when user asks
```

---

*End of handoff document.*
