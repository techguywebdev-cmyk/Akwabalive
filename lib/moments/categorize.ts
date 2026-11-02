import { EVENT_TOPICS } from '@/lib/data/festivals';

export type MomentCategory = 'concert' | 'show' | 'awards' | 'culture';

export const CATEGORIES: { key: MomentCategory; label: string }[] = [
  { key: 'concert', label: 'Concerts' },
  { key: 'show', label: 'Shows' },
  { key: 'awards', label: 'Awards' },
  { key: 'culture', label: 'Culture' },
];

const AWARDS = /\b(awards?|vgma|tgma|3music awards|headies|bet awards?|grammys?)\b/i;
const CULTURE = /\b(festival of|durbar|chiefs?|otumfuo|asantehene|manhyia|procession|homowo|aboakyer|hogbetsotso|odwira|afahye|kundum|bakatue|akwasidae|dipo|ngmayem|asafotufiam|apoo|damba|bugum|edina bronya|panafest|chale wote|afestacc|emancipation|heritage|exhibition|carnival|tradition\w*)\b/i;
const SHOW = /\b(rave|party|parties|beach|block party|day party|all white|festival|fest|night)\b/i;

/**
 * Concerts: an artist's own show or set. Shows: multi-act raves, parties and music festivals.
 * Awards: award nights. Culture: traditional festivals, art and heritage.
 */
export function categorize(m: { title?: string | null; event_name?: string | null; found_by?: string | null }): MomentCategory {
  const text = `${m.event_name ?? ''} ${m.title ?? ''}`.toLowerCase();
  // A known event decides it
  const topic = EVENT_TOPICS.find((t) => (m.found_by === `search:${t.slug}`) || t.keywords.some((k) => text.includes(k)));
  if (topic) return topic.kind === 'festival' ? 'culture' : topic.kind;
  if (AWARDS.test(text)) return 'awards';
  if (CULTURE.test(text)) return 'culture';
  if (m.found_by?.startsWith('youtube:')) return SHOW.test(text) ? 'show' : 'concert';
  if (SHOW.test(text)) return 'show';
  return 'concert';
}
