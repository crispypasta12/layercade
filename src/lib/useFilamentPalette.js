import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { materialLabel } from './filament';

/** One entry per distinct colour among the given spool rows. */
function toPalette(rows) {
  const seen = new Map();
  for (const s of rows ?? []) {
    const key = `${s.color_name.toLowerCase()}|${s.hex.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.set(key, { key, name: s.color_name, hex: s.hex, detail: materialLabel(s) });
    }
  }
  return [...seen.values()];
}

/**
 * Colours we can actually print with: one entry per distinct colour among
 * spools that aren't used up. Feeds the product variant colour picker.
 */
export function useFilamentPalette() {
  const [colors,  setColors]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    supabase
      .from('filament_spools')
      .select('color_name, hex, material, finish, sort_order')
      .neq('status', 'empty')
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (ignore) return;
        setColors(toPalette(data));
        setLoading(false);
      });
    return () => { ignore = true; };
  }, []);

  return { colors, loading };
}
