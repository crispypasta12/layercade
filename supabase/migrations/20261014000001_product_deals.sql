-- Time-limited product deals.
--
-- A deal is active when deal_price and deal_ends_at are both set, deal_ends_at
-- is in the future, and deal_price is below the line's regular price (the
-- colour variant price if it has one, else the product price). Expired deals
-- need no cleanup: they simply stop matching.
--
-- place_order() is updated to charge the deal price only while the deal is
-- active by the database clock, so a stale storefront can never buy at an
-- expired discount. Mirrors getDealInfo() in src/lib/deals.js.

begin;

alter table public.products
  add column if not exists deal_price   numeric,
  add column if not exists deal_ends_at timestamptz;

alter table public.products
  drop constraint if exists products_deal_price_nonnegative;
alter table public.products
  add constraint products_deal_price_nonnegative
  check (deal_price is null or deal_price >= 0);

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
  v_order_id      bigint;
  v_item          jsonb;
  v_quantity      integer;
  v_regular_price numeric;
  v_deal_price    numeric;
  v_deal_ends_at  timestamptz;
  v_unit_price    numeric;
  v_subtotal      numeric := 0;
  v_delivery_fee  numeric;
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
  -- base product price; an active deal overrides both. IDs are compared as
  -- text so this works whether the key columns are bigint or uuid.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := greatest(1, coalesce((v_item ->> 'quantity')::integer, 1));

    select coalesce(pc.price, p.price), p.deal_price, p.deal_ends_at
      into v_regular_price, v_deal_price, v_deal_ends_at
      from public.products p
      left join public.product_colors pc
             on pc.id::text = nullif(v_item ->> 'colorId', '')
            and pc.product_id::text = p.id::text
            and pc.is_active
     where p.id::text = (v_item ->> 'productId');

    if v_regular_price is null then
      raise exception 'Unknown or unpriced product in order: %', v_item ->> 'productId';
    end if;

    v_unit_price := case
      when v_deal_price is not null
       and v_deal_ends_at > now()
       and v_deal_price < v_regular_price
      then v_deal_price
      else v_regular_price
    end;

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

commit;
