-- Drop public.team_members.
--
-- Superseded by public.members in 20261016000008: tasks.assignee_ids,
-- member_roles and both task-email edge functions now use members ids.
-- Checked before dropping: no foreign keys, views, functions, cron jobs or
-- other tables' policies reference it, and nothing in src/ or
-- supabase/functions/ queries it. Its own RLS policy goes with it.

drop table if exists public.team_members;
