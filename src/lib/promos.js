import { supabase } from './supabase';

/**
 * Hero promo slides.
 *
 * The brand slide is not in here — it lives in code (see hero/slides.js) so a
 * visitor who never advances always sees it and it can't be deleted from the
 * admin by accident. These are the seasonal slides that sit after it.
 */

const COLUMNS = `
  id, title, eyebrow, badge, body, footnote,
  image_url, image_alt, image_position, layout, accent,
  cta_label, cta_href, countdown_to,
  published, starts_at, ends_at, sort_order
`;

/** DB row → the shape HeroCarousel's slide renderers expect. */
export function toSlide(row) {
  return {
    id:            row.id,
    kind:          'promo',
    layout:        row.layout ?? 'full-bleed',
    image:         row.image_url,
    imageAlt:      row.image_alt ?? '',
    imagePosition: row.image_position ?? undefined,
    accent:        row.accent ?? undefined,
    eyebrow:       row.eyebrow ?? undefined,
    badge:         row.badge ?? undefined,
    title:         row.title,
    body:          row.body ?? undefined,
    footnote:      row.footnote ?? undefined,
    countdownTo:   row.countdown_to ?? undefined,
    cta: row.cta_label
      ? { label: row.cta_label, to: row.cta_href || '/shop' }
      : undefined,
  };
}

/**
 * Live slides for the storefront. RLS already hides drafts and expired
 * windows from anonymous visitors; the window is re-checked here so a signed-in
 * team member browsing the shop sees what a customer sees, not their drafts.
 */
export async function fetchLiveSlides() {
  const { data, error } = await supabase
    .from('promos')
    .select(COLUMNS)
    .eq('published', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[promos] fetchLiveSlides:', error.message);
    return [];
  }

  const now = Date.now();
  return (data ?? [])
    .filter((r) => {
      const startsOk = !r.starts_at || new Date(r.starts_at).getTime() <= now;
      const endsOk   = !r.ends_at   || new Date(r.ends_at).getTime()   >  now;
      return startsOk && endsOk && r.image_url;
    })
    .map(toSlide);
}

/** Everything, drafts included. Team members only (enforced by RLS). */
export async function fetchAllPromos() {
  const { data, error } = await supabase
    .from('promos')
    .select(`${COLUMNS}, created_at, updated_at`)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[promos] fetchAllPromos:', error.message);
    return [];
  }
  return data ?? [];
}

/** Why a promo isn't on the storefront right now, or null if it is. */
export function dormantReason(promo, now = Date.now()) {
  if (!promo.published) return 'Draft';
  if (!promo.image_url) return 'No image';
  if (promo.starts_at && new Date(promo.starts_at).getTime() > now) return 'Scheduled';
  if (promo.ends_at && new Date(promo.ends_at).getTime() <= now) return 'Expired';
  return null;
}

export async function savePromo(id, fields) {
  const query = id
    ? supabase.from('promos').update(fields).eq('id', id)
    : supabase.from('promos').insert(fields);
  const { error } = await query;
  if (error) throw new Error(error.message);
}

export async function deletePromo(id) {
  const { error } = await supabase.from('promos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
