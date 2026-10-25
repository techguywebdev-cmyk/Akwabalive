import type { Moment } from '@/components/moments/types';

/** Fields every Moments query on event pages selects */
export const MOMENT_FIELDS = 'id, title, event_name, event_slug, youtube_id, description, year, is_featured, view_count, duration_label';

/**
 * The word that names an event series ("Afrochella 2025 Accra" → "afrochella"), so this
 * year's event finds last year's videos.
 */
export function seriesKey(title: string): string | null {
  return title
    .toLowerCase()
    .replace(/\b(20)?\d{2}\b/g, '')
    .replace(/\b(kumasi|accra|live|concert|festival|edition|the|melbourne|sydney|australia|ghana|tour|night)\b/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 3)[0] ?? null;
}

/** Videos for this event: its own first, then earlier editions of the same series; newest first */
export function momentsForEvent(event: { slug: string; title: string }, all: Moment[]): Moment[] {
  const key = seriesKey(event.title);
  const own = all.filter((m) => m.event_slug === event.slug);
  const series = key
    ? all.filter((m) => m.event_slug !== event.slug && [m.event_name, m.title, m.event_slug].some((s) => s?.toLowerCase().includes(key)))
    : [];
  const byYear = (a: Moment, b: Moment) => (b.year ?? 0) - (a.year ?? 0);
  return [...own.sort(byYear), ...series.sort(byYear)];
}

export const ytThumb = (id: string, size: 'mq' | 'hq' = 'mq') => `https://i.ytimg.com/vi/${id}/${size}default.jpg`;
