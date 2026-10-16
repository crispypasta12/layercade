import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { isRunningLow } from './filament';
import { useCurrentMember } from '../contexts/CurrentMemberContext';

/**
 * Counts for the nav badges: how many things are actually waiting for someone.
 *
 * The navbar is mounted on every admin page, so this runs once per page view
 * plus a refresh each minute. Four of the five are `head: true` count queries
 * that transfer no rows; spools need the rows because "running low" is a
 * weight calculation (see isRunningLow in ./filament).
 *
 * `tasks` counts overdue tasks assigned to the signed-in member.
 *
 * Returns { orders, ideas, tasks, inventory, reviews } — all numbers, 0 when
 * nothing is pending or when a query failed. A badge is a nudge, not a report:
 * a failure here must never block a page, so errors resolve to 0 silently.
 */

const REFRESH_MS = 60_000;

const EMPTY_COUNTS = { orders: 0, ideas: 0, tasks: 0, inventory: 0, reviews: 0 };

async function fetchCounts(memberId) {
  const today = new Date().toISOString().slice(0, 10);

  const [orders, ideas, tasks, spools, reviews] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase.from('ideas').select('id', { count: 'exact', head: true })
      .eq('status', 'inbox'),
    memberId
      ? supabase.from('tasks').select('id', { count: 'exact', head: true })
          .lt('due_date', today).neq('status', 'done')
          .contains('assignee_ids', JSON.stringify([memberId])) // jsonb, see MyDesk
      : Promise.resolve({ count: 0 }),
    supabase.from('filament_spools')
      .select('status, scale_reading_g, net_weight_g, spool_type'),
    supabase.from('reviews').select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ]);

  return {
    orders:    orders.count ?? 0,
    ideas:     ideas.count ?? 0,
    tasks:     tasks.count ?? 0,
    inventory: (spools.data ?? []).filter(isRunningLow).length,
    reviews:   reviews.count ?? 0,
  };
}

export function useAdminBadges() {
  const { member } = useCurrentMember();
  const memberId = member?.id ?? null;
  const [counts, setCounts] = useState(EMPTY_COUNTS);

  useEffect(() => {
    let alive = true;

    const load = () => {
      fetchCounts(memberId)
        .then((next) => { if (alive) setCounts(next); })
        .catch(() => { /* a stale or absent badge is better than a broken page */ });
    };

    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(id); };
  }, [memberId]);

  return counts;
}
