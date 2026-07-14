-- Remove Princess and Deluxe pedicures from the active catalog.
-- Keep rows (soft-delete) so historical appointment_services FKs remain valid.

update public.services
set is_active = false,
    name = case id
      when 'pedi-deluxe' then 'Deluxe Spa Pedicure (Retired)'
      when 'pedi-princess' then 'Princess Spa Pedicure (Retired)'
      else name
    end
where id in ('pedi-deluxe', 'pedi-princess');
