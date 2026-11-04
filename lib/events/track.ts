'use client';

import { createClient } from '@/lib/supabase/client';

/** A random id for this browser, so each person counts once per event per day */
function viewerId(): string | null {
  try {
    let id = localStorage.getItem('akw_viewer');
    if (!id) { id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`; localStorage.setItem('akw_viewer', id); }
    return id;
  } catch { return null; }
}

const sent = new Set<string>();

/** Count an event page view or a feed/Hot-rail impression (once per visit; the database keeps one per day) */
export function trackEvent(slug: string, kind: 'view' | 'impression') {
  if (typeof window === 'undefined' || !slug) return;
  const key = `${kind}:${slug}`;
  if (sent.has(key)) return;
  sent.add(key);
  const viewer = viewerId();
  if (!viewer) return;
  createClient().rpc('track_event', { p_slug: slug, p_viewer: viewer, p_kind: kind }).then(() => {}, () => {});
}

export type EventCounts = { views7d: number; viewsTotal: number; seen7d: number; going: number };
const cache = new Map<string, EventCounts>();

export async function eventCounts(slugs: string[]): Promise<Record<string, EventCounts>> {
  const missing = slugs.filter((s) => !cache.has(s));
  if (missing.length) {
    const { data } = await createClient().rpc('event_counts', { p_slugs: missing });
    (data ?? []).forEach((r: { event_slug: string; views_7d: number; views_total: number; seen_7d: number; going: number }) =>
      cache.set(r.event_slug, { views7d: Number(r.views_7d), viewsTotal: Number(r.views_total), seen7d: Number(r.seen_7d), going: Number(r.going) }));
  }
  return Object.fromEntries(slugs.map((s) => [s, cache.get(s) ?? { views7d: 0, viewsTotal: 0, seen7d: 0, going: 0 }]));
}

/** "1.2k" */
export const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k` : String(n));
