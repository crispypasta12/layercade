import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

export function useColors() {
  const [colors,  setColors]  = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchColors = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('colors')
      .select('id, name, hex, sort_order')
      .order('sort_order', { ascending: true });
    setColors(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchColors(); }, [fetchColors]);

  return { colors, loading, refetch: fetchColors };
}
