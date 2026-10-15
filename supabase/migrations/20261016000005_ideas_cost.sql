-- Ideas board: keep the Cost Calculator's result on the idea.
--
-- "Estimate cost" on an idea opens the calculator; its "Save to idea" button
-- writes the cost per piece and suggested selling price here (both editable
-- by hand in the idea popup). "Turn into product" carries them into the new
-- product's cost_price and price.

begin;

alter table public.ideas
  add column if not exists est_cost  numeric check (est_cost >= 0),
  add column if not exists est_price numeric check (est_price >= 0),
  add column if not exists costed_at timestamptz;

commit;
