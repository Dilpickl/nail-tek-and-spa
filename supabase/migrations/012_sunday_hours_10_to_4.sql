-- Sunday salon hours are 10:00–16:00.
-- Move technician schedules that still use the previous Sunday window
-- (11:00–17:00) onto the new hours. Other Sunday schedules are clamped
-- so they stay inside 10:00–16:00 when they overlap that window.

update public.technician_schedules
set start_time = time '10:00',
    end_time = time '16:00'
where day_of_week = 0
  and is_working = true
  and start_time = time '11:00'
  and end_time = time '17:00';

update public.technician_schedules
set start_time = greatest(start_time, time '10:00'),
    end_time = least(end_time, time '16:00')
where day_of_week = 0
  and is_working = true
  and (start_time < time '10:00' or end_time > time '16:00')
  and greatest(start_time, time '10:00') < least(end_time, time '16:00');
