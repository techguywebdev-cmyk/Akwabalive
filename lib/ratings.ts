'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type RatingSummary = {
  event_slug: string; ratings: number; overall: number;
  performance: number | null; sound: number | null; organisation: number | null; vibe: number | null; value: number | null;
  dist: number[]; // 5★ → 1★
};

export const ASPECTS = [
  { key: 'performance', label: 'Performance' },
  { key: 'sound', label: 'Sound' },
  { key: 'organisation', label: 'Organisation' },
  { key: 'vibe', label: 'Vibe' },
  { key: 'value', label: 'Value' },
] as const;
export type AspectKey = (typeof ASPECTS)[number]['key'];

/** Rating averages for a set of events, keyed by slug (only events that have ratings) */
export function useRatingSummaries(slugs: string[]): Record<string, RatingSummary> {
  const supabase = useMemo(() => createClient(), []);
  const key = slugs.slice().sort().join('|');
  const [map, setMap] = useState<Record<string, RatingSummary>>({});
  useEffect(() => {
    if (!key) return;
    supabase.rpc('event_rating_summaries', { p_slugs: key.split('|') }).then(({ data }) => {
      const out: Record<string, RatingSummary> = {};
      for (const r of (data ?? []) as RatingSummary[]) out[r.event_slug] = { ...r, overall: Number(r.overall) };
      setMap(out);
    });
  }, [supabase, key]);
  return map;
}

export const fmtScore = (n: number | null | undefined) => (n == null ? '–' : Number(n).toFixed(1));
