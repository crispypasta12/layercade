-- Ideas board, step 3: link ideas to the products they became, and keep a
-- rough print estimate that pre-fills the Cost Calculator.
--
-- product_id is set null if the product is deleted, so the idea (and who
-- found it) survives even if the listing doesn't.

begin;

alter table public.ideas
  add column if not exists product_id      bigint references public.products(id) on delete set null,
  add column if not exists est_print_hours numeric check (est_print_hours > 0),
  add column if not exists est_filament_g  integer check (est_filament_g > 0);

create index if not exists ideas_product_id_idx on public.ideas (product_id);

commit;
