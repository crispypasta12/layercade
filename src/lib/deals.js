import { useEffect, useState } from 'react';

// Time-limited deals. The rules here mirror place_order() in
// supabase/migrations/20261014000001_product_deals.sql — keep them in sync.
// A deal is active when a deal price and end time are set, the end time is in
// the future, and the deal price is below the line's regular price.

const HOUR = 60 * 60 * 1000;

export function getDealInfo({ dealPrice, dealEndsAt }, regularPrice, now = Date.now()) {
  const endsAt = dealEndsAt ? new Date(dealEndsAt).getTime() : null;
  const active =
    dealPrice != null &&
    endsAt != null &&
    endsAt > now &&
    Number(dealPrice) < Number(regularPrice);

  return {
    active,
    dealPrice: active ? Number(dealPrice) : null,
    regularPrice: Number(regularPrice),
    endsAt,
    remainingMs: active ? endsAt - now : 0,
  };
}

/**
 * Returns the product with `price` set to what the customer pays right now.
 * `regularPrice` keeps the undiscounted price, so calling this twice is safe.
 */
export function withDeal(product, now = Date.now()) {
  const regularPrice = product.regularPrice ?? product.price;
  const deal = getDealInfo(product, regularPrice, now);
  return {
    ...product,
    regularPrice,
    price:         deal.active ? deal.dealPrice : regularPrice,
    sale:          deal.active,
    originalPrice: deal.active ? regularPrice : null,
    dealActive:    deal.active,
  };
}

/** Effective unit price for a cart line (lines store regularPrice + deal fields). */
export function getCartLinePrice(item, now = Date.now()) {
  const regularPrice = item.regularPrice ?? item.price;
  const deal = getDealInfo(item, regularPrice, now);
  return { price: deal.active ? deal.dealPrice : regularPrice, regularPrice, dealActive: deal.active };
}

export function formatDealRemaining(ms) {
  if (ms >= 48 * HOUR) {
    const days = Math.floor(ms / (24 * HOUR));
    return `${days} days remaining for deal`;
  }
  if (ms >= HOUR) {
    const hours = Math.floor(ms / HOUR);
    return `${hours} hour${hours === 1 ? '' : 's'} remaining for deal`;
  }
  const mins = Math.max(1, Math.ceil(ms / 60000));
  return `${mins} min remaining for deal`;
}

/** Current time, refreshed every `intervalMs` so countdowns and prices stay live. */
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
