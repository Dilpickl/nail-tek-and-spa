-- Track appointments booked without a specific technician preference.
alter table public.appointments
  add column if not exists any_technician boolean not null default false;

create index if not exists appointments_any_technician_idx
  on public.appointments (any_technician)
  where any_technician = true;
