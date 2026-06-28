-- ============================================================================
--  SERVICE VARIANTS SYNC + SCHEDULE OVERRIDES
-- ============================================================================
--  Ensures all bookable service ids (including nail art variants) exist in DB.
--  Adds date-specific schedule overrides for planned time off / custom hours.
-- ============================================================================

-- Sync all services (mirrors supabase/seed.sql + lib/config/salonData.ts)
insert into public.services (id, category_id, name, description, price, duration_minutes) values
  ('mani-classic',     'manicures',    'Classic Manicure',         'Nail shaping, cuticle care, hand massage, polish.',          28, 30),
  ('mani-gel',         'manicures',    'Gel Manicure',             'Long-lasting, chip-resistant gel color.',                    42, 45),
  ('mani-spa',         'manicures',    'Signature Spa Manicure',   'Classic manicure with scrub, mask, extended massage.',       55, 60),
  ('pedi-classic',     'pedicures',    'Classic Pedicure',         'Soak, nail care, callus smoothing, massage, polish.',        40, 45),
  ('pedi-deluxe',      'pedicures',    'Deluxe Spa Pedicure',      'Sea salt scrub, mask, hot towels, extended leg massage.',    65, 60),
  ('pedi-gel',         'pedicures',    'Gel Pedicure',             'Classic pedicure with durable gel color.',                   55, 60),
  ('enh-acrylic-full', 'enhancements', 'Acrylic Full Set',         'Custom-sculpted acrylic extensions.',                        60, 75),
  ('enh-acrylic-fill', 'enhancements', 'Acrylic Fill',             'Maintenance fill for existing acrylic set.',                 45, 60),
  ('enh-dip',          'enhancements', 'Dip Powder Set',           'Lightweight, durable dip powder color.',                     50, 60),
  ('addon-art-simple', 'art-addons',   'Nail Art (per nail)',      'Hand-painted designs and accents.',                           5, 15),
  ('addon-art-hand-painted', 'art-addons', 'Nail Art — Hand-painted design', 'Hand-painted designs and accents.',              5, 15),
  ('addon-art-gemstones',    'art-addons', 'Nail Art — Gemstones',           'Gemstone embellishments per nail.',                8, 15),
  ('addon-art-airbrush',     'art-addons', 'Nail Art — Airbrush',            'Airbrush nail art per nail.',                     10, 20),
  ('addon-art-3d',           'art-addons', 'Nail Art — 3D art',              '3D sculpted nail art per nail.',                  12, 20),
  ('addon-french',     'art-addons',   'French Tip',               'Timeless French finish added to any service.',               10, 15),
  ('addon-removal',    'art-addons',   'Soak-Off Removal',         'Gentle removal of gel, acrylic, or dip.',                    15, 15)
on conflict (id) do update
  set category_id = excluded.category_id,
      name = excluded.name,
      description = excluded.description,
      price = excluded.price,
      duration_minutes = excluded.duration_minutes;

-- Date-specific schedule overrides (planned time off or custom hours)
create table if not exists public.technician_schedule_overrides (
  id               uuid primary key default gen_random_uuid(),
  technician_id    text not null references public.technicians (id) on delete cascade,
  override_date    date not null,
  is_working       boolean not null default false,
  start_time       time,
  end_time         time,
  reason           text,
  created_at       timestamptz not null default now(),
  unique (technician_id, override_date),
  constraint technician_schedule_overrides_time_valid check (
    (is_working = false and start_time is null and end_time is null)
    or (is_working = true and start_time is not null and end_time is not null and end_time > start_time)
  )
);

create index if not exists technician_schedule_overrides_date_idx
  on public.technician_schedule_overrides (override_date, technician_id);

alter table public.technician_schedule_overrides enable row level security;

create policy "public read schedule overrides"
  on public.technician_schedule_overrides for select using (true);

create policy "admin manage schedule overrides"
  on public.technician_schedule_overrides for all to authenticated
  using (private.is_admin()) with check (private.is_admin());
