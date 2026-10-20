-- Hero carousel promos.
--
-- Seasonal slides for the storefront hero: a launch push, an Eid sale, a new
-- drop. The first slide of the carousel is NOT in here — the brand slide
-- (headline, typewriter, Shop/Quote CTAs) lives in code, so a visitor who
-- never advances always sees it and nobody can delete it by accident.
--
-- Slides retire on their own. A promo is live when it is published and now()
-- falls inside [starts_at, ends_at); either bound may be null for "no bound".
-- That means a GTA VI banner can be scheduled to vanish on launch day without
-- anyone remembering to take it down.

begin;

create table if not exists public.promos (
  id             uuid primary key default gen_random_uuid(),

  -- Copy
  title          text not null,
  eyebrow        text,
  badge          text,
  body           text,
  footnote       text,

  -- Art
  image_url      text,
  image_alt      text,
  -- Tailwind object-position utility, e.g. "object-[72%_center]". Lets a wide
  -- image be re-framed per slide without touching the component.
  image_position text,
  layout         text not null default 'full-bleed'
                 check (layout in ('full-bleed', 'split')),

  -- Drives the eyebrow and the carousel dot. The CTA stays house orange on
  -- every slide, so the buy button never changes colour.
  accent         text check (accent is null or accent ~ '^#[0-9a-fA-F]{6}$'),

  -- Action
  cta_label      text,
  cta_href       text,

  countdown_to   timestamptz,

  -- Scheduling
  published      boolean not null default false,
  starts_at      timestamptz,
  ends_at        timestamptz,
  sort_order     integer not null default 0,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint promos_window_ordered
    check (starts_at is null or ends_at is null or ends_at > starts_at)
);

create index if not exists promos_live_idx
  on public.promos (published, sort_order);

drop trigger if exists promos_updated_at on public.promos;
create trigger promos_updated_at
  before update on public.promos
  for each row execute function public.set_updated_at();

alter table public.promos enable row level security;

-- Storefront: anonymous visitors see live slides only — never drafts, never
-- a slide whose window has closed.
drop policy if exists public_read_live_promos on public.promos;
create policy public_read_live_promos on public.promos
  for select to anon, authenticated
  using (
    published
    and (starts_at is null or starts_at <= now())
    and (ends_at   is null or ends_at   >  now())
  );

-- Back office: team members read and write everything, drafts included.
-- Postgres ORs the two select policies, so a member still sees the lot.
drop policy if exists team_members_all_promos on public.promos;
create policy team_members_all_promos on public.promos
  for all to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());

commit;
