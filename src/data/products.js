/**
 * Product data layer — backed by Supabase.
 * All functions are async and return plain objects that match the
 * shape components expect (img1, img2, slug, sale, etc.)
 */
import { parseProductImages } from '../lib/productImages';
import { supabase } from '../lib/supabase';

const PRODUCT_CARD_COLUMNS =
  'id, name, slug, description, price, category, image, images, featured, new_arrival, stock_status, sort_order, has_color_variants';

const PRODUCT_COLORS_COLUMNS =
  'id, color_id, name, hex, image, images, price, stock_status, sort_order, is_active';

// Lightweight color columns used on listing cards (no images needed)
const SWATCH_COLORS_COLUMNS = 'id, name, hex, sort_order, is_active';

const CARD_WITH_COLORS_SELECT =
  `${PRODUCT_CARD_COLUMNS}, product_colors(${SWATCH_COLORS_COLUMNS})`;

// ─── Shape adapter ───────────────────────────────────────────────────────────
// Converts a raw Supabase row into the shape used by existing components.
function toProduct(row) {
  const images = parseProductImages(row.image, row.images);
  const primaryImage = images[0] ?? null;
  const secondaryImage = images[1] ?? primaryImage;

  const colorVariants = row.product_colors
    ? [...row.product_colors].sort((a, b) => a.sort_order - b.sort_order)
    : [];

  return {
    // Core fields
    id:           row.id,
    name:         row.name,
    slug:         row.slug,
    description:  row.description ?? '',
    price:        Number(row.price),
    category:     row.category,
    image:        primaryImage,
    images,
    // Derived image fields (components use img1 / img2)
    img1:         primaryImage,
    img2:         secondaryImage,
    // Flags
    featured:          row.featured,
    isBestSeller:      row.featured,
    isNew:             row.new_arrival,
    new_arrival:       row.new_arrival,
    stock_status:      row.stock_status,
    sort_order:        row.sort_order,
    has_color_variants: row.has_color_variants ?? false,
    colorVariants,
    // Legacy compat: components check product.sale for strike-through price
    sale:         false,
    originalPrice: null,
    // Kept for ProductModalPage
    material:    null,
    color:       null,
    subcategory: null,
    rating:      0,
    reviews:     0,
    // New Arrivals section uses series label
    series:      row.category,
  };
}

// ─── Variant resolver ────────────────────────────────────────────────────────
/**
 * Returns a product view with image/price/stock resolved to the given color
 * variant (or the first active variant when colorId is null).
 * Returns the product unchanged when it has no active variants.
 */
export function resolveProductView(product, colorId = null) {
  if (!product.has_color_variants || !product.colorVariants?.length) return product;

  const active = product.colorVariants.filter((v) => v.is_active);
  if (!active.length) return product;

  const variant = (colorId ? active.find((v) => v.id === colorId) : null) ?? active[0];
  if (!variant) return product;

  const variantImages = parseProductImages(variant.image, variant.images);
  const primaryImage   = variantImages[0] ?? product.images[0] ?? null;
  const secondaryImage = variantImages[1] ?? primaryImage;

  return {
    ...product,
    activeVariant: variant,
    image:        primaryImage,
    img1:         primaryImage,
    img2:         secondaryImage,
    images:       variantImages.length > 0 ? variantImages : product.images,
    price:        variant.price != null ? Number(variant.price) : product.price,
    stock_status: variant.stock_status,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** All products ordered by sort_order asc */
export async function fetchProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[products] fetchProducts error:', error.message);
    return [];
  }
  return data.map(toProduct);
}

/** Products where featured = true, ordered by sort_order */
export async function getFeaturedProducts() {
  const { data, error } = await supabase
    .from('products')
    .select(CARD_WITH_COLORS_SELECT)
    .eq('featured', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[products] getFeaturedProducts error:', error.message);
    return [];
  }
  return data.map(toProduct);
}

/** Products where new_arrival = true, ordered by sort_order, limit 3 */
export async function getNewArrivals() {
  const { data, error } = await supabase
    .from('products')
    .select(CARD_WITH_COLORS_SELECT)
    .eq('new_arrival', true)
    .order('sort_order', { ascending: true })
    .limit(3);

  if (error) {
    console.error('[products] getNewArrivals error:', error.message);
    return [];
  }
  return data.map(toProduct);
}

/**
 * Up to 3 related products: same category first, then others.
 * Fetches a small batch and sorts client-side — avoids loading all products.
 * Includes color variants so swatch strips render on related product cards.
 */
export async function getRelatedProducts(category, excludeSlug) {
  const { data, error } = await supabase
    .from('products')
    .select(`*, product_colors(${PRODUCT_COLORS_COLUMNS})`)
    .neq('slug', excludeSlug)
    .order('sort_order', { ascending: true })
    .limit(10);

  if (error) {
    console.error('[products] getRelatedProducts error:', error.message);
    return [];
  }

  const all = (data ?? []).map(toProduct);
  const sameCategory = all.filter((p) => p.category === category);
  const others = all.filter((p) => p.category !== category);
  return [...sameCategory, ...others].slice(0, 3);
}

/**
 * Paginated product fetch, optionally filtered by category, price range, and sort order.
 * Returns { products, total } where total is the full unsliced count.
 *
 * sort values: 'featured' | 'price_asc' | 'price_desc' | 'newest' | 'name_asc' | 'name_desc'
 */
export async function fetchProductsByCategory({
  category = null,
  page     = 1,
  perPage  = 12,
  sort     = 'featured',
  priceMin = null,
  priceMax = null,
} = {}) {
  const from = (page - 1) * perPage;
  const to   = from + perPage - 1;

  let query = supabase
    .from('products')
    .select(`*, product_colors(${SWATCH_COLORS_COLUMNS})`, { count: 'exact' })
    .range(from, to);

  if (category)        query = query.eq('category', category);
  if (priceMin !== null) query = query.gte('price', priceMin);
  if (priceMax !== null) query = query.lte('price', priceMax);

  switch (sort) {
    case 'price_asc':  query = query.order('price', { ascending: true });  break;
    case 'price_desc': query = query.order('price', { ascending: false }); break;
    case 'newest':
      query = query
        .order('new_arrival', { ascending: false })
        .order('sort_order',  { ascending: true });
      break;
    case 'name_asc':   query = query.order('name', { ascending: true });   break;
    case 'name_desc':  query = query.order('name', { ascending: false });  break;
    default:           query = query.order('sort_order', { ascending: true }); // 'featured'
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[products] fetchProductsByCategory error:', error.message);
    return { products: [], total: 0 };
  }

  return {
    products: (data ?? []).map(toProduct),
    total: count ?? 0,
  };
}

/**
 * Full-text search across name, category, and description.
 * Returns up to `limit` results ordered by sort_order.
 */
export async function searchProducts(query, limit = 8) {
  const q = query.trim();
  if (!q) return [];

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .or(`name.ilike.%${q}%,category.ilike.%${q}%,description.ilike.%${q}%`)
    .order('sort_order', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[products] searchProducts error:', error.message);
    return [];
  }
  return (data ?? []).map(toProduct);
}

/** Single product by slug, or null if not found. Includes color variants. */
export async function getProductBySlug(slug) {
  const { data, error } = await supabase
    .from('products')
    .select(`*, product_colors(${PRODUCT_COLORS_COLUMNS})`)
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('[products] getProductBySlug error:', error.message);
    return null;
  }
  return toProduct(data);
}
