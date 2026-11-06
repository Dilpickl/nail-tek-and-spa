-- ============================================================================
--  Site behavior: sources, devices, pages, booking drop-off, and button taps
-- ============================================================================
--  Extends 013. Safe to run on its own: it creates site_events if needed.
--  Run in the Supabase SQL editor.
-- ============================================================================

create table if not exists public.site_events (
  id              uuid primary key default gen_random_uuid(),
  visitor_id      uuid not null,
  session_id      uuid not null,
  event_type      text not null,
  path            text,
  placement       text,
  referrer_host   text,
  device          text,
  appointment_id  uuid references public.appointments (id) on delete set null,
  created_at      timestamptz not null default now()
);

alter table public.site_events add column if not exists referrer_host text;
alter table public.site_events add column if not exists device text;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'site_events'
      and con.contype = 'c'
      and (
        pg_get_constraintdef(con.oid) ilike '%event_type%'
        or pg_get_constraintdef(con.oid) ilike '%device%'
      )
  loop
    execute format('alter table public.site_events drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.site_events
  add constraint site_events_event_type_check
  check (event_type in ('pageview', 'call_click', 'booking', 'cta_click', 'booking_step'));

alter table public.site_events
  add constraint site_events_device_check
  check (device is null or device in ('phone', 'tablet', 'desktop'));

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
      path,
      placement,
      referrer_host,
      device,
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
  ),
  new_visitors as (
    select visitor_id
    from public.site_events
    where event_type = 'pageview'
    group by visitor_id
    having min(created_at) >= range_from
       and min(created_at) <= range_to
  ),
  session_rollup as (
    select
      session_id,
      count(*) filter (where event_type = 'pageview') as views,
      bool_or(event_type in ('call_click', 'booking', 'cta_click', 'booking_step')) as acted
    from events
    group by session_id
  ),
  first_hit as (
    select distinct on (session_id)
      session_id,
      visitor_id,
      path,
      coalesce(nullif(referrer_host, ''), '(direct)') as host
    from events
    where event_type = 'pageview'
    order by session_id, created_at
  ),
  visitor_device as (
    select distinct on (visitor_id)
      visitor_id,
      coalesce(device, 'unknown') as device
    from events
    where event_type = 'pageview'
    order by visitor_id, created_at
  ),
  converted as (
    select distinct visitor_id
    from events
    where event_type in ('call_click', 'booking')
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
    'engagementReady', true,
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
    ), '[]'::jsonb),
    'engagement', jsonb_build_object(
      'bounceSessions', (
        select count(*) from session_rollup where views = 1 and acted is not true
      ),
      'measuredSessions', (select count(*) from session_rollup where views > 0),
      'newVisitors', (select count(*) from new_visitors),
      'returningVisitors', (
        select count(*) from (
          select distinct visitor_id from events where event_type = 'pageview'
          except
          select visitor_id from new_visitors
        ) returning_visitors
      ),
      'devices', coalesce((
        select jsonb_agg(jsonb_build_object(
          'device', device,
          'visitors', visitors,
          'conversions', conversions
        ))
        from (
          select
            visitor_device.device,
            count(*) as visitors,
            count(*) filter (where converted.visitor_id is not null) as conversions
          from visitor_device
          left join converted using (visitor_id)
          group by visitor_device.device
        ) device_counts
      ), '[]'::jsonb),
      'sources', coalesce((
        select jsonb_agg(jsonb_build_object('host', host, 'visits', visits))
        from (
          select host, count(*) as visits
          from first_hit
          group by host
        ) source_counts
      ), '[]'::jsonb),
      'landings', coalesce((
        select jsonb_agg(jsonb_build_object('path', path, 'visits', visits))
        from (
          select path, count(*) as visits
          from first_hit
          where path is not null
          group by path
        ) landing_counts
      ), '[]'::jsonb),
      'pages', coalesce((
        select jsonb_agg(jsonb_build_object(
          'path', path,
          'views', views,
          'visitors', visitors
        ))
        from (
          select
            path,
            count(*) as views,
            count(distinct visitor_id) as visitors
          from events
          where event_type = 'pageview'
            and path is not null
          group by path
        ) page_counts
      ), '[]'::jsonb),
      'calls', coalesce((
        select jsonb_agg(jsonb_build_object('placement', placement, 'people', people))
        from (
          select placement, count(distinct visitor_id) as people
          from events
          where event_type = 'call_click'
            and placement is not null
          group by placement
        ) call_counts
      ), '[]'::jsonb),
      'ctas', coalesce((
        select jsonb_agg(jsonb_build_object('placement', placement, 'people', people))
        from (
          select placement, count(distinct visitor_id) as people
          from events
          where event_type = 'cta_click'
            and placement is not null
          group by placement
        ) cta_counts
      ), '[]'::jsonb),
      'funnel', coalesce((
        select jsonb_agg(jsonb_build_object('step', step, 'people', people))
        from (
          select placement as step, count(distinct visitor_id) as people
          from events
          where event_type = 'booking_step'
            and placement is not null
          group by placement
          union all
          select 'booked', count(distinct visitor_id)
          from events
          where event_type = 'booking'
        ) funnel_counts
      ), '[]'::jsonb)
    )
  );
$$;

revoke all on function public.website_conversion(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.website_conversion(timestamptz, timestamptz) to service_role;
