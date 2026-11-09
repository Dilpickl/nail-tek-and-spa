-- Custom Nail Art is booked on top of a manicure, pedicure or set and adds
-- 15 minutes to the visit. Historical appointment_services rows are unchanged.

update public.services
set duration_minutes = 15
where id = 'addon-art';
