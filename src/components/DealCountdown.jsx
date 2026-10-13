import { formatDealRemaining, getDealInfo } from '../lib/deals';

/**
 * "5 hours remaining for deal" stamp. Renders nothing when the deal is not
 * active. Pass `now` from useNow() so the parent re-renders the price too.
 */
export default function DealCountdown({ product, regularPrice, now, className = '' }) {
  const deal = getDealInfo(product, regularPrice ?? product.regularPrice ?? product.price, now);
  if (!deal.active) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 font-technical text-[10px] uppercase tracking-[0.15em] text-[#ff5500] ${className}`}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>timer</span>
      {formatDealRemaining(deal.remainingMs)}
    </div>
  );
}
