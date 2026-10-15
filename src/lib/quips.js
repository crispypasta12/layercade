/**
 * Every joke in the admin panel comes from this file.
 *
 * Keeping the voice in one module means it can be retuned — or dialled all the
 * way back — without touching eleven pages. Two rules hold everywhere:
 *
 *   1. Humor never replaces information. A destructive button still says what it
 *      destroys; a failed request still prints the real error underneath.
 *   2. Admin only. Nothing here is imported from a customer-facing page.
 */

/* ─── Navigation ──────────────────────────────────────────────────── */

export const GROUP_TAGLINES = {
  catalogue: 'Things we talk people into wanting',
  workshop:  'Where the hours go',
  money:     'Look away if squeamish',
};

/* ─── Page headers ────────────────────────────────────────────────── */
// Shown small and dim under each page's H1. One line per route, seeded on the
// pathname so it stays put while you work.

export const PAGE_TAGLINES = {
  '/admin':            ['Everything, at a glance, whether you like it or not'],
  '/admin/orders':     ['Strangers want things. Again.'],
  '/admin/products':   ['Objects we have convinced people to want'],
  '/admin/categories': ['Taxonomy: the last refuge of the overwhelmed'],
  '/admin/inventory':  ['Plastic, measured in regret per gram'],
  '/admin/calculator': ['Arithmetic that decides whether this was worth it'],
  '/admin/invoices':   ['Paperwork, politely demanding'],
  '/admin/tasks':      ['Promises you made to yourself'],
  '/admin/ideas':      ['A graveyard with good intentions'],
  '/admin/expenses':   ['The money, and where it went instead'],
  '/admin/reviews':    ['Public judgement, awaiting your approval'],
};

/* ─── Empty states ────────────────────────────────────────────────── */
// `empty` = nothing exists yet. `filtered` = things exist, none match.

export const EMPTY = {
  orders: [
    'Zero orders. Zero purpose. Carry on.',
    'No orders. The printers are enjoying the rest.',
    'Nobody wants anything. Deeply humbling.',
  ],
  products: [
    'No products. Nothing to sell, nothing to lose.',
    'An empty catalogue. Pure, in its way.',
  ],
  categories: [
    'No categories. Chaos, unlabelled.',
  ],
  inventory: [
    'No spools. The printers are fasting.',
    'No filament. The machines hunger and we have nothing.',
  ],
  tasks: [
    'No tasks. Suspicious. Someone is lying.',
    'An empty board. Either finished or forgotten.',
  ],
  ideas: [
    'No ideas. Creative death is a process, not an event.',
    'The idea graveyard is empty. For now.',
  ],
  expenses: [
    "No expenses. Either a good month or nobody's logging.",
    'No spending recorded. Unlikely, but lovely.',
  ],
  reviews: [
    'No reviews here. Silence is its own verdict.',
  ],
  filtered: [
    'Nothing matches. Even the filters gave up.',
    'No results. Try asking for something that exists.',
    'Nothing. The search was thorough and the search was disappointed.',
  ],
};

/* ─── Loading ─────────────────────────────────────────────────────── */
// Rotates on purpose — these are read for half a second at a time.

export const LOADING = [
  'Reticulating your remaining hope…',
  'Asking the database if it still loves us…',
  'Counting money that is not there yet…',
  'Waking the server. It is not pleased…',
  'Fetching numbers you may not enjoy…',
];

/* ─── Welcome splash ──────────────────────────────────────────────── */
// Replaces "Welcome back" on the session-start splash. Highest-traffic copy in
// the panel: it is the first thing anyone sees each day.

export const WELCOME = [
  'Back for more punishment',
  'Nobody else showed up either',
  'The machines missed you, probably',
  'Returned of your own free will',
  'Here again, by choice, allegedly',
];

/* ─── Access denied ───────────────────────────────────────────────── */

export const ACCESS_DENIED = [
  'Not a member. The door does not know you.',
];

/* ─── Destructive confirmations ───────────────────────────────────── */
// Body copy only. The button label always says literally what it does.

export const DESTRUCTIVE = [
  'This is permanent, like most mistakes.',
  'There is no undo. There never was.',
  'Gone means gone. Decide accordingly.',
];

/* ─── Errors ──────────────────────────────────────────────────────── */
// Always rendered ABOVE the real error text, never instead of it.

export const ERRORS = [
  'The database has stopped returning our calls.',
  'Something failed. It was probably not you.',
  'That did not work, and it was rude about it.',
];

/* ─── Command palette ─────────────────────────────────────────────── */

export const PALETTE = {
  placeholder: 'Where to, unfortunate soul?',
  noResults: [
    'Nothing. Try words that exist.',
    'No matches. The void is unhelpful today.',
  ],
  footer: 'Enter to go · Esc to flee',
};

/* ─── Picker ──────────────────────────────────────────────────────── */

/**
 * Pick a line from a pool.
 *
 * Pass a `seed` (a pathname, a row count — anything stable) when the line must
 * not reshuffle on every render: a page header that flickered through five
 * jokes while you typed would be unusable. Omit it for copy that should vary,
 * like a loading line or the welcome splash.
 */
export function quip(pool, seed) {
  const lines = Array.isArray(pool) ? pool : [pool];
  if (!lines.length) return '';
  if (seed === undefined || seed === null) {
    return lines[Math.floor(Math.random() * lines.length)];
  }
  const str = String(seed);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return lines[Math.abs(hash) % lines.length];
}

/** Empty-state line: the "nothing matches" joke when filters are on. */
export function emptyQuip(key, isFiltered, seed) {
  return quip(isFiltered ? EMPTY.filtered : (EMPTY[key] ?? EMPTY.filtered), seed);
}

/** Tagline for a route, or '' for routes without one. */
export function pageTagline(pathname) {
  const pool = PAGE_TAGLINES[pathname];
  return pool ? quip(pool, pathname) : '';
}
