-- Phase 8: Color fields on order items (JSONB column on orders table)
-- Items are stored as a JSONB array in orders.items — no separate order_items table.
-- Cart items already carry colorId / colorName / colorHex from Phase 7, so
-- we only need to replace place_order to pass p_items through as-is.
-- Run this in the Supabase SQL editor.

create or replace function public.place_order(
  p_customer_name    text,
  p_email            text,
  p_phone            text,
  p_fulfillment_type text,
  p_address          text,
  p_area             text,
  p_district         text,
  p_items            jsonb,
  p_total_amount     numeric,
  p_delivery_fee     numeric,
  p_notes            text
)
returns bigint
language plpgsql
security definer
as $$
declare
  v_order_id bigint;
begin
  insert into public.orders (
    customer_name,
    email,
    phone,
    fulfillment_type,
    address,
    area,
    district,
    items,
    total_amount,
    delivery_fee,
    notes,
    status
  )
  values (
    p_customer_name,
    p_email,
    p_phone,
    p_fulfillment_type,
    p_address,
    p_area,
    p_district,
    p_items,
    p_total_amount,
    p_delivery_fee,
    p_notes,
    'pending'
  )
  returning id into v_order_id;

  return v_order_id;
end;
$$;
