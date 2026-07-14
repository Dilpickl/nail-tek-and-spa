-- ============================================================================
--  SEED DATA — keep in sync with lib/config/salonData.ts
-- ============================================================================
--  Run AFTER schema.sql. Safe to re-run (upserts on primary key).
-- ============================================================================

-- Technicians ---------------------------------------------------------------
insert into public.technicians (id, name, role, is_active, display_order) values
  ('tech-travis', 'Travis', 'Owner & Nail Technician', true, 1),
  ('tech-daisy',  'Daisy',  'Nail Technician',         true, 2),
  ('tech-adam',   'Adam',   'Nail Technician',         true, 3),
  ('tech-vickie', 'Vickie', 'Nail Technician',         true, 4)
on conflict (id) do update
  set name = excluded.name,
      role = excluded.role,
      is_active = excluded.is_active,
      display_order = excluded.display_order;

-- Remove legacy placeholder technicians (if present)
delete from public.technician_schedule_overrides
where technician_id in ('tech-linh', 'tech-maria', 'tech-james', 'tech-amy');

delete from public.technician_schedules
where technician_id in ('tech-linh', 'tech-maria', 'tech-james', 'tech-amy');

delete from public.technician_time_off
where technician_id in ('tech-linh', 'tech-maria', 'tech-james', 'tech-amy');

delete from public.technicians
where id in ('tech-linh', 'tech-maria', 'tech-james', 'tech-amy');

-- Services ------------------------------------------------------------------
insert into public.services (id, category_id, name, description, price, duration_minutes, is_active) values
  -- Pedicures
  ('pedi-volcanic',  'pedicures', 'Volcanic Spa Pedicure',  'Bubbling volcanic treatment with sugar scrub, collagen mask, hot stones, and paraffin.', 65, 60, true),
  ('pedi-organic',   'pedicures', 'Organic Spa Pedicure',   'Lavender scrub, green tea mask, cream massage, hot stones, and paraffin.', 55, 60, true),
  ('pedi-deluxe',    'pedicures', 'Deluxe Spa Pedicure',    'Sea scrub, hydrating massage cream, hot stones, and paraffin.', 45, 60, true),
  ('pedi-luxury',    'pedicures', 'Luxury Spa Pedicure',    'Sugar or sea salt scrub with hot stone and leg massage.', 35, 40, true),
  ('pedi-princess',  'pedicures', 'Princess Spa Pedicure',  'Classic pedicure plus exfoliation and paraffin for dry skin.', 35, 55, true),
  ('pedi-classic',   'pedicures', 'Classic Pedicure',       'Nail shaping, cuticle care, moisturizing massage, and polish.', 25, 30, true),

  -- Manicures & Combos
  ('mani-classic',   'manicures', 'Classic Manicure',       'Nail shaping, cuticle care, moisturizing massage, and polish.', 15, 30, true),
  ('mani-no-chip',   'manicures', 'No-Chip Manicure',       'Classic manicure finished with long-lasting gel polish.', 35, 45, true),
  ('combo-mani-pedi','manicures', 'Classic Mani & Pedi Combo', 'Classic Manicure paired with Classic Pedicure.', 40, 60, true),

  -- Enhancements (parent rows + variants)
  ('enh-acrylic',          'enhancements', 'Acrylic',              'Custom-sculpted acrylic — select full set or fill-in.', 35, 75, true),
  ('enh-acrylic-full',     'enhancements', 'Acrylic — Full Set',   'Custom-sculpted acrylic full set.', 35, 75, true),
  ('enh-acrylic-fill',     'enhancements', 'Acrylic — Fill-In',    'Acrylic fill-in maintenance.', 25, 60, true),
  ('enh-gel',              'enhancements', 'Gel',                  'Gel enhancements — select full set or fill-in.', 45, 75, true),
  ('enh-gel-full',         'enhancements', 'Gel — Full Set',       'Gel enhancement full set.', 45, 75, true),
  ('enh-gel-fill',         'enhancements', 'Gel — Fill-In',        'Gel enhancement fill-in.', 35, 60, true),
  ('enh-pink-white',       'enhancements', 'Pink & White',         'Pink & white acrylic — pricing from listed rates.', 45, 80, true),
  ('enh-pink-white-full',  'enhancements', 'Pink & White — Full Set', 'Pink & white full set (from).', 45, 80, true),
  ('enh-pink-white-fill',  'enhancements', 'Pink & White — Fill-In',  'Pink & white fill-in (from).', 35, 65, true),
  ('enh-pink-fill',        'enhancements', 'Pink & White — Pink Fill', 'Pink Fill service.', 40, 65, true),
  ('enh-gel-powder',       'enhancements', 'Gel Powder Color',     'Gel powder color — full set.', 45, 70, true),
  ('enh-dipping',          'enhancements', 'Dipping Powder',       'Dipping powder color — full set.', 45, 70, true),

  -- Polish / Add-Ons
  ('addon-no-chip-change', 'polish-addons', 'No-Chip Polish Change',  'Long-lasting gel polish change.', 25, 30, true),
  ('addon-finger-polish',  'polish-addons', 'Fingernail Polish Change', 'Quick fingernail color refresh.', 10, 20, true),
  ('addon-toe-polish',     'polish-addons', 'Toenail Polish Change',  'Quick toenail color refresh.', 15, 25, true),
  ('addon-french',         'polish-addons', 'French Tip Add-On',      'French tip finish added to any service.', 10, 15, true),
  ('addon-paraffin',       'polish-addons', 'Paraffin Treatment',     'Warm paraffin dip for hands or feet.', 10, 15, true),
  ('addon-repair',         'polish-addons', 'Nail Repair',            'Broken nail repair (from $5).', 5, 15, true),
  ('addon-removal',        'polish-addons', 'Nails Removal',          'Artificial nail or gel removal (from $5).', 5, 20, true),
  ('addon-art',            'polish-addons', 'Custom Nail Art',        'Custom nail art — priced at visit.', 0, 20, true),

  -- Waxing
  ('wax-eyebrows',   'waxing', 'Eyebrows',        'Precise eyebrow wax.', 10, 15, true),
  ('wax-lips',       'waxing', 'Lips',            'Upper lip wax.', 10, 10, true),
  ('wax-chin',       'waxing', 'Chin',            'Chin wax.', 10, 10, true),
  ('wax-underarms',  'waxing', 'Under Arms',      'Underarm wax.', 30, 20, true),
  ('wax-half-arms',  'waxing', 'Half Arms',       'Wrist to elbow wax.', 35, 30, true),
  ('wax-half-legs',  'waxing', 'Half Legs',       'Ankle to knee wax.', 45, 35, true),
  ('wax-back',       'waxing', 'Back',            'Back wax starting at $50.', 50, 40, true),
  ('wax-bikini',     'waxing', 'Bikini Lines',    'Bikini-line wax starting at $40.', 40, 30, true),

  -- Eyelashes
  ('lash-extensions', 'eyelashes', 'Eyelash Extensions', 'Natural-looking eyelash extensions.', 40, 15, true),
  ('lash-tinting',    'eyelashes', 'Eyelash Tinting',    'Natural lash tint for definition.', 30, 15, true)
on conflict (id) do update
  set category_id = excluded.category_id,
      name = excluded.name,
      description = excluded.description,
      price = excluded.price,
      duration_minutes = excluded.duration_minutes,
      is_active = excluded.is_active;

-- Soft-deactivate retired placeholder / renamed services
update public.services
set is_active = false
where id in (
  'mani-gel', 'mani-spa', 'pedi-gel',
  'enh-dip', 'addon-art-simple',
  'addon-art-hand-painted', 'addon-art-gemstones',
  'addon-art-airbrush', 'addon-art-3d'
);

-- Retail products ------------------------------------------------------------
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
