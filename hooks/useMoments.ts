'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Moment } from '@/components/moments/types';

const PAGE_SIZE = 60;
const DAY = 86400000;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const time = (m: Moment) => (m.published_at ? new Date(m.published_at).getTime() : null);

/** Posted in the last two weeks: it leads the feed with a "Just happened" badge */
export const justHappened = (m: Moment) => (m._clips ?? [m]).some((c) => { const t = time(c); return t != null && Date.now() - t < 14 * DAY; });

/**
 * One card per night: clips with the same event and year, posted close together, belong to the same night.
 * Named events allow three weeks between uploads; "<Artist> Live" catch-alls only three days.
 */
function groupNights(list: Moment[]): Moment[] {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const groups: Moment[][] = [];
  const byKey = new Map<string, Moment[][]>();
  const sorted = [...list].sort((a, b) => (time(a) ?? 0) - (time(b) ?? 0));
  for (const m of sorted) {
    const key = `${norm(m.event_name)}|${m.year ?? ''}`;
    const window = / live$/i.test(m.event_name) ? 3 * DAY : 21 * DAY;
    const candidates = byKey.get(key) ?? [];
    const t = time(m);
    const g = candidates.find((g) => g.length < 10 && g.some((x) => { const tx = time(x); return t == null || tx == null || Math.abs(t - tx) <= window; }));
    if (g) g.push(m);
    else { const ng = [m]; candidates.push(ng); byKey.set(key, candidates); groups.push(ng); }
  }
  return groups.map((g) => {
    // Lead with an official clip, then the earliest posted (usually the opening or the full set)
    const clips = [...g].sort((a, b) => Number(!!b.official) - Number(!!a.official) || (time(a) ?? 0) - (time(b) ?? 0));
    return { ...clips[0], _clips: clips };
  });
}

/** One entry per video, one card per night, shuffled: just-happened nights first, then official, then the rest */
function arrange(list: Moment[]): Moment[] {
  // One entry per video: the same clip is filed under several events, and it's only right for one
  const seen = new Set<string>();
  const ok = [...list].sort((a, b) => Number(!!b.official) - Number(!!a.official))
    .filter((m) => m.available !== false && !seen.has(m.youtube_id) && seen.add(m.youtube_id));
  const nights = groupNights(ok);
  const fresh = nights.filter(justHappened).sort((a, b) => Math.max(...(b._clips ?? [b]).map((c) => time(c) ?? 0)) - Math.max(...(a._clips ?? [a]).map((c) => time(c) ?? 0)));
  const rest = nights.filter((n) => !justHappened(n));
  return [...fresh, ...shuffle(rest.filter((m) => m.official)), ...shuffle(rest.filter((m) => !m.official))];
}

/** Put the clip someone opened at the front of its night, and that night first */
function leadWith(list: Moment[], id: string): Moment[] {
  const i = list.findIndex((n) => (n._clips ?? [n]).some((c) => c.id === id));
  if (i < 0) return list;
  const night = list[i];
  const clips = night._clips ?? [night];
  const first = clips.find((c) => c.id === id)!;
  const lead = { ...first, _clips: [first, ...clips.filter((c) => c.id !== id)] };
  return [lead, ...list.slice(0, i), ...list.slice(i + 1)];
}

export function useMoments(initialMomentId?: string | null, category?: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const fetched = useRef(0); // rows read from the database so far (cards hold several)

  const query = useCallback((from: number) => supabase
    .from('moments')
    .select('*')
    .eq('status', 'live')
    .match(category ? { category } : {})
    .order('is_featured', { ascending: false })
    .order('published_at', { ascending: false, nullsFirst: false })
    .range(from, from + PAGE_SIZE - 1), [supabase, category]);

  const loadInitial = useCallback(async () => {
    const { data, error } = await query(0);
    if (!error && data) {
      let rows = data as Moment[];
      fetched.current = rows.length;
      const wanted = initialMomentId && !category ? initialMomentId : null;
      if (wanted && !rows.some((m) => m.id === wanted)) {
        const { data: one } = await supabase.from('moments').select('*').eq('id', wanted).maybeSingle();
        if (one) rows = [one as Moment, ...rows];
      }
      // Random order each visit so the feed feels fresh
      const list = arrange(rows);
      setMoments(wanted ? leadWith(list, wanted) : list);
      setActiveIdx(0);
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoading(false);
  }, [supabase, query, initialMomentId, category]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    if (!hasMore) {
      // Never run dry: when everything has been shown, start another lap, reshuffled
      setMoments((prev) => {
        const base = prev.filter((m) => !m._k).flatMap((m) => m._clips ?? [m]);
        if (base.length < 2) return prev;
        const lap = Math.round(prev.length / Math.max(1, prev.filter((m) => !m._k).length));
        let next = arrange(base);
        const last = prev[prev.length - 1];
        if (next.length > 1 && next[0]?.youtube_id === last?.youtube_id) next = [...next.slice(1), next[0]];
        return [...prev, ...next.map((m) => ({ ...m, _k: `${m.id}~${lap}` }))];
      });
      return;
    }
    setLoadingMore(true);
    const { data } = await query(fetched.current);
    if (data && data.length) {
      fetched.current += data.length;
      setMoments((prev) => {
        const vids = new Set(prev.flatMap((m) => (m._clips ?? [m]).map((c) => c.youtube_id)));
        return [...prev, ...arrange((data as Moment[]).filter((m) => !vids.has(m.youtube_id)))];
      });
      setHasMore(data.length === PAGE_SIZE);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  }, [query, hasMore, loadingMore]);

  const goNext = useCallback(() => {
    setActiveIdx((i) => {
      const next = Math.min(i + 1, moments.length - 1);
      if (next >= moments.length - 3) loadMore();
      return next;
    });
  }, [moments.length, loadMore]);

  const goPrev = useCallback(() => {
    setActiveIdx((i) => Math.max(i - 1, 0));
  }, []);

  const jumpTo = useCallback(
    (idx: number) => {
      setActiveIdx(Math.max(0, Math.min(idx, moments.length - 1)));
    },
    [moments.length],
  );

  return {
    moments,
    activeIdx,
    setActiveIdx: jumpTo,
    moment: moments[activeIdx] ?? null,
    loading,
    hasMore,
    loadingMore,
    goNext,
    goPrev,
    loadMore,
    total: moments.length,
  };
}
