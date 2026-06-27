-- ============================================================================
--  NAIL TEK & SPA — COMPLETION & ANALYTICS MIGRATION
-- ============================================================================
--  Run after schema.sql in the Supabase SQL editor.
--  Adds client tracking, retail catalog, and finalized transaction tables.
--  Original booking data (appointments + appointment_services) is never modified
--  on completion — only status changes on the appointment row.
-- ============================================================================

-- Enums ---------------------------------------------------------------------
do $$ begin
  create type payment_method as enum ('cash', 'card', 'apple_pay', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type transaction_line_type as enum ('service', 'retail', 'addon');
exception when duplicate_object then null; end $$;

-- Clients -------------------------------------------------------------------
create table if not exists public.clients (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  phone            text not null,
  email            text,
  first_visit_at   timestamptz,
  created_at       timestamptz not null default now(),
  constraint clients_phone_unique unique (phone)
);

create index if not exists clients_phone_idx on public.clients (phone);

-- Retail products (mirrors lib/config/salonData.ts retailProducts) ----------
create table if not exists public.retail_products (
  id               text primary key,
  name             text not null,
  price            numeric(10, 2) not null default 0,
  category         text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

-- Appointments: link to client + store estimated total at booking time ------
alter table public.appointments
  add column if not exists client_id uuid references public.clients (id) on delete set null;

alter table public.appointments
  add column if not exists estimated_total numeric(10, 2);

-- Completed transactions (1:1 with appointment when finalized) ----------------
create table if not exists public.completed_transactions (
  id                   uuid primary key default gen_random_uuid(),
  appointment_id       uuid not null unique references public.appointments (id) on delete restrict,
  completed_at         timestamptz not null default now(),
  completed_by         uuid references auth.users (id) on delete set null,
  payment_method       payment_method not null,
  subtotal_services    numeric(10, 2) not null default 0,
  subtotal_retail      numeric(10, 2) not null default 0,
  discount_amount      numeric(10, 2) not null default 0,
  tax_amount           numeric(10, 2) not null default 0,
  tip_amount           numeric(10, 2) not null default 0,
  refund_amount        numeric(10, 2) not null default 0,
  final_total          numeric(10, 2) not null default 0,
  notes                text,
  created_at           timestamptz not null default now()
);

create index if not exists completed_transactions_completed_at_idx
  on public.completed_transactions (completed_at);

-- Line items: what was actually performed / sold -----------------------------
create table if not exists public.transaction_line_items (
  id               uuid primary key default gen_random_uuid(),
  transaction_id   uuid not null references public.completed_transactions (id) on delete cascade,
  line_type        transaction_line_type not null,
  service_id       text references public.services (id) on delete set null,
  product_id       text references public.retail_products (id) on delete set null,
  name             text not null,
  quantity         integer not null default 1 check (quantity > 0),
  unit_price       numeric(10, 2) not null default 0,
  line_total       numeric(10, 2) not null default 0
);

create index if not exists transaction_line_items_tx_idx
  on public.transaction_line_items (transaction_id);

-- Seed retail products (mirrors lib/config/salonData.ts) --------------------
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

-- Row Level Security --------------------------------------------------------
alter table public.clients                  enable row level security;
alter table public.retail_products          enable row level security;
alter table public.completed_transactions   enable row level security;
alter table public.transaction_line_items   enable row level security;

drop policy if exists "admin manage clients" on public.clients;
create policy "admin manage clients"
  on public.clients for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

drop policy if exists "admin manage retail products" on public.retail_products;
create policy "admin manage retail products"
  on public.retail_products for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

drop policy if exists "admin manage completed transactions" on public.completed_transactions;
create policy "admin manage completed transactions"
  on public.completed_transactions for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

drop policy if exists "admin manage transaction line items" on public.transaction_line_items;
create policy "admin manage transaction line items"
  on public.transaction_line_items for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- Realtime (optional: notify when appointment completed) --------------------
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'completed_transactions'
  ) then
    alter publication supabase_realtime add table public.completed_transactions;
  end if;
end $$;