import type { Moment } from '@/components/moments/types';

/** Fields every Moments query on event pages selects */
export const MOMENT_FIELDS = 'id, title, event_name, event_slug, youtube_id, description, year, is_featured, view_count, channel_name, official, category, performers';

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

/** An event or series name boiled down to what makes it itself: "BHIM Festival 2026" → "bhim", "Tidal Rave Festival 2026" → "tidal rave" */
const NOISE = /\b(?:(?:19|20)\d{2}|\d+(?:st|nd|rd|th)|edition|the|festival|fest|concert|live|in|at|of|and|x|tour|ghana|accra|kumasi|tema|takoradi|tamale|cape coast|london|uk|usa|melbourne|sydney|australia|edition)\b/g;
export function seriesName(t: string | null | undefined): string {
  return (t ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(NOISE, ' ').replace(/\s+/g, ' ').trim();
}
/** Names too plain to tie two nights together on their own ("All White Party" isn't one series) */
const GENERIC = /^(?:(?:all )?(?:white|black|red|pink|neon|glow)(?: (?:party|affair|night))?|party|night|rave|brunch|after party|pool party|beach party|day party|hangout|jam|vibes|homecoming|experience|show|live show|turn up|turnup)$/;

/**
 * Videos for this event: its own first, then earlier editions of the same series (newest first).
 * Earlier editions only when the clip's event is the same series by name ("BHIM Festival" ↔ "BHIM Festival 2026",
 * "Rapperholic UK" ↔ "Rapperholic 2026"), never because a word happens to appear in a clip title.
 */
export function momentsForEvent(event: { slug: string; title: string }, all: Moment[]): Moment[] {
  const name = seriesName(event.title);
  const own = all.filter((m) => m.event_slug === event.slug);
  const sameSeries = (m: Moment) => {
    const n = seriesName(m.event_name);
    if (!n || !name || n.length < 4 || GENERIC.test(n) || GENERIC.test(name)) return false;
    return n === name || name.startsWith(`${n} `) || n.startsWith(`${name} `);
  };
  const series = all.filter((m) => m.event_slug !== event.slug && sameSeries(m));
  const byYear = (a: Moment, b: Moment) => (b.year ?? 0) - (a.year ?? 0);
  return [...own.sort(byYear), ...series.sort(byYear)];
}

export const ytThumb = (id: string, size: 'mq' | 'hq' = 'mq') => `https://i.ytimg.com/vi/${id}/${size}default.jpg`;
