import type { Moment } from '@/components/moments/types';
import type { Artist, GhanaEvent } from '@/lib/types';
import { eventMatchesArtist } from '@/lib/data/artists';

function escapeKeyword(k: string): string {
  return k
    .trim()
    .toLowerCase()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
}

function keywordInText(keyword: string, text: string): boolean {
  const k = keyword.trim().toLowerCase();
  if (!k || k.length < 3) return false;
  const re = new RegExp(`(?:^|[^a-z0-9])${escapeKeyword(k)}(?:$|[^a-z0-9])`, 'i');
  return re.test(text);
}

/** Moment belongs to artist via linked event or title/event_name text. */
export function momentMatchesArtist(
  moment: Pick<Moment, 'title' | 'event_name' | 'event_slug' | 'description'>,
  artist: Artist,
  events: GhanaEvent[] = [],
): boolean {
  if (moment.event_slug) {
    const ev = events.find((e) => e.slug === moment.event_slug);
    if (ev && eventMatchesArtist(ev, artist)) return true;
  }

  const hay = [moment.title, moment.event_name, moment.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const keywords = [...artist.keywords].sort((a, b) => b.length - a.length);
  return keywords.some((k) => keywordInText(k, hay));
}

export function momentsForArtist(
  moments: Moment[],
  artist: Artist,
  events: GhanaEvent[] = [],
): Moment[] {
  return moments.filter((m) => momentMatchesArtist(m, artist, events));
}
