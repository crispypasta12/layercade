import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { orderSearchFilter } from '../../lib/orderSearch';
import { PALETTE, quip } from '../../lib/quips';

/**
 * ⌘K palette. Mounted once by AdminNavbar, which every admin page renders.
 *
 * Result sources: actions (do something), the nav destinations (go
 * somewhere), then orders and products looked up live once you type. Recents
 * sit on top when the box is empty, since most trips through here repeat the
 * last one. Typing or pasting a link offers to save it to the Ideas board.
 */

const RECENTS_KEY = 'admin_palette_recents';
const MAX_RECENTS = 3;
const SEARCH_DEBOUNCE_MS = 250;

/* ─── Static destinations ─────────────────────────────────────────── */
// `keywords` exist so "money" finds Expenses and "filament" finds Inventory.

const DESTINATIONS = [
  { id: 'nav-dashboard',  label: 'Dashboard',       to: '/admin',            icon: 'dashboard',     group: 'Overview',    keywords: 'home overview stats revenue' },
  { id: 'nav-orders',     label: 'Orders',          to: '/admin/orders',     icon: 'receipt_long',  group: 'Orders',      keywords: 'sales customers pending shipped' },
  { id: 'nav-products',   label: 'Products',        to: '/admin/products',   icon: 'inventory_2',   group: 'The Bait',    keywords: 'catalogue listings shop stock' },
  { id: 'nav-categories', label: 'Categories',      to: '/admin/categories', icon: 'category',      group: 'The Bait',    keywords: 'collections groups taxonomy' },
  { id: 'nav-reviews',    label: 'Reviews',         to: '/admin/reviews',    icon: 'rate_review',   group: 'The Bait',    keywords: 'ratings feedback moderation' },
  { id: 'nav-inventory',  label: 'Inventory',       to: '/admin/inventory',  icon: 'inventory',     group: 'The Grind',   keywords: 'filament spools colours ams stock' },
  { id: 'nav-tasks',      label: 'Tasks',           to: '/admin/tasks',      icon: 'task_alt',      group: 'The Grind',   keywords: 'todo board kanban assignments' },
  { id: 'nav-ideas',      label: 'Ideas',           to: '/admin/ideas',      icon: 'lightbulb',     group: 'The Grind',   keywords: 'inbox makerworld inspiration backlog' },
  { id: 'nav-calculator', label: 'Cost Calculator', to: '/admin/calculator', icon: 'calculate',     group: 'The Damage',  keywords: 'pricing cost margin quote' },
  { id: 'nav-invoices',   label: 'Invoice Maker',   to: '/admin/invoices',   icon: 'receipt',       group: 'The Damage',  keywords: 'billing pdf invoice' },
  { id: 'nav-expenses',   label: 'Expenses',        to: '/admin/expenses',   icon: 'payments',      group: 'The Damage',  keywords: 'spending money splits settlements' },
];

/* ─── Actions ─────────────────────────────────────────────────────── */
// Each either links to a page that acts on a URL param (see useUrlAction) or
// names an `action` that AdminNavbar runs, for things that live in the navbar.

const ACTIONS = [
  { id: 'act-new-task',    label: 'New task',        to: '/admin/tasks?new=1',            icon: 'add_task',               group: 'Action', keywords: 'create add todo assign job' },
  { id: 'act-my-tasks',    label: 'My tasks',        to: '/admin/tasks?mine=1',           icon: 'person_check',           group: 'Action', keywords: 'assigned to me mine todo' },
  { id: 'act-new-expense', label: 'Log expense',     to: '/admin/expenses?new=1',         icon: 'add_card',               group: 'Action', keywords: 'add spend paid bought money receipt' },
  { id: 'act-settle',      label: 'Settle up',       to: '/admin/expenses?tab=balances',  icon: 'account_balance_wallet', group: 'Action', keywords: 'balance owe owed pay debts' },
  { id: 'act-new-product', label: 'New product',     to: '/admin/products?new=1',         icon: 'add_box',                group: 'Action', keywords: 'create add listing catalogue' },
  { id: 'act-add-idea',    label: 'Add idea',        to: '/admin/ideas',                  icon: 'lightbulb',              group: 'Action', keywords: 'save link paste makerworld inspiration', sub: 'Or paste a link right here' },
  { id: 'act-avatar',      label: 'Change avatar',   action: 'avatar',                    icon: 'face',                   group: 'Action', keywords: 'profile picture face me' },
  { id: 'act-logout',      label: 'Log out',         action: 'logout',                    icon: 'logout',                 group: 'Action', keywords: 'sign out exit leave' },
];

const COMMANDS = [...ACTIONS, ...DESTINATIONS];

// A pasted link turns into "save this to Ideas" — the Ideas board already
// imports from ?url= (it's how the phone share sheet works).
function linkIn(text) {
  const m = text.match(/https?:\/\/\S+/i);
  return m ? m[0] : null;
}

/* ─── Recents ─────────────────────────────────────────────────────── */

// Blocked or cleared storage just means no recents — never a broken palette.
function readRecents() {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/* ─── Fuzzy matching ──────────────────────────────────────────────── */

/**
 * Score `text` against `query`. Higher is better, 0 means no match.
 * Prefix beats word-boundary beats scattered-subsequence, so "inv" ranks
 * Inventory and Invoice Maker above anything that merely contains the letters.
 */
function score(text, query) {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (!q) return 1;

  if (t.startsWith(q)) return 100;

  const wordStart = t.split(/[\s-]+/).some((w) => w.startsWith(q));
  if (wordStart) return 80;

  if (t.includes(q)) return 60;

  // Subsequence: every query character appears in order. Only for queries long
  // enough to mean something — on three letters it matches half the nav ("ord"
  // would pull in Dashboard) and the results stop being a ranking.
  if (q.length < 4) return 0;

  let i = 0;
  for (const ch of t) {
    if (ch === q[i]) i++;
    if (i === q.length) return 30;
  }
  return 0;
}

function scoreDestination(dest, query) {
  if (!query) return 1;
  const label = score(dest.label, query);
  const keyword = score(dest.keywords, query) * 0.4;
  return Math.max(label, keyword);
}

/* ─── Rows ────────────────────────────────────────────────────────── */

function Row({ item, active, onSelect, id }) {
  return (
    <button
      id={id}
      type="button"
      role="option"
      aria-selected={active}
      onClick={() => onSelect(item)}
      // Keep the keyboard highlight authoritative: hover moves it rather than
      // fighting it, so mouse and arrows never disagree about what Enter does.
      onMouseMove={() => !active && onSelect(item, true)}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                  ${active ? 'bg-[#ff5500]/10' : 'hover:bg-white/5'}`}
    >
      <span
        className={`material-symbols-outlined flex-shrink-0 ${active ? 'text-[#ff5500]' : 'text-stone-500'}`}
        style={{ fontSize: 18, fontVariationSettings: "'FILL' 0" }}
      >
        {item.icon}
      </span>

      <span className="flex-1 min-w-0">
        <span className={`block font-body text-sm truncate ${active ? 'text-white' : 'text-stone-300'}`}>
          {item.label}
        </span>
        {item.sub && (
          <span className="block font-technical text-[10px] text-stone-600 truncate">
            {item.sub}
          </span>
        )}
      </span>

      {item.group && (
        <span className="font-technical text-[9px] uppercase tracking-widest text-stone-600 flex-shrink-0 hidden sm:block">
          {item.group}
        </span>
      )}
    </button>
  );
}

/* ─── Palette ─────────────────────────────────────────────────────── */

/**
 * Mounted only while open (AdminNavbar owns the AnimatePresence), so opening
 * the palette is a fresh mount: no state to reset, nothing stale to clear.
 */
export default function CommandPalette({ onClose, onAction }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const [remote, setRemote] = useState({ orders: [], products: [] });
  // The query the results in `remote` actually belong to — anything else means
  // a lookup is still in flight, which is all "searching" ever meant.
  const [resolved, setResolved] = useState('');
  const [recents] = useState(readRecents);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const restoreFocusTo = useRef(null);

  const term = query.trim();
  const searching = term.length >= 2 && resolved !== term;

  // Seeded on the query so the line holds still while you keep typing.
  const noResultsLine = useMemo(() => quip(PALETTE.noResults, query), [query]);

  const remember = useCallback((id) => {
    try {
      const next = [id, ...recents.filter((r) => r !== id)].slice(0, MAX_RECENTS);
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch { /* ignore */ }
  }, [recents]);

  /* ── Focus ──────────────────────────────────────── */

  useEffect(() => {
    restoreFocusTo.current = document.activeElement;
    // Focus once the entry animation has mounted the input.
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    const previous = restoreFocusTo.current;
    return () => {
      cancelAnimationFrame(frame);
      // Hand focus back to whatever had it, so ⌘K twice leaves no trace.
      previous?.focus?.();
    };
  }, []);

  /* ── Live lookup ────────────────────────────────── */

  useEffect(() => {
    if (term.length < 2) return;

    let alive = true;
    const timer = setTimeout(async () => {
      const filter = orderSearchFilter(term);

      const [orderRes, productRes] = await Promise.all([
        filter
          ? supabase.from('orders')
              .select('id, customer_name, phone, status, total_amount')
              .or(filter)
              .order('created_at', { ascending: false })
              .limit(6)
          : Promise.resolve({ data: [] }),
        supabase.from('products')
          .select('id, name, category, slug')
          .ilike('name', `%${term}%`)
          .limit(5),
      ]);

      if (!alive) return;
      setRemote({ orders: orderRes.data ?? [], products: productRes.data ?? [] });
      setResolved(term);
    }, SEARCH_DEBOUNCE_MS);

    return () => { alive = false; clearTimeout(timer); };
  }, [term]);

  /* ── Assemble the list ──────────────────────────────────────── */

  const items = useMemo(() => {
    if (!term) {
      const recentItems = recents
        .map((id) => COMMANDS.find((d) => d.id === id))
        .filter(Boolean)
        .map((d) => ({ ...d, group: 'Recent' }));

      const recentIds = new Set(recentItems.map((r) => r.id));
      return [...recentItems, ...COMMANDS.filter((d) => !recentIds.has(d.id))];
    }

    const link = linkIn(term);
    if (link) {
      let host = link;
      try { host = new URL(link).hostname.replace(/^www\./, ''); } catch { /* keep raw */ }
      return [{
        id: 'act-save-link',
        label: 'Save link to Ideas',
        sub: host,
        icon: 'bookmark_add',
        group: 'Action',
        to: `/admin/ideas?url=${encodeURIComponent(link)}`,
        transient: true,
      }];
    }

    const matched = COMMANDS
      .map((d) => ({ dest: d, s: scoreDestination(d, term) }))
      .filter(({ s }) => s > 0)
      .sort((a, b) => b.s - a.s)
      .map(({ dest }) => dest);

    const fresh = resolved === term ? remote : { orders: [], products: [] };

    const orders = fresh.orders.map((o) => ({
      id: `order-${o.id}`,
      label: o.customer_name || `Order #${o.id}`,
      sub: `#${o.id} · ${o.status}${o.phone ? ` · ${o.phone}` : ''}`,
      icon: 'receipt_long',
      group: 'Order',
      to: `/admin/orders?q=${encodeURIComponent(o.phone || o.customer_name || o.id)}`,
      transient: true,
    }));

    const products = fresh.products.map((p) => ({
      id: `product-${p.id}`,
      label: p.name,
      sub: p.category || 'Product',
      icon: 'inventory_2',
      group: 'Product',
      to: `/admin/products?q=${encodeURIComponent(p.name)}`,
      transient: true,
    }));

    return [...matched, ...orders, ...products];
  }, [term, recents, remote, resolved]);

  // Clamped at render rather than in an effect: results arrive asynchronously
  // and the list can shrink under the cursor between keystrokes.
  const active = items.length ? Math.min(cursor, items.length - 1) : 0;

  /* ── Run a result ───────────────────────────────────────────── */

  const run = useCallback((item, hoverOnly = false) => {
    if (hoverOnly) {
      const idx = items.findIndex((i) => i.id === item.id);
      if (idx >= 0) setCursor(idx);
      return;
    }
    if (!item.transient) remember(item.id);
    onClose();
    if (item.action) onAction?.(item.action);
    else navigate(item.to);
  }, [items, navigate, onClose, onAction, remember]);

  /* ── Keys inside the palette ────────────────────────────────── */

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (items.length) setCursor((active + 1) % items.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (items.length) setCursor((active - 1 + items.length) % items.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const item = items[active];
        if (item) run(item);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items, active, run, onClose]);

  // Keep the highlighted row on screen while arrowing through a long list.
  useEffect(() => {
    listRef.current
      ?.querySelector(`#palette-opt-${active}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <motion.div
      className="fixed inset-0 z-[180] bg-black/70 backdrop-blur-sm flex items-start justify-center px-4 pt-[12vh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-xl bg-[#111111] border border-white/10"
        style={{ boxShadow: '0 0 40px rgba(255, 85, 0, 0.18)' }}
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
          <span
            className="material-symbols-outlined text-[#ff5500] flex-shrink-0"
            style={{ fontSize: 20 }}
          >
            search
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
            placeholder={PALETTE.placeholder}
            aria-label="Search commands, orders and products"
            aria-controls="palette-list"
            aria-activedescendant={items.length ? `palette-opt-${active}` : undefined}
            className="flex-1 bg-transparent font-body text-white text-sm
                       placeholder:text-stone-600 outline-none"
          />
          {searching && (
            <svg className="animate-spin w-4 h-4 text-stone-600 flex-shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
        </div>

        {/* Results */}
        <div
          ref={listRef}
          id="palette-list"
          role="listbox"
          aria-label="Results"
          className="max-h-[52vh] overflow-y-auto py-1"
        >
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center font-body text-sm text-stone-500">
              {searching ? 'Looking…' : noResultsLine}
            </p>
          ) : (
            items.map((item, i) => (
              <Row
                key={item.id}
                id={`palette-opt-${i}`}
                item={item}
                active={i === active}
                onSelect={run}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between">
          <span className="font-technical text-[9px] uppercase tracking-widest text-stone-600">
            {PALETTE.footer}
          </span>
          <span className="font-technical text-[9px] uppercase tracking-widest text-stone-700">
            ↑↓ to choose
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
