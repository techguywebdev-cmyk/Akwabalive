'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { supabaseToGhanaEvent, type SupabaseEvent } from '@/lib/supabase/events';
import { events as staticEvents } from '@/lib/data/events';
import { seriesKey, seriesWords } from '@/lib/moments/series';
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

  // Only the event's own name decides (not the clip title), and every word of it must match:
  // "Africa" alone used to pull in any event with "Africa" in its title
  const name = moment?.event_name || null;
  const words = seriesWords(name);
  const key = words.length && !/ live$/i.test(name ?? '') ? seriesKey(name) : null;
  const allWords = (title: string) => { const t = title.toLowerCase(); return words.every((w) => t.includes(w)); };

  useEffect(() => {
    if (!key) {
      setNext(null);
      return;
    }
    if (cache.has(words.join(' '))) {
      setNext(cache.get(words.join(' ')) ?? null);
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
          .limit(10);
        const hit = (data ?? []).find((e: { title: string }) => allWords(e.title));
        if (hit) found = supabaseToGhanaEvent(hit as SupabaseEvent);
      } catch {
        /* fall through to static */
      }
      if (!found) {
        found =
          staticEvents
            .filter((e) => e.date >= today && allWords(e.title))
            .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
      }
      cache.set(words.join(' '), found);
      if (!cancelled) {
        setNext(found);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return { next, loading };
}
