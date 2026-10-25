import type { GhanaEvent } from '@/lib/types';

/**
 * Long listing titles ("Sarkodie — First Time in Australia (Sydney)") read badly at
 * display size. Split them into a short title and a subtitle line.
 */
export function splitEventTitle(raw: string): { title: string; subtitle: string } {
  let title = raw.trim();
  const extra: string[] = [];

  // Trailing "(Sydney)" → subtitle
  const paren = title.match(/^(.*\S)\s*\(([^)]+)\)\s*$/);
  if (paren) { title = paren[1]; extra.push(paren[2]); }

  // "Main — rest", "Main - rest", "Main: rest", "Main | rest"
  const sep = title.match(/^(.{3,}?)\s+(?:—|–|-|\|)\s+(.+)$/) || title.match(/^(.{3,}?):\s+(.+)$/);
  if (sep) { title = sep[1]; extra.unshift(sep[2]); }

  return { title, subtitle: extra.join(' · ') };
}

const CATEGORY_WORD: Record<string, string> = {
  concert: 'Live concert', festival: 'Festival', nightlife: 'Night out', food: 'Food & drink',
  culture: 'Culture', sports: 'Sport', tech: 'Tech event', art: 'Art', fashion: 'Fashion', wellness: 'Wellness',
};

/**
 * One or two lines about the event: the organiser's own description when there is one,
 * otherwise a plain factual line built from the listing (never invented details).
 */
export function eventBlurb(e: Pick<GhanaEvent, 'description' | 'category' | 'lineup' | 'venue'>, max = 160): string {
  const d = (e.description || '').replace(/\s+/g, ' ').trim();
  if (d) return d.length > max ? `${d.slice(0, max).replace(/\s+\S*$/, '')}…` : d;
  const what = CATEGORY_WORD[e.category] ?? 'Event';
  const who = e.lineup?.length ? ` with ${e.lineup.slice(0, 3).join(', ')}${e.lineup.length > 3 ? ' and more' : ''}` : '';
  return `${what}${who} at ${e.venue}.`;
}
