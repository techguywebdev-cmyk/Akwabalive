import type { Category, GhanaEvent } from '@/lib/types';

/**
 * What an event is, by its own words as well as its saved category: "Aye Festival" is a festival even if it was
 * saved as culture, and a brunch party is food and nightlife. Filters match any of these.
 */
const WORDS: [Category, RegExp][] = [
  ['festival', /\b(festival|fest|carnival|homowo|durbar)\b/i],
  ['concert', /\b(concert|live in|live at|unplugged|in concert|album launch|live band|x'?perience)\b|\blive\b(?! (?:stream|sports))/i],
  ['nightlife', /\b(party|rave|club|nightlife|dj|afterparty|all black|all white|pool party|hangout|turn ?up|nye|new year'?s eve|night in)\b/i],
  ['food', /\b(food|brunch|dinner|jollof|coffee|tasting|wine|cocktail|bbq|barbecue|chops|grill)\b/i],
  ['culture', /\b(culture|cultural|heritage|festival of|durbar|theatre|theater|comedy|poetry|cinema|film|museum|tour)\b/i],
  ['art', /\b(art|exhibition|gallery|painting|pottery|ceramic|batik|weaving|kente|photography)\b/i],
  ['fashion', /\b(fashion|runway|model contest|couture|style)\b/i],
  ['sports', /\b(football|match|league|boxing|tournament|cup|race|marathon|walk-?a-?thon|sports?|games)\b/i],
  ['wellness', /\b(yoga|wellness|fitness|retreat|meditation|pilates|run club|walk)\b/i],
  ['tech', /\b(tech|hackathon|startup|ai|developer|coding|digital|creators?)\b/i],
  ['business', /\b(conference|forum|summit|expo|exhibition|trade fair|fair|networking|agm|investment|business|economic|property|empowerment|masterclass|workshop)\b/i],
  ['faith', /\b(church|gospel|worship|praise|prayer|crusade|revival|choir|chorus|apostolic|thanksgiving|jesus|christ|ministry|nsppd)\b/i],
];

export function eventCategories(e: Pick<GhanaEvent, 'title' | 'category'> & { highlight?: string | null }): Set<Category> {
  const text = `${e.title} ${e.highlight ?? ''}`;
  const out = new Set<Category>([e.category]);
  for (const [c, re] of WORDS) if (re.test(text)) out.add(c);
  return out;
}

export const inCategory = (e: Pick<GhanaEvent, 'title' | 'category'> & { highlight?: string | null }, c: Category) => eventCategories(e).has(c);
