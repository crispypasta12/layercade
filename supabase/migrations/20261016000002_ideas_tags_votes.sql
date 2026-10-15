-- Ideas board, step 2: tags and team votes.
--
-- Tags are free text on the idea (lower-cased by the client), suggested from
-- tags already in use. Votes live in their own table so two teammates voting
-- at once can't overwrite each other; each member can only cast or remove
-- their own vote.

begin;

alter table public.ideas
  add column if not exists tags text[] not null default '{}';

create index if not exists ideas_tags_idx on public.ideas using gin (tags);

create table if not exists public.idea_votes (
  idea_id     uuid not null references public.ideas(id) on delete cascade,
  member_id   uuid not null references public.members(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (idea_id, member_id)
);

alter table public.idea_votes enable row level security;

drop policy if exists team_members_read on public.idea_votes;
create policy team_members_read on public.idea_votes
  for select to authenticated
  using (public.is_team_member());

drop policy if exists own_vote_insert on public.idea_votes;
create policy own_vote_insert on public.idea_votes
  for insert to authenticated
  with check (member_id in (select id from public.members where auth_user_id = auth.uid()));

drop policy if exists own_vote_delete on public.idea_votes;
create policy own_vote_delete on public.idea_votes
  for delete to authenticated
  using (member_id in (select id from public.members where auth_user_id = auth.uid()));

commit;
