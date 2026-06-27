# Nail Tek & Spa — AI Handoff / Context Refresh

> **Purpose:** Give the next Cursor AI session everything needed to continue work without re-discovering the codebase.  
> **Last updated:** June 27, 2026  
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
5. Run `supabase/seed.sql`
6. Create auth user: Dashboard → Authentication → Users → Add user
7. Grant admin:
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
| HEAD | `6464073` — run `git log -1 --oneline` after pull |

**Recent commits (newest first):**
- `6464073` — Update plan.md handoff for multi-guest bookings and recent admin UX
- `4d27dad` — Fix booking validation scroll-to-error for guest service selection
- `1c6ac93` — Split multi-guest bookings into per-guest appointments; admin highlights; party UX
- `2937d86` — Fix booking availability, admin agenda, and UI polish

---

## 5. Design & Content Decisions

### Visual direction
- Premium warm-beige/serif aesthetic (not the brief trendy redesign that was reverted)
- Keep **30+ years** (established 1994), not 40+
- Admin uses Agenda | Analytics nav; customer site uses Header/Footer via `SiteChrome` (admin routes hide site chrome)
- Admin login heading: **"Hello, Travis."**
- **Complete Appointment** button uses emerald green (`emerald-700`), not black primary

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

5 steps: Services → Technician (specific or "Any") → Date & Time → Details → Confirm

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
- `POST /api/appointments` — creates N appointments for party; rollback on failure

**Logic split (important for imports):**
- `lib/booking/time-utils.ts` — client-safe date/time helpers
- `lib/booking/service-utils.ts` — client-safe service lookups + `BookingPartyMember` type
- `lib/booking/party-scheduling.ts` — **server-only** party assignment + validation helpers
- `lib/booking/slot-capacity.ts` — **server-only** chair/tech usage per slot
- `lib/booking/availability.ts` — **server-only** slot computation + Supabase queries

### Admin (`/admin`)
**Auth:** `/admin/login` → must be in `admin_users`

**Nav:** `components/admin/AdminNav.tsx` — **Agenda** | **Analytics**

**Agenda** (`/admin`):
- **Day navigation:** `?date=YYYY-MM-DD`, prev/next, "Back to today"; heading shows Today / Tomorrow / Agenda
- Columns: **Any Employee** + each technician
- Drag-and-drop booked appointments between columns; PATCH updates tech or `any_technician`
- **Party bookings** show as separate cards per guest; badge "Party of N" (and "Guest ·" for non-primary)
- **New booking highlight:** green ring + "New" badge for ~12s (walk-in/phone + realtime online inserts); `lib/admin/highlight-appointments.ts`
- Walk-In / Phone Booking: multi-service dropdown, default tech Any Employee, walk-in has no phone field
- Off / Sick toggle per technician
- Click appointment → detail page

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

### Admin APIs
| Route | Purpose |
|-------|---------|
| `GET/PATCH /api/admin/appointments/[id]` | Read / update appointment |
| `POST /api/admin/appointments/[id]/complete` | Finalize transaction |
| `PATCH /api/admin/appointments/[id]/status` | cancel, no_show |
| `GET /api/admin/analytics` | KPIs + chart data |
| `POST /api/admin/quick-booking` | walk-in or phone (multi-service, any tech) |
| `POST /api/admin/time-off` | mark tech off for day |

---

## 7. Database Architecture

### Core (schema.sql)
- `appointments` — includes `party_group_id uuid`, `is_guest boolean`, `any_technician boolean`
- `appointment_services`, `services`, `technicians`, `technician_time_off`, `admin_users`

### Migration 002 — completion & analytics
- `clients`, `retail_products`, `completed_transactions`, `transaction_line_items`
- `appointments.client_id`, `appointments.estimated_total`
- RLS: admin-only on new tables

### Migration 003 — any technician
- `appointments.any_technician boolean default false`

### Migration 004 — anon any-technician grant
- RLS/grants for anonymous availability reads needed by booking flow

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
| Supabase migrations | Must run 002, 003, **004** in Supabase if not already applied |
| Dev server cache | If white screen / module errors, delete `.next` and restart `npm run dev` |
| Port conflicts | Kill stale node on :3000 if dev server falls back to :3001 |
| Legacy party bookings | Old single-row multi-guest bookings (pre `1c6ac93`) may still exist in DB; new bookings split per guest |
| Sequential vs parallel | Online booking is **parallel same start time** only; no back-to-back party option yet |
| Gift cards / deposits | Placeholders in analytics breakdown (always $0 until implemented) |
| SMS confirmations | Alert stubs only — no Twilio integration yet |
| Payroll / inventory | Not built |

---

## 9. File Map (key files)

```
app/
  admin/
    page.tsx                        # Agenda + ?date= nav (server)
    appointments/[id]/page.tsx        # Detail + party siblings
  api/
    availability/route.ts           # party JSON param
    appointments/route.ts           # multi-row party insert
    admin/quick-booking/route.ts

components/
  booking/BookingFlow.tsx           # Party UI, scroll-to-error validation
  admin/AdminDashboard.tsx          # Agenda, highlights, quick booking, ServiceMultiSelect
  admin/AppointmentCard.tsx         # Party badge, isNew highlight
  admin/AppointmentDetailView.tsx   # Confirm modals, party list, emerald Complete link
  ui/TimeWheelPicker.tsx

lib/
  booking/party-scheduling.ts       # assignTechniciansForParty, parsePartyPayload
  booking/slot-capacity.ts          # getSlotUsage
  booking/availability.ts           # getAvailableSlots (party-aware)
  admin/highlight-appointments.ts   # sessionStorage queue for new card highlights
  admin/update-appointment.ts       # Allows tech-only moves without services

supabase/
  schema.sql
  migrations/002_completion_analytics.sql
  migrations/003_any_technician.sql
  migrations/004_anon_any_technician_grant.sql
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

**Dev server is currently stopped** (user requested shutdown before context reset).

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
- Don't expose internal admin concepts in customer-facing copy (e.g. "salon agenda")

---

## 12. Copy-Paste Prompt for Next AI Session

```
Read plan.md in the project root first.

Recent work (June 2026): multi-guest bookings create one appointment per guest (party_group_id), parallel availability via party-scheduling.ts, admin party badges + new-booking highlights, booking scroll-to-error validation for guest names/services, cancel/no-show confirmation modals, agenda day navigation, quick-booking multi-service panel.

HEAD should be 6464073 or later on master. Confirm migrations 002–004 applied in Supabase.

Rules:
- Revenue metrics = completed transactions only
- Never overwrite original booking data (appointment_services)
- Match existing design (warm beige, serif headings, sharp black; emerald for Complete)
- Use salonData.ts for services/retail; server-side validation for financial data
- Split client vs server imports: time-utils/service-utils (client) vs availability/party-scheduling/slot-capacity (server-only)
- Only commit when user asks
```

---

*End of handoff document.*
