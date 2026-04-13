/**
 * Canonical category list used by the shop page, admin forms, and landing page.
 * Update this file when adding or renaming categories — everything else reads from here.
 */
export const CATEGORIES = [
  { name: 'Gaming Accessories',   slug: 'gaming-accessories' },
  { name: 'Headphone Stands',     slug: 'headphone-stands' },
  { name: 'Busts',                slug: 'busts' },
  { name: 'Masks',                slug: 'masks' },
  { name: 'Diorama',              slug: 'diorama' },
  { name: 'Keycaps',              slug: 'keycaps' },
  { name: 'Flower Vases',         slug: 'flower-vases' },
  { name: 'Desk Accessories',     slug: 'desk-accessories' },
  { name: 'Pegboard Accessories', slug: 'pegboard-accessories' },
  { name: 'Room Decor',           slug: 'room-decor' },
  { name: 'Collectibles',         slug: 'collectibles' },
  { name: 'Headphone Gear',       slug: 'headphone-gear' },
  { name: 'Sculptures',           slug: 'sculptures' },
  { name: 'Custom',               slug: 'custom' },
];

/** All category name strings, for use in dropdowns and filter lists. */
export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);

/** Convert a category name to its URL slug. */
export function categoryToSlug(name) {
  const found = CATEGORIES.find((c) => c.name === name);
  if (found) return found.slug;
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/** Convert a URL slug back to a category name, or null if not found. */
export function slugToCategory(slug) {
  return CATEGORIES.find((c) => c.slug === slug)?.name ?? null;
}
