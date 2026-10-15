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

// ─── Screenshots ────────────────────────────────────────────────────────────
// Ideas whose site hides its preview (Instagram, MakerWorld) get a pasted or
// uploaded screenshot instead. Phone screenshots are several MB, so shrink to
// 1200px on the long edge and re-encode as WebP before uploading.

const IDEA_BUCKET = 'idea-images';
const MAX_EDGE = 1200;

export function firstImageFile(dataTransfer) {
  if (!dataTransfer) return null;
  return [...(dataTransfer.files || [])].find(f => f.type.startsWith('image/')) || null;
}

async function shrinkImage(file) {
  if (file.type === 'image/gif') return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.85));
  return blob || file;
}

export async function uploadIdeaImage(supabase, file) {
  const blob = await shrinkImage(file);
  const type = blob.type || file.type;
  const ext = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif' }[type] || 'img';
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(IDEA_BUCKET).upload(path, blob, { contentType: type });
  if (error) throw error;
  return supabase.storage.from(IDEA_BUCKET).getPublicUrl(path).data.publicUrl;
}

// Path inside our bucket for images we host, or null for remote links.
export function storedImagePath(imageUrl) {
  return imageUrl?.split(`/storage/v1/object/public/${IDEA_BUCKET}/`)[1] || null;
}

export function removeIdeaImage(supabase, imageUrl) {
  const path = storedImagePath(imageUrl);
  if (path) supabase.storage.from(IDEA_BUCKET).remove([path]);
}

export function normaliseTag(tag) {
  return tag.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, ' ').slice(0, 30);
}

// ─── Target dates ────────────────────────────────────────────────────
// needed_by is a plain date ("2027-03-10"), compared in local time.

export const DUE_SOON_DAYS = 45;

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function daysUntil(dateStr, today = new Date()) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((new Date(y, m - 1, d) - start) / 86400000);
}

// nth weekday of a month, e.g. Mother's Day = 2nd Sunday of May.
function nthWeekday(year, month, weekday, n) {
  const first = new Date(year, month - 1, 1);
  return new Date(year, month - 1, 1 + ((weekday - first.getDay() + 7) % 7) + (n - 1) * 7);
}

// Eid follows moon sighting, so these are estimates to adjust once announced.
const EID_DATES = [
  ['Eid ul-Fitr', '2027-03-10'], ['Eid ul-Adha', '2027-05-17'],
  ['Eid ul-Fitr', '2028-02-27'], ['Eid ul-Adha', '2028-05-06'],
];

// The next date of each occasion the shop sells for, soonest first.
export function upcomingOccasions(today = new Date()) {
  const out = [];
  for (const year of [today.getFullYear(), today.getFullYear() + 1]) {
    out.push(
      { label: "Valentine's Day", date: isoDate(new Date(year, 1, 14)) },
      { label: 'Pohela Boishakh', date: isoDate(new Date(year, 3, 14)) },
      { label: "Mother's Day",    date: isoDate(nthWeekday(year, 5, 0, 2)) },
      { label: "Father's Day",    date: isoDate(nthWeekday(year, 6, 0, 3)) },
      { label: 'Victory Day',     date: isoDate(new Date(year, 11, 16)) },
      { label: 'Christmas',       date: isoDate(new Date(year, 11, 25)) },
    );
  }
  for (const [label, date] of EID_DATES) out.push({ label, date, estimated: true });
  const seen = new Set();
  return out
    .filter(o => daysUntil(o.date, today) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter(o => !seen.has(o.label) && seen.add(o.label));
}

// How a card should show its target date: tone is 'urgent' (two weeks or
// less), 'soon', 'later', 'done' (already listed) or 'past'.
export function deadlineInfo(idea, today = new Date()) {
  const days = daysUntil(idea.needed_by, today);
  if (days == null) return null;
  const name = idea.occasion || 'Needed';
  if (idea.status === 'listed') return { days, tone: 'done', label: `Ready for ${idea.occasion || 'the date'}` };
  if (days < 0) return { days, tone: 'past', label: `${idea.occasion || 'Date'} passed` };
  const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days}d`;
  return { days, tone: days <= 14 ? 'urgent' : days <= DUE_SOON_DAYS ? 'soon' : 'later', label: `${name} ${when}` };
}

// ─── Sales of listed ideas ───────────────────────────────────────────
// Shop orders carry productId on each line; orders typed in by hand only
// carry the product name, so those are matched by name.

export function salesByProduct(orders, products) {
  const byName = new Map(products.map(p => [p.name.trim().toLowerCase(), p.id]));
  const ids = new Set(products.map(p => String(p.id)));
  const out = {};
  for (const order of orders) {
    const counted = new Set();
    for (const line of order.items || []) {
      const pid = line.productId != null && ids.has(String(line.productId))
        ? String(line.productId)
        : byName.get(String(line.name || '').trim().toLowerCase())?.toString();
      if (!pid) continue;
      const s = (out[pid] ||= { orders: 0, units: 0, revenue: 0, lastAt: null });
      const qty = Number(line.quantity) || 1;
      s.units += qty;
      s.revenue += (Number(line.price) || 0) * qty;
      if (!counted.has(pid)) { s.orders += 1; counted.add(pid); }
      if (!s.lastAt || order.created_at > s.lastAt) s.lastAt = order.created_at;
    }
  }
  return out;
}
