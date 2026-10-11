-- Let team members create orders from the admin panel.
--
-- 20260810000001 dropped the open "Anyone can place an order" INSERT policy so
-- that customers can only create orders through place_order(). That also left
-- orders with no INSERT policy at all, which broke the admin "Create Custom
-- Order" modal (it inserts directly with admin-chosen prices). Restore insert
-- for team members only; anon clients still have no direct-insert path.

create policy team_members_insert_orders on public.orders
  for insert to authenticated with check (public.is_team_member());
