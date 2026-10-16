-- One table for people: move Tasks off public.team_members onto public.members.
--
-- Tasks was the only feature still using team_members — a copy of the team
-- with its own ids and colours. Everything else (login, expenses, ideas,
-- avatars) uses members, so Tasks showed different colours and could not
-- tell which tasks were "mine".
--
-- Rows are paired by name (both tables hold the same six people). The
-- preflight refuses to run if any team_members row has no members match, so
-- no assignment is silently dropped.
--
-- Rewriting tasks.assignee_ids would fire task_assignment_trigger and email
-- every assignee about every task, so it is switched off for the rewrite.
--
-- team_members is left in place, unused, and can be dropped once the
-- notify-task-assignment and send-task-reminder edge functions read members
-- (deployed alongside this migration; source in supabase/functions/).

begin;

-- ─── Pairing ────────────────────────────────────────────────────────────────

create temporary table tm_to_m as
select tm.id as tm_id, m.id as m_id, tm.email as tm_email
from public.team_members tm
join public.members m on lower(trim(m.name)) = lower(trim(tm.name));

do $preflight$
begin
  if exists (
    select 1 from public.team_members tm
    where not exists (select 1 from tm_to_m p where p.tm_id = tm.id)
  ) then
    raise exception 'Some team_members have no matching members row by name; pair them by hand first.';
  end if;
  if (select count(*) from tm_to_m) <> (select count(distinct tm_id) from tm_to_m) then
    raise exception 'A team_members row matches more than one members row by name.';
  end if;
end
$preflight$;

-- Task emails go to members.email from now on; keep any address only
-- team_members had.
update public.members m
set email = p.tm_email
from tm_to_m p
where p.m_id = m.id and m.email is null and p.tm_email is not null;

-- ─── tasks.assignee_ids ─────────────────────────────────────────────────────

alter table public.tasks disable trigger task_assignment_trigger;

update public.tasks t
set assignee_ids = (
  select coalesce(jsonb_agg(to_jsonb(coalesce(p.m_id::text, a.id))), '[]'::jsonb)
  from jsonb_array_elements_text(t.assignee_ids) as a(id)
  left join tm_to_m p on p.tm_id::text = a.id
)
where jsonb_array_length(coalesce(t.assignee_ids, '[]'::jsonb)) > 0;

alter table public.tasks enable trigger task_assignment_trigger;

-- ─── member_roles ───────────────────────────────────────────────────────────

alter table public.member_roles drop constraint member_roles_member_id_fkey;

update public.member_roles r
set member_id = p.m_id
from tm_to_m p
where p.tm_id = r.member_id;

alter table public.member_roles
  add constraint member_roles_member_id_fkey
  foreign key (member_id) references public.members(id) on delete cascade;

comment on table public.team_members is
  'Deprecated 2026-10-16: Tasks now uses public.members. Safe to drop.';

drop table tm_to_m;

commit;
