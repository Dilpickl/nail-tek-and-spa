# Nail Tek & Spa — AI Handoff / Context Refresh

> **Purpose:** Give the next Cursor AI session everything needed to continue work without re-discovering the codebase.  
> **Last updated:** June 2026  
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
4. Run `supabase/seed.sql`
5. Create auth user: Dashboard → Authentication → Users → Add user
6. Grant admin:
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
| Latest pushed commit | `d59afac` — Add salon operations: completion workflow, analytics, and admin scheduling |

---

## 5. Design & Content Decisions

### Visual direction
- Premium warm-beige/serif aesthetic (not the brief trendy redesign that was reverted)
- Keep **30+ years** (established 1994), not 40+
- Admin uses Agenda | Analytics nav; customer site uses Header/Footer via `SiteChrome` (admin routes hide site chrome)

### Brand palette
- Background: warm beige `#F5F1E6` / `--background`
- Cards: off-white `#FAFAFA`
- Typography & primary buttons: sharp black `#111111`
- Fonts: Inter (body) + Cormorant Garamond (headings)

### Single source of truth
**`lib/config/salonData.ts`** — services, prices, durations, technicians, hours, retail products (`retailProducts` array), careers, trust pillars.

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

5 steps: Services → Technician (specific or Any) → Date & Time → Details → Confirm

**Recent booking improvements:**
- Time slot no longer clears when advancing steps (effect only resets on date/service/tech change)
- Past slots filtered for today (API + client via `filterPastSlots`)
- Business hours lookup fixed (`getBusinessHoursForDate` matches day **name**, not wrong array index)
- Closed days (Sunday) dimmed/disabled in picker; auto-skips to next open day
- Confirmation screen shows booking summary (services, date, time, tech, estimated total)
- **"Any" technician** bookings set `any_technician: true` and `technician_id: null` — appear in admin "Any Employee" column

**APIs:**
- `GET /api/availability` — open slots (15-min intervals, time-off, busy windows, past-slot filter)
- `POST /api/appointments` — validates & creates booking; rejects past times

**Logic split (important for imports):**
- `lib/booking/time-utils.ts` — client-safe date/time helpers
- `lib/booking/service-utils.ts` — client-safe service lookups
- `lib/booking/availability.ts` — **server-only** slot computation + Supabase queries

### Admin (`/admin`)
**Auth:** `/admin/login` → must be in `admin_users`

**Nav:** `components/admin/AdminNav.tsx` — **Agenda** | **Analytics**

**Agenda** (`/admin`):
- Columns: **Any Employee** + each technician
- Drag-and-drop booked appointments between columns (HTML5 DnD); PATCH updates tech or `any_technician`
- Walk-In / Phone Booking panels with iOS-style `TimeWheelPicker`; buttons toggle open/close
- Off / Sick toggle per technician
- Realtime toast on new online booking
- Click appointment → detail page

**Appointment detail** (`/admin/appointments/[id]`):
- View original booking snapshot (never overwritten)
- Complete / Cancel / No-Show / **Edit / Move**

**Completion** (`/admin/appointments/[id]/complete`):
- Preloads booked services; one-click complete if unchanged
- Editable line items, retail, discount, tip, tax, payment method
- Creates `completed_transactions` + `transaction_line_items`; sets status `completed`

**Edit / Move** (`/admin/appointments/[id]/edit`):
- Reschedule, change tech (including Any Employee), client info, services

**Analytics** (`/admin/analytics`):
- Owner-friendly simplified default view: Money Made hero, revenue trend, needs-attention alerts
- Expandable **Full Report**: staff performance, charts, financial breakdown, date ranges
- Revenue metrics from **completed transactions only**
- Recharts for pie/line/bar charts

### Admin APIs
| Route | Purpose |
|-------|---------|
| `GET/PATCH /api/admin/appointments/[id]` | Read / update appointment |
| `POST /api/admin/appointments/[id]/complete` | Finalize transaction |
| `PATCH /api/admin/appointments/[id]/status` | cancel, no_show |
| `GET /api/admin/analytics` | KPIs + chart data |
| `POST /api/admin/quick-booking` | walk-in or phone |
| `POST /api/admin/time-off` | mark tech off for day |

---

## 7. Database Architecture

### Core (schema.sql)
- `appointments`, `appointment_services`, `services`, `technicians`, `technician_time_off`, `admin_users`

### Migration 002 — completion & analytics
- `clients`, `retail_products`, `completed_transactions`, `transaction_line_items`
- `appointments.client_id`, `appointments.estimated_total`
- RLS: admin-only on new tables

### Migration 003 — any technician
- `appointments.any_technician boolean default false`
- Online "Any" bookings: `any_technician=true`, `technician_id=null`
- Availability treats any-tech bookings as blocking all technicians for that window

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
| Supabase migrations | Must run 002 + 003 in Supabase if not already applied |
| Dev server cache | If white screen / module errors, delete `.next` and restart `npm run dev` |
| Port conflicts | Kill stale node on :3000 if dev server falls back to :3001 |
| Gift cards / deposits | Placeholders in analytics breakdown (always $0 until implemented) |
| SMS confirmations | Alert stubs only — no Twilio integration yet |
| Payroll / inventory | Not built; dashboard architecture allows future expansion |

---

## 9. File Map (key files)

```
app/
  admin/
    layout.tsx                      # AdminNav wrapper
    page.tsx                        # Agenda (server)
    analytics/page.tsx
    appointments/[id]/page.tsx
    appointments/[id]/complete/page.tsx
    appointments/[id]/edit/page.tsx
  api/
    availability/route.ts
    appointments/route.ts
    admin/analytics/route.ts
    admin/appointments/[id]/route.ts
    admin/appointments/[id]/complete/route.ts
    admin/appointments/[id]/status/route.ts
    admin/quick-booking/route.ts
    admin/time-off/route.ts

components/
  booking/BookingFlow.tsx
  admin/AdminDashboard.tsx          # Agenda + drag-drop + quick booking
  admin/AppointmentCard.tsx
  admin/AppointmentDetailView.tsx
  admin/CompleteAppointmentForm.tsx
  admin/EditAppointmentForm.tsx
  admin/analytics/                  # AnalyticsDashboard, HeroStats, etc.
  ui/TimeWheelPicker.tsx
  layout/SiteChrome.tsx

lib/
  config/salonData.ts
  booking/time-utils.ts             # Client-safe
  booking/service-utils.ts          # Client-safe
  booking/availability.ts         # Server-only
  admin/update-appointment.ts       # Server-only PATCH logic
  admin/constants.ts                # ANY_EMPLOYEE_ID, label
  analytics/                        # date-ranges, queries, types
  completion/                       # calculate-totals, validate, types
  clients/resolve-client.ts

supabase/
  schema.sql
  migrations/002_completion_analytics.sql
  migrations/003_any_technician.sql
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
3. Agenda at `/admin`, Analytics at `/admin/analytics`

---

## 11. User Preferences

- Production-quality, scalable code — refactor don't layer hacks
- Minimize owner clicks (one-click complete when unchanged)
- iPad-first admin, mobile-first customer site
- Use `salonData.ts` for business data — no hardcoded fake services
- Only commit when user asks
- Simplified analytics default view; full report collapsed behind toggle

---

## 12. Copy-Paste Prompt for Next AI Session

```
Read plan.md in the project root first.

The completion workflow, analytics dashboard, admin edit/move, drag-drop agenda, and booking fixes are implemented. Check §8 for remaining gaps.

Before new features, confirm Supabase migrations 002 and 003 are applied in the user's project.

Rules:
- Revenue metrics = completed transactions only
- Never overwrite original booking data (appointment_services)
- Match existing design (warm beige, serif headings, sharp black)
- Use salonData.ts for services/retail; server-side validation for financial data
- Split client vs server imports: time-utils/service-utils (client) vs availability.ts (server-only)
- Only commit when user asks
```

---

*End of handoff document.*
