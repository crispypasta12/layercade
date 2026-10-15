import { useLocation } from 'react-router-dom';
import { pageTagline } from '../../lib/quips';

/**
 * The dim line under a page's H1. Reads its own route, so adding it to a page
 * is one tag with no props — and pages without a tagline render nothing.
 *
 * Deliberately never replaces a page's existing subtitle: those carry counts
 * and totals, which are information. This sits underneath them.
 */
export default function PageTagline() {
  const { pathname } = useLocation();
  const line = pageTagline(pathname);
  if (!line) return null;

  return (
    <p className="font-technical text-[10px] text-stone-600 tracking-wide mt-1 italic">
      {line}
    </p>
  );
}
