'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Moment } from '@/components/moments/types';

const PAGE_SIZE = 20;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shuffled, with videos from the artists' and events' own channels first; dead videos dropped */
function arrange(list: Moment[]): Moment[] {
  // One entry per video: the same clip is filed under several events, and it's only right for one
  const seen = new Set<string>();
  const ok = [...list].sort((a, b) => Number(!!b.official) - Number(!!a.official))
    .filter((m) => m.available !== false && !seen.has(m.youtube_id) && seen.add(m.youtube_id));
  return [...shuffle(ok.filter((m) => m.official)), ...shuffle(ok.filter((m) => !m.official))];
}

export function useMoments(initialMomentId?: string | null) {
  const supabase = createClient();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('moments')
      .select('*')
      .eq('status', 'live')
      .order('is_featured', { ascending: false })
      .order('year', { ascending: false })
      .range(0, PAGE_SIZE - 1);

    if (!error && data) {
      let list = data as Moment[];

      if (initialMomentId) {
        const idx = list.findIndex((m) => m.id === initialMomentId);
        if (idx >= 0) {
          list = list.filter((m) => m.available !== false || m.id === initialMomentId);
          setMoments(list);
          setActiveIdx(list.findIndex((m) => m.id === initialMomentId));
        } else {
          const { data: one } = await supabase
            .from('moments')
            .select('*')
            .eq('id', initialMomentId)
            .maybeSingle();
          if (one) {
            list = [one as Moment, ...list.filter((m) => m.id !== one.id)];
            setMoments(list);
            setActiveIdx(0);
          } else {
            setMoments(arrange(list));
            setActiveIdx(0);
          }
        }
      } else {
        // Random order each visit so the feed feels fresh (official videos first)
        setMoments(arrange(list));
        setActiveIdx(0);
      }
      setHasMore(list.length === PAGE_SIZE);
    }
    setLoading(false);
  }, [supabase, initialMomentId]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const from = moments.length;
    const { data } = await supabase
      .from('moments')
      .select('*')
      .eq('status', 'live')
      .order('is_featured', { ascending: false })
      .order('year', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (data && data.length) {
      setMoments((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const vids = new Set(prev.map((m) => m.youtube_id));
        const next = arrange((data as Moment[]).filter((m) => !ids.has(m.id) && !vids.has(m.youtube_id)));
        return [...prev, ...next];
      });
      setHasMore(data.length === PAGE_SIZE);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  }, [supabase, moments.length, hasMore, loadingMore]);

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
