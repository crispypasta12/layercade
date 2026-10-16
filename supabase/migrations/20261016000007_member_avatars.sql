-- Pickable avatars for admin members.
--
-- Stored as "style:seed" (e.g. "bottts:Ember") and rendered client-side by
-- DiceBear, so nothing is uploaded. Null falls back to initials.
-- Covered by the existing members-only policy on public.members.

alter table public.members
  add column if not exists avatar text
    check (avatar is null or avatar ~ '^[A-Za-z]+:[A-Za-z0-9_-]{1,40}$');
