-- Filament inventory.
--
-- Replaces the generic colour palette as the admin's source of truth for
-- what filament we actually have. Seeded from "Filament Tracker_1.xlsx"
-- (Inventory sheet, 19 spools as of 2026-10-07). public.colors is left in
-- place so existing product_colors.color_id links keep resolving.
--
-- Remaining weight is derived in the client (src/lib/filament.js) from
-- net_weight_g, scale_reading_g and the spool type's empty weight — the same
-- formula the spreadsheet used — so it is not stored here.

begin;

create table if not exists public.filament_spools (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  status           text not null default 'sealed'
                   check (status in ('in_ams', 'open', 'sealed', 'low', 'empty')),
  location         text,
  brand            text,
  material         text,
  finish           text,
  color_name       text not null,
  hex              text not null check (hex ~ '^#[0-9a-fA-F]{6}$'),
  hex_is_estimate  boolean not null default false,
  filament_code    text,
  spool_type       text,
  net_weight_g     integer not null default 1000 check (net_weight_g > 0),
  scale_reading_g  numeric check (scale_reading_g >= 0),
  needs_check      boolean not null default false,
  notes            text,
  date_added       date default current_date,
  last_dried       date,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists filament_spools_updated_at on public.filament_spools;
create trigger filament_spools_updated_at
  before update on public.filament_spools
  for each row execute function public.set_updated_at();

-- Team members only, same rule as every other back-office table.
alter table public.filament_spools enable row level security;

drop policy if exists team_members_all on public.filament_spools;
create policy team_members_all on public.filament_spools
  for all to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());

-- ─── Seed: generated from the spreadsheet, values verbatim ──────────────────
-- hex is the Swatch column's cell fill. For Bambu Lab spools that is Bambu's
-- published colour; for the rest it is an eyeballed estimate (hex_is_estimate).
-- needs_check marks rows whose notes say verify/check or whose brand or
-- material is Unknown.

insert into public.filament_spools (
  code, status, location, brand, material, finish, color_name, hex, hex_is_estimate, filament_code, spool_type, net_weight_g, scale_reading_g, needs_check, notes, date_added, last_dried, sort_order
) values
  ('F001', 'in_ams', 'AMS Slot 1', 'Bambu Lab', 'PLA', 'Basic', 'Gray', '#8E9089', false, null, 'Bambu reusable', 1000, null, true, 'Slot order from photo, left→right — verify', '2026-10-07', null, 1),
  ('F002', 'in_ams', 'AMS Slot 2', 'Bambu Lab', 'PLA', 'Basic', 'Red', '#C12E1F', false, null, 'Bambu reusable', 1000, null, true, 'Finish not visible on label — verify', '2026-10-07', null, 2),
  ('F003', 'in_ams', 'AMS Slot 3', 'Unknown', 'PETG', '—', 'White', '#FFFFFF', true, null, 'Other', 1000, null, true, 'Navy spool, label ''PETG White Ø1.75mm'' — fill in brand', '2026-10-07', null, 3),
  ('F004', 'in_ams', 'AMS Slot 4', 'Unknown', 'Unknown', '—', 'Purple', '#5E43B7', true, null, 'Clear plastic', 1000, null, true, 'Clear spool — check brand/material', '2026-10-07', null, 4),
  ('F005', 'open', 'Cargo Box', 'Unknown', 'Unknown', 'Silk', 'Gold', '#C9A86A', true, null, 'Other', 1000, null, true, 'RFL Cargo Box 15L — looks silk, verify', '2026-10-07', null, 5),
  ('F006', 'open', 'Cargo Box', 'Unknown', 'Unknown', '—', 'Green', '#2E6B4F', true, null, 'Other', 1000, null, true, 'RFL Cargo Box 15L — verify', '2026-10-07', null, 6),
  ('F007', 'open', 'Cargo Box', 'Unknown', 'Unknown', 'Silk', 'Red (glossy)', '#9E2A2B', true, null, 'Other', 1000, null, true, 'RFL Cargo Box 15L — looks silk, verify', '2026-10-07', null, 7),
  ('F008', 'open', 'Cargo Box', 'Unknown', 'Unknown', '—', 'Cream / Beige', '#EDE3CC', true, null, 'Other', 1000, null, true, 'RFL Cargo Box 15L — verify', '2026-10-07', null, 8),
  ('F009', 'sealed', 'Shelf', 'Bambu Lab', 'PLA', 'Matte', 'Dark Green', '#68724D', false, '11501', 'Refill (no spool)', 1000, null, false, null, '2026-10-07', null, 9),
  ('F010', 'sealed', 'Shelf', 'Bambu Lab', 'PLA', 'Basic', 'Mistletoe Green', '#3F8E43', false, '10502', 'Refill (no spool)', 1000, null, false, null, '2026-10-07', null, 10),
  ('F011', 'sealed', 'Shelf', 'Bambu Lab', 'PLA', 'Matte', 'Marine Blue', '#0078BF', false, '11600', 'Refill (no spool)', 1000, null, false, null, '2026-10-07', null, 11),
  ('F012', 'sealed', 'Shelf', 'Bambu Lab', 'PLA', 'Basic', 'Brown', '#9D432C', false, '10800', 'Refill (no spool)', 1000, null, false, null, '2026-10-07', null, 12),
  ('F013', 'sealed', 'Shelf', 'Bambu Lab', 'ASA', 'Aero', 'White', '#FFFFFF', false, '46100', 'Bambu reusable', 1000, null, false, 'Comes with spool; foaming ASA — enclosure', '2026-10-07', null, 13),
  ('F014', 'sealed', 'Shelf', 'Bambu Lab', 'PLA', 'Matte', 'Ice Blue', '#A3D8E1', false, '11601', 'Refill (no spool)', 1000, null, false, null, '2026-10-07', null, 14),
  ('F015', 'sealed', 'Shelf', 'Bambu Lab', 'PLA', 'Basic', 'Jade White', '#FFFFFF', false, '10100', 'Refill (no spool)', 1000, null, false, null, '2026-10-07', null, 15),
  ('F016', 'sealed', 'Shelf', 'Bambu Lab', 'PLA', 'Matte', 'Lemon Yellow', '#F7D959', false, '11400', 'Refill (no spool)', 1000, null, false, null, '2026-10-07', null, 16),
  ('F017', 'sealed', 'Shelf', 'Bambu Lab', 'PLA', 'Wood', 'Rosewood', '#4C241C', false, null, 'Bambu reusable', 1000, null, true, 'Comes with spool; colour name hard to read — verify. Use hardened/0.6 nozzle', '2026-10-07', null, 17),
  ('F018', 'sealed', 'Shelf', 'Bambu Lab', 'PLA', 'Basic', 'Magenta', '#EC008C', false, '10202', 'Refill (no spool)', 1000, null, false, null, '2026-10-07', null, 18),
  ('F019', 'sealed', 'Shelf', 'Sunlu', 'Unknown', '—', 'Unknown', '#DDDDDD', true, null, 'Sunlu plastic', 1000, null, true, 'Box on top of the stack — check contents', '2026-10-07', null, 19)
on conflict (code) do nothing;

commit;
