/**
 * Hero carousel slides.
 *
 * Only the brand slide lives here. It is always first and always present: it
 * ships in the bundle so the hero paints without waiting on the network, it
 * carries both CTAs, and keeping it out of the database means nobody can
 * delete it from the admin by accident.
 *
 * Every other slide is a row in `promos`, managed at /admin/promos and
 * mapped to this shape by src/lib/promos.js.
 */

/** Falls back to the house orange when a slide sets no accent. */
export const DEFAULT_ACCENT = '#ff5500';

export const BRAND_SLIDE = {
  id: 'brand',
  kind: 'brand',
};
