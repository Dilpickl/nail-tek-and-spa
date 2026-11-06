-- Update Organic and Volcanic spa pedicure menu prices.
-- Organic Spa Pedicure: $45. Volcanic Spa Pedicure: $55.
-- Historical appointment_services.price_at_booking rows are left unchanged.

update public.services
set price = 45
where id = 'pedi-organic';

update public.services
set price = 55
where id = 'pedi-volcanic';
