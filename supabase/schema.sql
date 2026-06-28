-- ============================================================================
--  NAIL TEK & SPA — DATABASE SCHEMA
-- ============================================================================
--  Run this in the Supabase SQL editor (Dashboard > SQL Editor > New query).
--
--  Design notes
--  ------------
--  * `services` and `technicians` mirror the ids used in lib/config/salonData.ts
--    so the booking engine and admin dashboard can join against bookings.
--  * Appointments store an explicit start/end time. Durations come from the
--    selected services (summed) at booking time, snapped to 15-minute blocks.
--  * `appointment_services` is a junction table so one appointment can include
--    multiple services (and supports the "add guest" multi-service flow).
--  * `technician_time_off` powers the admin "Off / Out Sick" toggle and removes
--    a tech from availability for a day (or a specific window).
--  * Row Level Security: the public can create bookings and read the data needed
--    to compute availability; only authenticated admin users can manage records.
-- ============================================================================

-- Extensions ----------------------------------------------------------------
create extension if not exists "pgcrypto";

-- Enums ---------------------------------------------------------------------
do $$ begin
  create type appointment_status as enum ('booked', 'completed', 'cancelled', 'no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_source as enum ('online', 'walk_in', 'phone');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
--  SERVICES  (mirrors salonData.ts; id is the text slug e.g. "mani-gel")
-- ----------------------------------------------------------------------------
create table if not exists public.services (
  id               text primary key,
  category_id      text not null,
  name             text not null,
  description      text,
  price            numeric(10, 2) not null default 0,
  duration_minutes integer not null default 30,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  TECHNICIANS  (id is the text slug e.g. "tech-linh")
-- ----------------------------------------------------------------------------
create table if not exists public.technicians (
  id               text primary key,
  name             text not null,
  role             text,
  is_active        boolean not null default true,
  display_order    integer not null default 0,
  created_at       timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  APPOINTMENTS
-- ----------------------------------------------------------------------------
create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  technician_id    text references public.technicians (id) on delete set null,
  customer_name    text not null,
  customer_phone   text not null,
  customer_email   text,
  -- A booking for a guest is grouped to its primary booking via this id.
  party_group_id   uuid,
  is_guest         boolean not null default false,
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  status           appointment_status not null default 'booked',
  source           appointment_source not null default 'online',
  sms_consent      boolean not null default false,
  notes            text,
  any_technician   boolean not null default false,
  created_at       timestamptz not null default now(),
  constraint appointments_time_valid check (ends_at > starts_at)
);

create index if not exists appointments_starts_at_idx on public.appointments (starts_at);
create index if not exists appointments_tech_time_idx on public.appointments (technician_id, starts_at);

-- ----------------------------------------------------------------------------
--  APPOINTMENT <-> SERVICES  (junction; supports multi-service bookings)
-- ----------------------------------------------------------------------------
create table if not exists public.appointment_services (
  id               uuid primary key default gen_random_uuid(),
  appointment_id   uuid not null references public.appointments (id) on delete cascade,
  service_id       text not null references public.services (id),
  -- Snapshot price/duration at time of booking (so later edits to a service
  -- don't rewrite history).
  price_at_booking numeric(10, 2) not null default 0,
  duration_at_booking integer not null default 0
);

create index if not exists appointment_services_appt_idx
  on public.appointment_services (appointment_id);

-- ----------------------------------------------------------------------------
--  TECHNICIAN TIME OFF  (powers the "Off / Out Sick" toggle)
-- ----------------------------------------------------------------------------
create table if not exists public.technician_time_off (
  id               uuid primary key default gen_random_uuid(),
  technician_id    text not null references public.technicians (id) on delete cascade,
  -- The calendar day this applies to (local salon date).
  off_date         date not null,
  -- full_day = true blocks the entire day; otherwise use the time window.
  full_day         boolean not null default true,
  starts_at        timestamptz,
  ends_at          timestamptz,
  reason           text,
  created_at       timestamptz not null default now()
);

create index if not exists technician_time_off_idx
  on public.technician_time_off (technician_id, off_date);

create unique index if not exists technician_time_off_full_day_unique
  on public.technician_time_off (technician_id, off_date)
  where full_day = true;

-- ----------------------------------------------------------------------------
--  TECHNICIAN SCHEDULES  (recurring weekly working hours)
-- ----------------------------------------------------------------------------
alter table public.technicians
  add column if not exists bio text,
  add column if not exists avatar_url text;

create table if not exists public.technician_schedules (
  technician_id   text not null references public.technicians (id) on delete cascade,
  day_of_week     smallint not null check (day_of_week >= 0 and day_of_week <= 6),
  is_working      boolean not null default false,
  start_time      time,
  end_time        time,
  primary key (technician_id, day_of_week),
  constraint technician_schedules_time_valid check (
    (is_working = false and start_time is null and end_time is null)
    or (is_working = true and start_time is not null and end_time is not null and end_time > start_time)
  )
);

create index if not exists technician_schedules_day_idx
  on public.technician_schedules (day_of_week, is_working);

-- ----------------------------------------------------------------------------
--  ADMIN USERS  (only these authenticated users can access /admin data)
-- ----------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  email            text unique,
  created_at       timestamptz not null default now()
);

create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

-- ============================================================================
--  ROW LEVEL SECURITY
-- ============================================================================
alter table public.services             enable row level security;
alter table public.technicians          enable row level security;
alter table public.appointments         enable row level security;
alter table public.appointment_services enable row level security;
alter table public.technician_time_off  enable row level security;
alter table public.technician_schedules enable row level security;
alter table public.admin_users          enable row level security;

-- Public (anon) READ access to reference data needed to render the site and
-- compute availability.
create policy "public read services"
  on public.services for select using (true);

create policy "public read technicians"
  on public.technicians for select using (true);

create policy "public read time off"
  on public.technician_time_off for select using (true);

create policy "public read technician schedules"
  on public.technician_schedules for select using (true);

-- The booking engine needs only busy windows to compute availability. Column
-- grants below prevent anon users from reading customer names/phones/emails.
create policy "public read booked appointment windows"
  on public.appointments for select using (status = 'booked');

-- Online bookings are created through the Next.js server route, which validates
-- service ids, durations, availability, and SMS consent before inserting with
-- the server-only Supabase key. Do not allow direct anon inserts here.

-- Authenticated admin users have full control.
create policy "admin manage services"
  on public.services for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "admin manage technicians"
  on public.technicians for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "admin manage appointments"
  on public.appointments for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "admin manage appointment services"
  on public.appointment_services for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "admin manage time off"
  on public.technician_time_off for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "admin manage technician schedules"
  on public.technician_schedules for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "admin manage admin users"
  on public.admin_users for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- Column-level grants: anon clients can compute availability without PII.
revoke select on public.appointments from anon;
grant select (id, technician_id, any_technician, starts_at, ends_at, status)
  on public.appointments to anon;

revoke select on public.technician_time_off from anon;
grant select (id, technician_id, off_date, full_day, starts_at, ends_at)
  on public.technician_time_off to anon;

-- ============================================================================
--  REALTIME  (for the admin "new booking" toast notification)
-- ============================================================================
alter publication supabase_realtime add table public.appointments;
