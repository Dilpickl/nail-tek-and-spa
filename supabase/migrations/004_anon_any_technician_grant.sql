-- Allow anon availability reads to distinguish assigned vs unassigned bookings.
grant select (id, technician_id, any_technician, starts_at, ends_at, status)
  on public.appointments to anon;
