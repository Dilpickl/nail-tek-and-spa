-- ============================================================================
--  First-party website conversion
-- ============================================================================
--  Vercel Web Analytics only keeps about a month of visitors. This table keeps
--  page views, call taps, and online bookings in our own database so conversion
--  can be measured for any date range.
--
--  A conversion is a person who books online or taps the phone number.
--  Each person counts once. Call taps are the measurable "they called" event:
--  the call itself happens on their phone, so we cannot see whether it connected.
--
--  Run in the Supabase SQL editor after 012.
-- ============================================================================

create table if not exists public.site_events (
  id              uuid primary key default gen_random_uuid(),
  visitor_id      uuid not null,
  session_id      uuid not null,
  event_type      text not null check (event_type in ('pageview', 'call_click', 'booking')),
  path            text,
  placement       text,
  appointment_id  uuid references public.appointments (id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists site_events_created_idx
  on public.site_events (created_at);

create index if not exists site_events_type_created_idx
  on public.site_events (event_type, created_at);

create index if not exists site_events_visitor_created_idx
  on public.site_events (visitor_id, created_at);

create index if not exists appointments_source_created_idx
  on public.appointments (source, created_at);

alter table public.site_events enable row level security;

revoke all on table public.site_events from public, anon, authenticated;

-- Aggregates for the admin analytics card. Service role only.
create or replace function public.website_conversion(
  range_from timestamptz,
  range_to timestamptz
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with tracking_start as (
    select min(created_at) as started_at
    from public.site_events
    where event_type = 'pageview'
  ),
  events as (
    select
      visitor_id,
      session_id,
      event_type,
      created_at,
      (created_at at time zone 'UTC')::date as day
    from public.site_events
    where created_at >= range_from
      and created_at <= range_to
  ),
  online as (
    select (created_at at time zone 'UTC')::date as day
    from public.appointments, tracking_start
    where source = 'online'
      and is_guest = false
      and created_at >= range_from
      and created_at <= range_to
      and tracking_start.started_at is not null
      and created_at >= tracking_start.started_at
  ),
  phone as (
    select 1
    from public.appointments, tracking_start
    where source = 'phone'
      and is_guest = false
      and created_at >= range_from
      and created_at <= range_to
      and tracking_start.started_at is not null
      and created_at >= tracking_start.started_at
  ),
  event_days as (
    select
      day,
      count(distinct visitor_id) filter (where event_type = 'pageview') as visitors,
      count(distinct visitor_id) filter (where event_type = 'call_click') as calls
    from events
    group by day
  ),
  booking_days as (
    select day, count(*) as bookings
    from online
    group by day
  ),
  all_days as (
    select day from event_days
    union
    select day from booking_days
  )
  select jsonb_build_object(
    'trackingStartedAt', (select started_at from tracking_start),
    'pageviews', (select count(*) from events where event_type = 'pageview'),
    'visitors', (select count(distinct visitor_id) from events where event_type = 'pageview'),
    'sessions', (select count(distinct session_id) from events where event_type = 'pageview'),
    'callers', (select count(distinct visitor_id) from events where event_type = 'call_click'),
    'callTaps', (select count(*) from events where event_type = 'call_click'),
    'bookers', (select count(distinct visitor_id) from events where event_type = 'booking'),
    'converters', (
      select count(distinct visitor_id)
      from events
      where event_type in ('call_click', 'booking')
    ),
    'onlineBookings', (select count(*) from online),
    'phoneAppointments', (select count(*) from phone),
    'daily', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'date', to_char(all_days.day, 'YYYY-MM-DD'),
          'visitors', coalesce(event_days.visitors, 0),
          'calls', coalesce(event_days.calls, 0),
          'bookings', coalesce(booking_days.bookings, 0)
        )
        order by all_days.day
      )
      from all_days
      left join event_days using (day)
      left join booking_days using (day)
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.website_conversion(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.website_conversion(timestamptz, timestamptz) to service_role;
