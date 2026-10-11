'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { supabaseToGhanaEvent, type SupabaseEvent } from '@/lib/supabase/events';
import { events as staticEvents } from '@/lib/data/events';
import { seriesKey } from '@/lib/moments/series';
import type { GhanaEvent } from '@/lib/types';
import type { Moment } from '@/components/moments/types';

const cache = new Map<string, GhanaEvent | null>();

/**
 * The upcoming edition of the event a moment came from — what the ticket card sells.
 * Published Supabase events first (real tiers, so it can be bought), then static listings.
 */
export function useNextEdition(moment: Moment | null) {
  const [next, setNext] = useState<GhanaEvent | null>(null);
  const [loading, setLoading] = useState(false);

  const key = seriesKey(moment?.event_name || moment?.title);

  useEffect(() => {
    if (!key) {
      setNext(null);
      return;
    }
    if (cache.has(key)) {
      setNext(cache.get(key) ?? null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);

    (async () => {
      let found: GhanaEvent | null = null;
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('events')
          .select('*, ticket_tiers(*)')
          .eq('status', 'published')
          .gte('date', today)
          .ilike('title', `%${key}%`)
          .order('date', { ascending: true })
          .limit(1);
        if (data && data.length) found = supabaseToGhanaEvent(data[0] as SupabaseEvent);
      } catch {
        /* fall through to static */
      }
      if (!found) {
        found =
          staticEvents
            .filter((e) => e.date >= today && e.title.toLowerCase().includes(key))
            .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
      }
      cache.set(key, found);
      if (!cancelled) {
        setNext(found);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key]);

  return { next, loading };
}
