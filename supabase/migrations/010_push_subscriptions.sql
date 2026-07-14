-- ============================================================================
--  Admin web-push subscriptions + reminder idempotency
-- ============================================================================
--  Used by the iOS home-screen PWA for:
--    * New booking alerts
--    * 5-minute-before appointment reminders
-- ============================================================================

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

create table if not exists public.appointment_reminder_sends (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references public.appointments (id) on delete cascade,
  kind            text not null default 'upcoming_5min',
  sent_at         timestamptz not null default now(),
  unique (appointment_id, kind)
);

create index if not exists appointment_reminder_sends_appt_idx
  on public.appointment_reminder_sends (appointment_id);

alter table public.push_subscriptions enable row level security;
alter table public.appointment_reminder_sends enable row level security;

-- Admins manage their own subscription rows via the service-role API routes.
-- No anon/authenticated client policies needed for direct table access.
