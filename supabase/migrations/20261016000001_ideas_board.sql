-- Ideas board.
--
-- Replaces the shared Google Sheet of print ideas gathered from MakerWorld,
-- Instagram and Pinterest. A teammate pastes a link; the idea-preview edge
-- function fills in title, thumbnail and creator, and copies the thumbnail
-- into the idea-images bucket (Instagram CDN links expire within days).
--
-- url_key is the link with tracking params, "www." and trailing slashes
-- stripped (see normaliseUrl in src/lib/ideas.js). It is unique so the same
-- idea can't be saved twice from slightly different share links.

begin;

create table if not exists public.ideas (
  id           uuid primary key default gen_random_uuid(),
  url          text,
  url_key      text unique,
  source       text not null default 'other'
               check (source in ('makerworld', 'instagram', 'pinterest', 'other')),
  title        text not null,
  image_url    text,
  author       text,
  notes        text,
  status       text not null default 'inbox'
               check (status in ('inbox', 'shortlisted', 'test_print', 'listed', 'archived')),
  position     integer not null default 0,
  added_by     uuid references public.members(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists ideas_status_position_idx on public.ideas (status, position);

drop trigger if exists ideas_updated_at on public.ideas;
create trigger ideas_updated_at
  before update on public.ideas
  for each row execute function public.set_updated_at();

-- Team members only, same rule as every other back-office table.
alter table public.ideas enable row level security;

drop policy if exists team_members_all on public.ideas;
create policy team_members_all on public.ideas
  for all to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());

-- ─── Thumbnails ─────────────────────────────────────────────────────────────
-- Public read so <img> tags work without signed URLs; paths are random UUIDs.
-- Only team members can write. (Deleting through the API also needs a select
-- policy, so members get one; public reads go via the public URL, not RLS.)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('idea-images', 'idea-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

drop policy if exists idea_images_team_select on storage.objects;
create policy idea_images_team_select on storage.objects
  for select to authenticated
  using (bucket_id = 'idea-images' and public.is_team_member());

drop policy if exists idea_images_team_insert on storage.objects;
create policy idea_images_team_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'idea-images' and public.is_team_member());

drop policy if exists idea_images_team_update on storage.objects;
create policy idea_images_team_update on storage.objects
  for update to authenticated
  using (bucket_id = 'idea-images' and public.is_team_member());

drop policy if exists idea_images_team_delete on storage.objects;
create policy idea_images_team_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'idea-images' and public.is_team_member());

commit;
