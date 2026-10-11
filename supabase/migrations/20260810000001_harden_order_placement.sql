-- Order integrity hardening.
--
-- Fixes two issues that together allow anyone with the public anon key to
-- create an order for an arbitrary amount:
--
--   1. place_order() inserted the client's p_total_amount / p_delivery_fee
--      verbatim, never consulting products.price.
--   2. An "Anyone can place an order" INSERT policy let anon clients bypass
--      place_order() entirely and POST straight to /rest/v1/orders.
--
-- After this migration the only way to create an order is place_order(), and
-- it derives every monetary value server-side.

begin;

-- ─── Preflight ──────────────────────────────────────────────────────────────
-- The pricing logic below depends on these columns. plpgsql does not resolve
-- table references at CREATE time, so without this check a wrong column name
-- would only surface at checkout, in production.

do $preflight$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'price'
  ) then
    raise exception 'Expected column public.products.price not found';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'product_colors' and column_name = 'product_id'
  ) then
    raise exception
      'Expected column public.product_colors.product_id not found — '
      'adjust the join in place_order() to the actual foreign key name';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'product_colors' and column_name = 'price'
  ) then
    raise exception 'Expected column public.product_colors.price not found';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'product_colors' and column_name = 'is_active'
  ) then
    raise exception 'Expected column public.product_colors.is_active not found';
  end if;
end
$preflight$;

-- ─── place_order ────────────────────────────────────────────────────────────
-- Signature is unchanged so the existing client keeps working, but
-- p_total_amount and p_delivery_fee are now ignored. They are kept only for
-- backwards compatibility and should be dropped once the client stops sending
-- them.

create or replace function public.place_order(
  p_customer_name    text,
  p_email            text,
  p_phone            text,
  p_fulfillment_type text,
  p_address          text,
  p_area             text,
  p_district         text,
  p_items            jsonb,
  p_total_amount     numeric,  -- ignored; retained for signature compatibility
  p_delivery_fee     numeric,  -- ignored; retained for signature compatibility
  p_notes            text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_order_id     bigint;
  v_item         jsonb;
  v_quantity     integer;
  v_unit_price   numeric;
  v_subtotal     numeric := 0;
  v_delivery_fee numeric;
begin
  if p_fulfillment_type is null or p_fulfillment_type not in ('delivery', 'pickup') then
    raise exception 'Invalid fulfillment type: %', p_fulfillment_type;
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  if jsonb_array_length(p_items) > 100 then
    raise exception 'Too many line items';
  end if;

  if p_fulfillment_type = 'delivery'
     and (coalesce(btrim(p_address), '') = '' or coalesce(btrim(p_district), '') = '') then
    raise exception 'Delivery orders require an address and district';
  end if;

  -- Price every line from the catalogue. A colour variant may override the
  -- base product price. IDs are compared as text so this works whether the
  -- key columns are bigint or uuid.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := greatest(1, coalesce((v_item ->> 'quantity')::integer, 1));

    select coalesce(pc.price, p.price)
      into v_unit_price
      from public.products p
      left join public.product_colors pc
             on pc.id::text = nullif(v_item ->> 'colorId', '')
            and pc.product_id::text = p.id::text
            and pc.is_active
     where p.id::text = (v_item ->> 'productId');

    if v_unit_price is null then
      raise exception 'Unknown or unpriced product in order: %', v_item ->> 'productId';
    end if;

    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
  end loop;

  -- Delivery fee is derived, never accepted. Mirrors src/pages/Checkout.jsx.
  v_delivery_fee := case
    when p_fulfillment_type = 'pickup' then 0
    when p_district = 'Dhaka'          then 60
    else                                    120
  end;

  insert into public.orders (
    customer_name, email, phone, fulfillment_type,
    address, area, district, items,
    total_amount, delivery_fee, notes, status
  )
  values (
    p_customer_name,
    p_email,
    p_phone,
    p_fulfillment_type,
    case when p_fulfillment_type = 'delivery' then p_address  else null end,
    case when p_fulfillment_type = 'delivery' then p_area     else null end,
    case when p_fulfillment_type = 'delivery' then p_district else null end,
    p_items,
    v_subtotal + v_delivery_fee,
    v_delivery_fee,
    p_notes,
    'pending'
  )
  returning id into v_order_id;

  return v_order_id;
end;
$function$;

-- ─── Close the direct-insert bypass ─────────────────────────────────────────
-- place_order() is SECURITY DEFINER, so it inserts regardless of RLS. Removing
-- this policy makes the RPC the only write path for anon clients.

drop policy if exists "Anyone can place an order" on public.orders;

commit;
