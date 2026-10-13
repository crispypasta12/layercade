// Brand voice — every playful line on the storefront lives here.
// Rule of thumb: the fact comes first, the joke rides along. Never joke
// about money, privacy, or anything a customer needs to read twice.

export const pick = (lines) => lines[Math.floor(Math.random() * lines.length)];

export const ANNOUNCEMENTS = [
  'FREE DELIVERY OVER 1,000৳ IN DHAKA. THE TRAFFIC IS ON US',
  'CASH ON DELIVERY, BECAUSE WE TRUST YOU MORE THAN YOUR BANK DOES',
  'PREMIUM QUALITY 3D PRINTS. LAYER LINES SOLD SEPARATELY (THEY ARE NOT FOR SALE)',
  'CUSTOM ORDERS WELCOME. WE DO NOT JUDGE YOUR STL FILES. MUCH',
  'SAME-WEEK TURNAROUND, LOAD-SHEDDING PERMITTING',
];

export const FOOTER_TAGLINE =
  'We melt plastic for a living. Very precisely. Our parents are still processing this.';

export const FOOTER_STATS = [
  ['STATUS', 'OPTIMAL (ALLEGEDLY)'],
  ['PRINTER MORALE', 'LOW'],
  ['UPTIME', '99.98% (THE 0.02% WAS DESCO)'],
  ['SPAGHETTI INCIDENTS', 'CLASSIFIED'],
  ['NOZZLE TEMP', 'HOTTER THAN YOUR TAKES'],
  ['SLEEP SCHEDULE', 'NOT FOUND'],
  ['FAILED PRINTS TODAY', 'WE DO NOT TALK ABOUT IT'],
  ['LOCATION', 'DHAKA, BD (STUCK IN TRAFFIC)'],
];

export const COPYRIGHT_QUIP = 'All rights reserved. All layers too.';

export const EMPTY_CART = [
  'Your desk is probably empty too. We can fix one of those.',
  'Nothing here. Like your weekend plans.',
  'Zero items. The printers are disappointed, but not surprised.',
];

export const ADDED_TO_CART = [
  'Possibly your best decision this week.',
  'Excellent taste. Questionable impulse control.',
  'The printers have been notified. They are thrilled.',
];

export const CHECKOUT_PHONE_QUIP = "We'll call to confirm. Please pick up. The rider has feelings.";
export const CHECKOUT_NOTES_PLACEHOLDER =
  'Preferred delivery time, gate code, or a confession. We read everything.';

export const ORDER_PLACED = [
  'Somewhere, a nozzle just heated up to 210°C in your honour.',
  'A printer has been assigned to you. It will not sleep until it is done. Neither will we.',
  'Your order is in the queue. The queue is in a mild panic.',
];

export const NOT_FOUND = [
  'This page failed mid-print. It is spaghetti now.',
  'Bed adhesion failure. The page detached and walked off.',
  'We looked everywhere. Even behind the filament spools.',
];

export const SEARCH_EMPTY = [
  'Either it does not exist yet, or you spelled it like a Wi-Fi password.',
  'Our catalogue has failed you. Our printers have not.',
  'Nothing. But we print custom things, which is a loophole.',
];

export const QUOTE_NAME_PLACEHOLDER = 'Your name (or alias, we do not judge)';
export const QUOTE_DETAILS_PLACEHOLDER =
  'Specs, quantity, material preferences. Or a photo of the thing your cat broke.';

// Keyed by material name on the Materials page
export const MATERIAL_PERSONALITIES = {
  PLA:   'Personality: the golden retriever of plastics. Friendly, reliable, melts in a hot car.',
  PETG:  'Personality: PLA after therapy. Tougher, calmer, still a bit stringy.',
  TPU:   'Personality: flexible. Unlike our printer queue.',
  RESIN: 'Personality: high maintenance, absolutely worth it. Wear gloves.',
};

export const AWAY_TITLES = [
  'COME BACK. THE PRINTER MISSES YOU.',
  'Your cart is getting cold…',
  'Still here. Still printing. Still waiting.',
];

export const SPAGHETTI_MODE = 'SPAGHETTI MODE ENGAGED. Bed adhesion: lost. Dignity: also lost.';

export const FAQ_JOKE = {
  q: 'What happens to failed prints?',
  a: 'They go to a better place. The better place is a bin. We hold a short service.',
};

export const WHATSAPP_TOOLTIP = 'Talk to a human. Real one. Probably awake.';

// Keyed by step title on the Process page
export const PROCESS_ASIDES = {
  'Upload Your File': 'We open every file. Yes, even that one.',
  'Review & Quote':   'An engineer squints at your model and says "hmm". This is a professional "hmm".',
  'Print & Quality':  'This takes hours. We watch it the whole time. We have no hobbies.',
  'Ship to You':      'Wrapped like it owes us money. Then it meets Dhaka traffic.',
};

export const REVIEWS_QUIP       = 'Unpaid testimonials. We checked.';
export const REVIEWS_EMPTY_QUIP = 'No reviews yet. Be the first. We will be nervous.';
