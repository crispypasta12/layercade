import { useState, useEffect } from 'react';
import { supabase } from './supabase';

/**
 * Fetches categories from Supabase, ordered by sort_order.
 * Each category: { id, name, slug, sort_order }
 */
export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    supabase
      .from('categories')
      .select('id, name, slug, sort_order, image_url')
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        setCategories(data ?? []);
        setLoading(false);
      });
  }, []);

  return { categories, loading };
}
