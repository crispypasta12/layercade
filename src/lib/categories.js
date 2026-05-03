export const PARENT_CATEGORIES = [
  { name: 'Gaming Setup',                  slug: 'gaming-setup' },
  { name: 'Home & Office Decor',           slug: 'home-office-decor' },
  { name: 'Action Figures & Collectibles', slug: 'action-figures-collectibles' },
  { name: 'Miniatures & Dioramas',         slug: 'miniatures-dioramas' },
  { name: 'Custom Accessories',            slug: 'custom-accessories' },
  { name: 'Gift Items',                    slug: 'gift-items' },
];

export const SUB_CATEGORIES = [
  // Gaming Setup
  { name: 'Gaming Accessories',    slug: 'gaming-accessories',    parentSlug: 'gaming-setup' },
  { name: 'Headphone Stands',      slug: 'headphone-stands',      parentSlug: 'gaming-setup' },
  { name: 'Keycaps',               slug: 'keycaps',               parentSlug: 'gaming-setup' },
  { name: 'Desk Accessories',      slug: 'desk-accessories',      parentSlug: 'gaming-setup' },
  { name: 'RGB Lights & Accessories', slug: 'rgb-lights-accessories', parentSlug: 'gaming-setup' },
  // Home & Office Decor
  { name: 'Room Decor',            slug: 'room-decor',            parentSlug: 'home-office-decor' },
  { name: 'Flower Vases',          slug: 'flower-vases',          parentSlug: 'home-office-decor' },
  { name: 'Desk Organizers',       slug: 'desk-organizers',       parentSlug: 'home-office-decor' },
  { name: 'Organizing Essentials', slug: 'organizing-essentials', parentSlug: 'home-office-decor' },
  // Action Figures & Collectibles
  { name: 'Anime Figures',         slug: 'anime-figures',         parentSlug: 'action-figures-collectibles' },
  { name: 'Collectibles',          slug: 'collectibles',          parentSlug: 'action-figures-collectibles' },
  { name: 'Figures',               slug: 'figures',               parentSlug: 'action-figures-collectibles' },
  { name: 'Movie/Comic Characters',slug: 'movie-comic-characters',parentSlug: 'action-figures-collectibles' },
  { name: 'Display Accessories',   slug: 'display-accessories',   parentSlug: 'action-figures-collectibles' },
  { name: 'Limited Editions',      slug: 'limited-editions',      parentSlug: 'action-figures-collectibles' },
  // Miniatures & Dioramas
  { name: 'Diorama',               slug: 'diorama',               parentSlug: 'miniatures-dioramas' },
  { name: 'Diorama Sets',          slug: 'diorama-sets',          parentSlug: 'miniatures-dioramas' },
  { name: 'Display Bases',         slug: 'display-bases',         parentSlug: 'miniatures-dioramas' },
  { name: 'Themed Scenes',         slug: 'themed-scenes',         parentSlug: 'miniatures-dioramas' },
  // Custom Accessories
  { name: 'Busts',                 slug: 'busts',                 parentSlug: 'custom-accessories' },
  { name: 'Masks',                 slug: 'masks',                 parentSlug: 'custom-accessories' },
  { name: 'Pegboard Accessories',  slug: 'pegboard-accessories',  parentSlug: 'custom-accessories' },
  { name: 'Custom Keycaps',        slug: 'custom-keycaps',        parentSlug: 'custom-accessories' },
  // Gift Items
  { name: 'For Gamers',            slug: 'gift-for-gamers',       parentSlug: 'gift-items' },
  { name: 'For Office',            slug: 'gift-for-office',       parentSlug: 'gift-items' },
  { name: 'For Home',              slug: 'gift-for-home',         parentSlug: 'gift-items' },
  { name: 'Gift Collectibles',     slug: 'gift-collectibles',     parentSlug: 'gift-items' },
];

/** All categories flat — parents first, then subs. */
export const CATEGORIES = [...PARENT_CATEGORIES, ...SUB_CATEGORIES];

/** All category name strings (sub-categories only — used for product assignment). */
export const CATEGORY_NAMES = SUB_CATEGORIES.map((c) => c.name);

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

/** Returns true if a slug belongs to a parent category. */
export function isParentSlug(slug) {
  return PARENT_CATEGORIES.some((c) => c.slug === slug);
}

/** Returns all sub-category names that belong to a given parent slug. */
export function subCategoryNamesForParent(parentSlug) {
  return SUB_CATEGORIES.filter((c) => c.parentSlug === parentSlug).map((c) => c.name);
}
