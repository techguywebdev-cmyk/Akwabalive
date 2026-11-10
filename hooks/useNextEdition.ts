'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { supabaseToGhanaEvent, type SupabaseEvent } from '@/lib/supabase/events';
import { events as staticEvents } from '@/lib/data/events';
import { seriesKey, seriesWords } from '@/lib/moments/series';
import { SERIES, eventInSeries, momentInSeries } from '@/lib/data/series';
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
  // Whole words only ("Turn Up" isn't "The Turnup"), and travel packages or after-parties that mention a show aren't editions of it
  const allWords = (title: string) => {
    const t = title.toLowerCase();
    if (/\b(tour|trip|package|itinerary)\b|^after\b|\bafter[- ]party\b/.test(t)) return false;
    return words.every((w) => new RegExp(`(^|[^a-z0-9])${w.replace(/[^a-z0-9]/g, '')}($|[^a-z0-9])`).test(t));
  };

  useEffect(() => {
    if (!key && !moment?.event_slug) {
      setNext(null);
      return;
    }
    if (cache.has(`${moment?.event_slug ?? ''}|${words.join(' ')}`)) {
      setNext(cache.get(`${moment?.event_slug ?? ''}|${words.join(' ')}`) ?? null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);

    (async () => {
      let found: GhanaEvent | null = null;
      try {
        const supabase = createClient();
        // A clip tied to an upcoming event (e.g. an act's set used to promote their own show) points there first
        if (moment?.event_slug) {
          const { data: own } = await supabase.from('events').select('*, ticket_tiers(*)').eq('slug', moment.event_slug).eq('status', 'published').gte('date', today).maybeSingle();
          if (own) found = supabaseToGhanaEvent(own as SupabaseEvent);
        }
        const { data } = found || !key ? { data: [] } : await supabase
          .from('events')
          .select('*, ticket_tiers(*)')
          .eq('status', 'published')
          .gte('date', today)
          .ilike('title', `%${key}%`)
          .order('date', { ascending: true })
          .limit(10);
        const hit = (data ?? []).find((e: { title: string }) => allWords(e.title));
        if (hit) found = supabaseToGhanaEvent(hit as SupabaseEvent);
        // Shows go by more than one name (Beyond Kontrol is the BYK Concert): try every name the show is known by
        const show = !found && moment ? SERIES.find((x) => momentInSeries(moment, x)) : null;
        if (show) {
          const { data: alt } = await supabase.from('events').select('*, ticket_tiers(*)').eq('status', 'published').gte('date', today)
            .or(show.keywords.map((k) => `title.ilike.%${k.replace(/[^a-z0-9 ]/gi, '').trim().replace(/\s+/g, '%')}%`).join(','))
            .order('date', { ascending: true }).limit(10);
          const a = (alt ?? []).find((e: { title: string; description?: string }) => eventInSeries({ title: e.title, description: e.description ?? '' }, show));
          if (a) found = supabaseToGhanaEvent(a as SupabaseEvent);
        }
      } catch {
        /* fall through to static */
      }
      if (!found && words.length) {
        found =
          staticEvents
            .filter((e) => e.date >= today && allWords(e.title))
            .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
      }
      cache.set(`${moment?.event_slug ?? ''}|${words.join(' ')}`, found);
      if (!cancelled) {
        setNext(found);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key, moment?.event_slug]); // eslint-disable-line react-hooks/exhaustive-deps

  return { next, loading };
}
