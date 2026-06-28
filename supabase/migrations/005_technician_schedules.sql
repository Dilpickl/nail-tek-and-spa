-- ============================================================================
--  TECHNICIAN SCHEDULES — recurring weekly working hours per employee
-- ============================================================================

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

alter table public.technician_schedules enable row level security;

create policy "public read technician schedules"
  on public.technician_schedules for select using (true);

create policy "admin manage technician schedules"
  on public.technician_schedules for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- Seed default schedules for existing technicians (Mon–Sat salon hours, Sun off)
-- day_of_week: 0=Sunday, 1=Monday, …, 6=Saturday
insert into public.technician_schedules (technician_id, day_of_week, is_working, start_time, end_time)
select t.id, d.day_of_week, d.is_working, d.start_time::time, d.end_time::time
from public.technicians t
cross join (
  values
    (0, false, null::text, null::text),
    (1, true,  '09:00', '19:00'),
    (2, true,  '09:00', '19:00'),
    (3, true,  '09:00', '19:00'),
    (4, true,  '09:00', '20:00'),
    (5, true,  '09:00', '20:00'),
    (6, true,  '08:30', '18:00')
) as d(day_of_week, is_working, start_time, end_time)
on conflict (technician_id, day_of_week) do update
  set is_working = excluded.is_working,
      start_time = excluded.start_time,
      end_time = excluded.end_time;
