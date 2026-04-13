/**
 * Product data layer — backed by Supabase.
 * All functions are async and return plain objects that match the
 * shape components expect (img1, img2, slug, sale, etc.)
 */
import { supabase } from '../lib/supabase';

// ─── Shape adapter ───────────────────────────────────────────────────────────
// Converts a raw Supabase row into the shape used by existing components.
function toProduct(row) {
  return {
    // Core fields
    id:           row.id,
    name:         row.name,
    slug:         row.slug,
    description:  row.description ?? '',
    price:        Number(row.price),
    category:     row.category,
    image:        row.image,
    // Derived image fields (components use img1 / img2)
    img1:         row.image,
    img2:         row.image,
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
