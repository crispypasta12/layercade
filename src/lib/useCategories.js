import { useState, useEffect } from 'react';
import { supabase } from './supabase';

/**
 * Fetches all categories from Supabase ordered by sort_order.
 *
 * Returns:
 *   allCategories     — every row (parent + sub)
 *   parentCategories  — rows where parent_id IS NULL
 *   subCategories     — rows where parent_id IS NOT NULL
 *   categories        — alias for allCategories (backwards compat)
 *   loading
 */
export function useCategories() {
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('categories')
      .select('id, name, slug, sort_order, image_url, parent_id')
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        setAllCategories(data ?? []);
        setLoading(false);
      });
  }, []);

  const parentCategories = allCategories.filter((c) => c.parent_id === null);
  const subCategories    = allCategories.filter((c) => c.parent_id !== null);

  return {
    allCategories,
    parentCategories,
    subCategories,
    categories: allCategories,
    loading,
  };
}
