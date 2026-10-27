-- Invoices.
--
-- The invoice maker kept its invoices in localStorage, so a bill assembled over
-- weeks lived in one browser and died with its site data. They move to a table
-- here: the same team-members-only rule as orders, and an order_id so a
-- completed invoice points at the order it became.
--
-- items is the line array the editor edits, one object per line:
--   { id, description, qty, unit_price, cost, images: [url, …], productId? }
-- cost is ours alone — it drives the live profit figures and the internal copy
-- of the PDF, and the client-facing template never reads it. Storing it on the
-- line (rather than looking up products.cost_price at render time) keeps the
-- margin we actually had on the day, even after a product is repriced.
--
-- Numbering is INV-<year>-<nnn>, assigned by a trigger rather than the client
-- so two tabs can't mint the same number.

begin;

create table if not exists public.invoices (
  id             uuid primary key default gen_random_uuid(),
  number         text not null,
  year           integer not null,
  seq            integer not null,
  status         text not null default 'draft'
                 check (status in ('draft', 'sent', 'paid', 'cancelled')),
  currency       text not null default 'BDT'
                 check (currency in ('BDT', 'USD')),
  issue_date     date not null default current_date,
  due_date       date,
  client_name    text not null default '',
  client_email   text not null default '',
  client_phone   text not null default '',
  client_address text not null default '',
  notes          text not null default '',
  items          jsonb not null default '[]'::jsonb
                 check (jsonb_typeof(items) = 'array'),
  order_id       bigint references public.orders(id) on delete set null,
  completed_at   timestamptz,
  created_by     uuid references public.members(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint invoices_number_key unique (number),
  constraint invoices_year_seq_key unique (year, seq)
);

create index if not exists invoices_created_at_idx on public.invoices (created_at desc);
create index if not exists invoices_order_id_idx on public.invoices (order_id);

-- An invoice knows its order; the order knows its invoice, so the Orders page
-- can show where a row came from without a second query.
alter table public.orders
  add column if not exists invoice_id uuid references public.invoices(id) on delete set null;

create index if not exists orders_invoice_id_idx on public.orders (invoice_id);

-- ─── Numbering ──────────────────────────────────────────────────────────────
-- The advisory lock serialises the read-then-insert, so concurrent inserts
-- queue instead of racing for the same seq. It is held to the end of the
-- transaction, which for a single-row insert is the statement itself.

create or replace function public.assign_invoice_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_year integer := extract(year from coalesce(new.issue_date, current_date));
begin
  if new.number is not null and new.number <> '' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('public.invoices.number'));

  select coalesce(max(seq), 0) + 1 into new.seq
    from public.invoices
   where year = v_year;

  new.year   := v_year;
  new.number := 'INV-' || v_year || '-' || lpad(new.seq::text, 3, '0');

  return new;
end;
$function$;

drop trigger if exists invoices_assign_number on public.invoices;
create trigger invoices_assign_number
  before insert on public.invoices
  for each row execute function public.assign_invoice_number();

drop trigger if exists invoices_updated_at on public.invoices;
create trigger invoices_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

-- ─── Access ─────────────────────────────────────────────────────────────────
-- Invoices carry our costs, so they are back-office only: team members, same
-- rule as every other admin table. Nothing public reads this.

alter table public.invoices enable row level security;

drop policy if exists team_members_all on public.invoices;
create policy team_members_all on public.invoices
  for all to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());

commit;
