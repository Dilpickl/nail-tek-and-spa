-- ============================================================================
--  SEED DATA — keep in sync with lib/config/salonData.ts
-- ============================================================================
--  Run AFTER schema.sql. Safe to re-run (upserts on primary key).
-- ============================================================================

-- Technicians ---------------------------------------------------------------
insert into public.technicians (id, name, role, is_active, display_order) values
  ('tech-linh',  'Linh Tran',   'Founder & Master Nail Technician', true, 1),
  ('tech-maria', 'Maria Santos','Senior Pedicure Specialist',       true, 2),
  ('tech-james', 'James Cole',  'Nail Artist',                      true, 3),
  ('tech-amy',   'Amy Nguyen',  'Nail Technician',                  true, 4)
on conflict (id) do update
  set name = excluded.name,
      role = excluded.role,
      is_active = excluded.is_active,
      display_order = excluded.display_order;

-- Services ------------------------------------------------------------------
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

-- Retail products (mirrors lib/config/salonData.ts retailProducts) ------------
insert into public.retail_products (id, name, price, category, is_active) values
  ('retail-cuticle-oil', 'Cuticle Oil',       12, 'Care',        true),
  ('retail-hand-cream',  'Hand Cream',        18, 'Care',        true),
  ('retail-nail-file',   'Glass Nail File',    8, 'Tools',       true),
  ('retail-polish',      'Nail Polish',       14, 'Color',       true),
  ('retail-gift-card',   'Gift Card',         50, 'Gift Cards',  true)
on conflict (id) do update
  set name = excluded.name,
      price = excluded.price,
      category = excluded.category,
      is_active = excluded.is_active;
