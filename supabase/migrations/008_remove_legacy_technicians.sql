-- Remove legacy placeholder technicians (Linh, Maria, James, Amy).
-- Appointments.technician_id is ON DELETE SET NULL, so past bookings are kept.

delete from public.technician_schedule_overrides
where technician_id in ('tech-linh', 'tech-maria', 'tech-james', 'tech-amy');

delete from public.technician_schedules
where technician_id in ('tech-linh', 'tech-maria', 'tech-james', 'tech-amy');

delete from public.technician_time_off
where technician_id in ('tech-linh', 'tech-maria', 'tech-james', 'tech-amy');

delete from public.technicians
where id in ('tech-linh', 'tech-maria', 'tech-james', 'tech-amy');
