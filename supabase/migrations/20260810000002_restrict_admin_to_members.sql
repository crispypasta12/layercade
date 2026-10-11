-- Admin authorization hardening.
--
-- Every back-office policy was `auth.role() = 'authenticated'`, which grants
-- full read/write on orders, expenses, members and tasks to ANY signed-up
-- user — including one who registers themselves, and including direct
-- PostgREST calls that never touch the app UI.
--
-- This replaces that test with membership in public.members.
--
-- ⚠️  APPLY MIGRATION 20260810000001 FIRST, AND READ THIS BEFORE RUNNING:
--     if your own auth user is not in public.members, this migration will lock
--     you out of your own admin panel. Verify with:
--
--       select id, auth_user_id, name from public.members;
--       select id, email from auth.users;
--
--     Every admin's auth.users.id must appear as a members.auth_user_id.
--     The preflight below refuses to run if public.members is empty.

begin;

-- ─── Preflight ──────────────────────────────────────────────────────────────

do $preflight$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'members' and column_name = 'auth_user_id'
  ) then
    raise exception 'Expected column public.members.auth_user_id not found';
  end if;

  if not exists (select 1 from public.members where auth_user_id is not null) then
    raise exception
      'public.members has no rows with auth_user_id — applying this migration '
      'would lock every user out of the admin panel. Populate members first.';
  end if;
end
$preflight$;

-- ─── Helper ─────────────────────────────────────────────────────────────────
-- SECURITY DEFINER so that policies on public.members do not recurse when this
-- is called from within a policy on public.members itself.

create or replace function public.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where auth_user_id = auth.uid()
  );
$$;

revoke execute on function public.is_team_member() from public;
grant execute on function public.is_team_member() to authenticated;

-- ─── Replace the blanket policies ───────────────────────────────────────────

-- Financial and operational tables: members only, full access.
do $policies$
declare
  t text;
begin
  foreach t in array array[
    'expenses', 'expense_splits', 'settlements',
    'members', 'member_roles',
    'tasks', 'task_roles', 'team_members'
  ]
  loop
    execute format('drop policy if exists auth_all on public.%I', t);
    execute format(
      'create policy team_members_all on public.%I
         for all to authenticated
         using (public.is_team_member())
         with check (public.is_team_member())', t);
  end loop;
end
$policies$;

-- Orders: members only. Customers never read orders back — the confirmation
-- page renders from router state and the email is sent by the edge function
-- using the service role key.
drop policy if exists "Admin can view orders"   on public.orders;
drop policy if exists "Admin can update orders" on public.orders;
drop policy if exists "Admin can delete orders" on public.orders;

create policy team_members_select_orders on public.orders
  for select to authenticated using (public.is_team_member());

create policy team_members_update_orders on public.orders
  for update to authenticated
  using (public.is_team_member()) with check (public.is_team_member());

create policy team_members_delete_orders on public.orders
  for delete to authenticated using (public.is_team_member());

-- Catalogue: public stays readable; writes require membership.
drop policy if exists "Admin write categories" on public.categories;
create policy team_members_write_categories on public.categories
  for all to authenticated
  using (public.is_team_member()) with check (public.is_team_member());

drop policy if exists products_insert_admin on public.products;
drop policy if exists products_update_admin on public.products;
drop policy if exists products_delete_admin on public.products;

create policy team_members_insert_products on public.products
  for insert to authenticated with check (public.is_team_member());
create policy team_members_update_products on public.products
  for update to authenticated
  using (public.is_team_member()) with check (public.is_team_member());
create policy team_members_delete_products on public.products
  for delete to authenticated using (public.is_team_member());

drop policy if exists colors_insert_auth on public.colors;
drop policy if exists colors_update_auth on public.colors;
drop policy if exists colors_delete_auth on public.colors;

create policy team_members_insert_colors on public.colors
  for insert to authenticated with check (public.is_team_member());
create policy team_members_update_colors on public.colors
  for update to authenticated
  using (public.is_team_member()) with check (public.is_team_member());
create policy team_members_delete_colors on public.colors
  for delete to authenticated using (public.is_team_member());

drop policy if exists product_colors_insert_auth on public.product_colors;
drop policy if exists product_colors_update_auth on public.product_colors;
drop policy if exists product_colors_delete_auth on public.product_colors;

create policy team_members_insert_product_colors on public.product_colors
  for insert to authenticated with check (public.is_team_member());
create policy team_members_update_product_colors on public.product_colors
  for update to authenticated
  using (public.is_team_member()) with check (public.is_team_member());
create policy team_members_delete_product_colors on public.product_colors
  for delete to authenticated using (public.is_team_member());

-- Reviews: approved ones stay public; moderation requires membership.
drop policy if exists admins_read_all_reviews on public.reviews;
drop policy if exists admins_update_reviews   on public.reviews;
drop policy if exists admins_delete_reviews   on public.reviews;

create policy team_members_read_reviews on public.reviews
  for select to authenticated using (public.is_team_member());
create policy team_members_update_reviews on public.reviews
  for update to authenticated
  using (public.is_team_member()) with check (public.is_team_member());
create policy team_members_delete_reviews on public.reviews
  for delete to authenticated using (public.is_team_member());

-- Quote requests: submission stays open, management does not.
drop policy if exists "Authenticated users can manage quote requests" on public.quote_requests;
create policy team_members_manage_quote_requests on public.quote_requests
  for all to authenticated
  using (public.is_team_member()) with check (public.is_team_member());

commit;
