import { events as staticEvents } from '@/lib/data/events';
import { fetchPublishedEvents, supabaseToGhanaEvent } from '@/lib/supabase/events';
import type { GhanaEvent } from '@/lib/types';

/**
 * Every published event, one per slug: the database, plus built-in events that point at a real
 * source (the rest of the built-in list is demo data and would show up as fake past shows).
 */
export async function loadAllEvents(): Promise<GhanaEvent[]> {
  const bySlug = new Map<string, GhanaEvent>();
  try {
    const rows = await fetchPublishedEvents();
    for (const r of rows ?? []) { try { const e = supabaseToGhanaEvent(r); bySlug.set(e.slug, e); } catch { /* skip bad row */ } }
  } catch { /* static fallback */ }
  for (const e of staticEvents) if (e.sourceUrl && !bySlug.has(e.slug)) bySlug.set(e.slug, e);
  return Array.from(bySlug.values());
}
