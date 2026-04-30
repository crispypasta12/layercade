-- Phase 1: Color variant support
-- Run this in the Supabase SQL editor.

-- 1. Flag on products: drives all variant UI in admin and storefront
alter table public.products
  add column if not exists has_color_variants boolean not null default false;

-- 2. Global color library — the picker palette managed from admin
create table if not exists public.colors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  hex         text not null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  constraint colors_name_unique unique (name)
);

-- 3. Per-product color variants
--    name/hex are SNAPSHOTTED from the global color at assign time so that
--    renaming a global color, or a per-product display rename, doesn't ripple.
--    color_id is kept as a nullable audit link only.
create table if not exists public.product_colors (
  id           uuid primary key default gen_random_uuid(),
  product_id   bigint not null references public.products(id) on delete cascade,
  color_id     uuid references public.colors(id) on delete set null,
  name         text not null,
  hex          text not null,
  image        text not null default '',
  images       jsonb not null default '[]'::jsonb,
  price        numeric,
  stock_status text not null default 'in_stock',
  sort_order   int  not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists product_colors_product_sort
  on public.product_colors (product_id, sort_order);

-- 4. Seed: common starter colors
insert into public.colors (name, hex, sort_order) values
  ('Black',        '#1a1a1a', 0),
  ('White',        '#f5f5f5', 1),
  ('Red',          '#e63946', 2),
  ('Blue',         '#457b9d', 3),
  ('Navy',         '#1d3557', 4),
  ('Green',        '#2d6a4f', 5),
  ('Yellow',       '#f4d03f', 6),
  ('Orange',       '#e76f51', 7),
  ('Purple',       '#6d597a', 8),
  ('Pink',         '#e07a9e', 9),
  ('Grey',         '#8d99ae', 10),
  ('Brown',        '#795548', 11),
  ('Beige',        '#d4b896', 12),
  ('Gold',         '#c9a84c', 13),
  ('Silver',       '#9e9e9e', 14),
  ('Teal',         '#2a9d8f', 15),
  ('Maroon',       '#800000', 16),
  ('Olive',        '#6b7c00', 17),
  ('Coral',        '#ff6b6b', 18),
  ('Turquoise',    '#40e0d0', 19)
on conflict (name) do nothing;

-- 5. RLS: inherit the same open read / auth-gated write pattern as products
alter table public.colors enable row level security;
alter table public.product_colors enable row level security;

-- Public read
create policy "colors_select_public"
  on public.colors for select using (true);

create policy "product_colors_select_public"
  on public.product_colors for select using (true);

-- Authenticated write (admin)
create policy "colors_insert_auth"
  on public.colors for insert with check (auth.role() = 'authenticated');

create policy "colors_update_auth"
  on public.colors for update using (auth.role() = 'authenticated');

create policy "colors_delete_auth"
  on public.colors for delete using (auth.role() = 'authenticated');

create policy "product_colors_insert_auth"
  on public.product_colors for insert with check (auth.role() = 'authenticated');

create policy "product_colors_update_auth"
  on public.product_colors for update using (auth.role() = 'authenticated');

create policy "product_colors_delete_auth"
  on public.product_colors for delete using (auth.role() = 'authenticated');
