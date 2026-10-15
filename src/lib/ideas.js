// Shared constants and helpers for the admin Ideas board.

export const IDEA_STATUSES = [
  { id: 'inbox',       label: 'Inbox',       color: '#555' },
  { id: 'shortlisted', label: 'Shortlisted', color: '#3b82f6' },
  { id: 'test_print',  label: 'Test Print',  color: '#ff5500' },
  { id: 'listed',      label: 'Listed',      color: '#22c55e' },
  { id: 'archived',    label: 'Archived',    color: '#333' },
];

export const IDEA_SOURCES = {
  makerworld: { label: 'MakerWorld', color: '#00ae42', icon: 'deployed_code' },
  instagram:  { label: 'Instagram',  color: '#e1306c', icon: 'photo_camera' },
  pinterest:  { label: 'Pinterest',  color: '#e60023', icon: 'push_pin' },
  other:      { label: 'Link',       color: '#777',    icon: 'link' },
};

export function detectSource(url) {
  let host;
  try { host = new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return 'other'; }
  if (host.startsWith('makerworld.')) return 'makerworld';
  if (host === 'instagram.com' || host.endsWith('.instagram.com')) return 'instagram';
  if (host === 'pin.it' || /(^|\.)pinterest\.[a-z.]+$/.test(host)) return 'pinterest';
  return 'other';
}

const TRACKING_PARAMS = /^(utm_|fbclid$|gclid$|igsh$|igshid$|si$|ref$|ref_src$|mibextid$|from$|invite_code$)/i;

// Same idea shared twice should collide: drop protocol, www., hash, tracking
// params and trailing slashes, and lowercase the host. Stored as ideas.url_key.
export function normaliseUrl(url) {
  let u;
  try { u = new URL(url.trim()); } catch { return null; }
  const params = [...u.searchParams.entries()]
    .filter(([k]) => !TRACKING_PARAMS.test(k))
    .sort(([a], [b]) => a.localeCompare(b));
  const query = params.length ? '?' + new URLSearchParams(params).toString() : '';
  const host = u.hostname.toLowerCase().replace(/^(www\.|m\.)/, '');
  const path = u.pathname.replace(/\/+$/, '');
  return `${host}${path}${query}`;
}

// Pull the first http(s) link out of whatever was pasted — share sheets often
// add text around it ("Check this out on Pinterest! https://pin.it/…").
export function extractUrl(text) {
  const m = (text || '').match(/https?:\/\/[^\s<>"']+/i);
  return m ? m[0].replace(/[).,!?]+$/, '') : null;
}

// Best-effort title from the link itself, for when the site blocks previews
// (MakerWorld sits behind Cloudflare): /en/models/123456-gridfinity-bin → "Gridfinity Bin".
export function titleFromUrl(url) {
  let path;
  try { path = new URL(url).pathname; } catch { return null; }
  const segment = path.split('/').filter(Boolean).reverse()
    .map(s => decodeURIComponent(s).replace(/^\d+[-_]?/, '').replace(/#.*$/, ''))
    .find(s => /[a-z]{3,}/i.test(s) && /[-_]/.test(s));
  if (!segment) return null;
  return segment.split(/[-_]+/).filter(Boolean)
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(' ')
    .slice(0, 140);
}
