/**
 * Product data layer — backed by Supabase.
 * All functions are async and return plain objects that match the
 * shape components expect (img1, img2, slug, sale, etc.)
 */
import { parseProductImages } from '../lib/productImages';
import { supabase } from '../lib/supabase';

// ─── Shape adapter ───────────────────────────────────────────────────────────
// Converts a raw Supabase row into the shape used by existing components.
function toProduct(row) {
  const images = parseProductImages(row.image, row.images);
  const primaryImage = images[0] ?? null;
  const secondaryImage = images[1] ?? primaryImage;

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
    featured:     row.featured,
    isBestSeller: row.featured,
    isNew:        row.new_arrival,
    new_arrival:  row.new_arrival,
    stock_status: row.stock_status,
    sort_order:   row.sort_order,
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
    .select('*')
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
    .select('*')
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
 */
export async function getRelatedProducts(category, excludeSlug) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
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
    .select('*', { count: 'exact' })
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

/** Single product by slug, or null if not found */
export async function getProductBySlug(slug) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('[products] getProductBySlug error:', error.message);
    return null;
  }
  return toProduct(data);
}
