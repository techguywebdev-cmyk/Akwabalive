'use client';

import { useEffect, useLayoutEffect, useState } from 'react';

// Before paint in the browser, so a loaded answer shows on the first frame (no reminder card flashing first)
const useBeforePaint = typeof window === 'undefined' ? useEffect : useLayoutEffect;
import { createClient } from '@/lib/supabase/client';
import { supabaseToGhanaEvent, type SupabaseEvent } from '@/lib/supabase/events';
import { events as staticEvents } from '@/lib/data/events';
import { seriesKey, seriesWords } from '@/lib/moments/series';
import { SERIES, eventInSeries, momentInSeries } from '@/lib/data/series';
import type { GhanaEvent } from '@/lib/types';
import type { Moment } from '@/components/moments/types';

const cache = new Map<string, GhanaEvent | null>();

type Row = SupabaseEvent & { title: string; slug: string; description?: string | null; date: string };
// Every upcoming published event, loaded once per visit (a couple of hundred rows) and shared by every clip,
// so each clip finds its next edition straight away instead of waiting on its own queries
let upcoming: Promise<Row[]> | null = null;
let upcomingRows: Row[] | null = null;
function loadUpcoming(): Promise<Row[]> {
  if (!upcoming) {
    const today = new Date().toISOString().slice(0, 10);
    upcoming = Promise.resolve(createClient().from('events').select('*, ticket_tiers(*)').eq('status', 'published').gte('date', today).order('date', { ascending: true }).limit(1000))
      .then(({ data }) => (upcomingRows = (data ?? []) as Row[]))
      .catch(() => { upcoming = null; return [] as Row[]; });
  }
  return upcoming;
}
/** Start loading early (the Moments feed calls this when it opens) */
export function prefetchUpcoming() { loadUpcoming(); }


/**
 * The upcoming edition of the event a moment came from — what the ticket card sells.
 * Published Supabase events first (real tiers, so it can be bought), then static listings.
 */
export function useNextEdition(moment: Moment | null) {
  const [next, setNext] = useState<GhanaEvent | null>(null);
  const [loading, setLoading] = useState(() => !!moment && !upcomingRows);

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

  useBeforePaint(() => {
    if (!key && !moment?.event_slug) {
      setNext(null);
      setLoading(false);
      return;
    }
    if (cache.has(`${moment?.event_slug ?? ''}|${words.join(' ')}`)) {
      setNext(cache.get(`${moment?.event_slug ?? ''}|${words.join(' ')}`) ?? null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const ck = `${moment?.event_slug ?? ''}|${words.join(' ')}`;
    const today = new Date().toISOString().slice(0, 10);
    const pick = (rows: Row[]): GhanaEvent | null => {
      let found: GhanaEvent | null = null;
      // A clip tied to an upcoming event (e.g. an act's set used to promote their own show) points there first
      const own = moment?.event_slug ? rows.find((e) => e.slug === moment.event_slug) : undefined;
      if (own) found = supabaseToGhanaEvent(own);
      if (!found && key) {
        const hit = rows.find((e) => e.title.toLowerCase().includes(key) && allWords(e.title));
        if (hit) found = supabaseToGhanaEvent(hit);
      }
      // Shows go by more than one name (Beyond Kontrol is the BYK Concert): try every name the show is known by
      const show = !found && moment ? SERIES.find((x) => momentInSeries(moment, x)) : null;
      if (show) {
        const a = rows.find((e) => eventInSeries({ title: e.title, description: e.description ?? '' }, show));
        if (a) found = supabaseToGhanaEvent(a);
      }
      if (!found && words.length) {
        found = staticEvents.filter((e) => e.date >= today && allWords(e.title)).sort((x, y) => x.date.localeCompare(y.date))[0] ?? null;
      }
      cache.set(ck, found);
      return found;
    };

    // Already loaded: answer in the same render pass, no waiting
    if (upcomingRows) {
      setNext(pick(upcomingRows));
      setLoading(false);
      return;
    }
    setLoading(true);
    loadUpcoming().then((rows) => {
      if (cancelled) return;
      setNext(pick(rows));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [key, moment?.event_slug]); // eslint-disable-line react-hooks/exhaustive-deps

  return { next, loading };
}
