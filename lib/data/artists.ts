import type { Artist, GhanaEvent } from '@/lib/types';

/** Placeholder portraits — replace with official press photos in production. */
const p = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=240&h=240&q=80&auto=format&fit=crop&crop=faces`;

/**
 * Curated major Ghanaian acts that typically announce stadium /
 * arena / diaspora shows (esp. Q4 and overseas tours).
 * `keywords` match event title, badge, description, and lineup names.
 * Prefer longer, distinctive phrases; short tokens use word-boundary matching.
 */
export const artists: Artist[] = [
  {
    id: 'sarkodie',
    slug: 'sarkodie',
    name: 'Sarkodie',
    image: p('1507003211169-0a1dd7228f2d'),
    isMajor: true,
    priority: 1,
    keywords: ['sarkodie', 'rapholic'],
    instagram: 'sarkodie',
    xHandle: 'sarkodie',
  },
  {
    id: 'shatta-wale',
    slug: 'shatta-wale',
    name: 'Shatta Wale',
    image: p('1500648767791-00dcc994a43e'),
    isMajor: true,
    priority: 2,
    keywords: ['shatta wale', 'shattafest', 'shatta music', 'shattawale'],
    instagram: 'shattawaleofficial',
    xHandle: 'shattawalegh',
  },
  {
    id: 'black-sherif',
    slug: 'black-sherif',
    name: 'Black Sherif',
    image: p('1539571696357-a9f1b92b3b51'),
    isMajor: true,
    priority: 3,
    keywords: ['black sherif', 'black sheriff', 'blacko'],
    instagram: 'blacksherif_',
    xHandle: 'BlackSherif_',
  },
  {
    id: 'stonebwoy',
    slug: 'stonebwoy',
    name: 'Stonebwoy',
    image: p('1529626455594-4ff0802cfb7e'),
    isMajor: true,
    priority: 4,
    keywords: ['stonebwoy', 'stone bwoy'],
    instagram: 'stonebwoy',
    xHandle: 'stonebwoy',
  },
  {
    id: 'king-promise',
    slug: 'king-promise',
    name: 'King Promise',
    image: p('1494790108377-be9c29b29330'),
    isMajor: true,
    priority: 5,
    keywords: ['king promise', 'kingpromise'],
    instagram: 'kingpromise',
    xHandle: 'KingPromiseLive',
  },
  {
    id: 'gyakie',
    slug: 'gyakie',
    name: 'Gyakie',
    image: p('1544005313-94ddf0286df2'),
    isMajor: true,
    priority: 6,
    keywords: ['gyakie'],
    instagram: 'gyakie_',
    xHandle: 'gyakie_',
  },
  {
    id: 'kidi',
    slug: 'kidi',
    name: 'KiDi',
    image: p('1506794778202-cad84cf45f1d'),
    isMajor: true,
    priority: 7,
    keywords: ['kidi'],
    instagram: 'officialkidi',
    xHandle: 'OfficialKiDi',
  },
  {
    id: 'wendy-shay',
    slug: 'wendy-shay',
    name: 'Wendy Shay',
    image: p('1534528741775-53994a69daeb'),
    isMajor: true,
    priority: 8,
    keywords: ['wendy shay', 'wendyshay'],
    instagram: 'wendy_shay',
    xHandle: 'Wendy_Shay',
  },
  {
    id: 'medikal',
    slug: 'medikal',
    name: 'Medikal',
    image: p('1519085360753-af0119f7cbe7'),
    isMajor: true,
    priority: 9,
    keywords: ['medikal'],
    instagram: 'medikal',
    xHandle: 'medikal',
  },
  {
    id: 'camidoh',
    slug: 'camidoh',
    name: 'Camidoh',
    image: p('1488426862026-3ee34a7d66df'),
    isMajor: true,
    priority: 10,
    keywords: ['camidoh'],
    instagram: 'camidoh',
    xHandle: 'camidoh',
  },
  {
    id: 'fameye',
    slug: 'fameye',
    name: 'Fameye',
    image: p('1463453091185-61582044d556'),
    isMajor: true,
    priority: 11,
    keywords: ['fameye'],
    instagram: 'fameye',
    xHandle: 'Fameye1',
  },
  {
    id: 'r2bees',
    slug: 'r2bees',
    name: 'R2Bees',
    image: p('1472099645785-5658abf4ff4e'),
    isMajor: true,
    priority: 12,
    keywords: ['r2bees', 'r2 bees'],
    instagram: 'r2bees',
    xHandle: 'R2Bees',
  },
];

export const majorArtists = artists
  .filter((a) => a.isMajor)
  .sort((a, b) => a.priority - b.priority);

export function getArtistBySlug(slug: string): Artist | undefined {
  return artists.find((a) => a.slug === slug);
}

/** Escape regex special chars; treat spaces as flexible whitespace. */
function escapeKeyword(k: string): string {
  return k
    .trim()
    .toLowerCase()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
}

/**
 * Whole-token match so short names do not substring-match unrelated words.
 * Allows punctuation/edges around the keyword.
 */
function keywordInText(keyword: string, text: string): boolean {
  const k = keyword.trim().toLowerCase();
  if (!k || k.length < 3) return false;
  const escaped = escapeKeyword(k);
  const re = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i');
  return re.test(text);
}

type MatchableEvent = Pick<
  GhanaEvent,
  'title' | 'badge' | 'description' | 'lineup' | 'artistSlugs'
>;

/**
 * Accurate artist ↔ event match.
 *
 * Priority:
 * 1. Explicit `artistSlugs` (most accurate — billed acts, co-bills, festivals)
 * 2. `lineup` names vs artist keywords (word-boundary)
 * 3. title + badge + description text (word-boundary)
 */
export function eventMatchesArtist(
  event: MatchableEvent,
  artist: Artist,
): boolean {
  // 1) Explicit slug link — highest confidence
  if (event.artistSlugs?.length) {
    if (event.artistSlugs.includes(artist.slug)) return true;
  }

  // Prefer longer keywords first (fewer false positives)
  const keywords = [...artist.keywords].sort((a, b) => b.length - a.length);

  // 2) Lineup names (e.g. festival bill)
  if (event.lineup?.length) {
    const lineupText = event.lineup.join(' · ').toLowerCase();
    if (keywords.some((k) => keywordInText(k, lineupText))) return true;
  }

  // 3) Title / badge / description
  const hay = [event.title, event.badge, event.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return keywords.some((k) => keywordInText(k, hay));
}

/** All major artists billed on an event (slug + text match). */
export function artistsForEvent(event: MatchableEvent): Artist[] {
  return majorArtists.filter((a) => eventMatchesArtist(event, a));
}
