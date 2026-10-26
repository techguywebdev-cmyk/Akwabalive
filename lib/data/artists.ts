import type { Artist, ArtistGenre, GhanaEvent } from '@/lib/types';

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
    slug: 'sarkodie', wiki: 'Sarkodie (rapper)',
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
    slug: 'shatta-wale', wiki: 'Shatta Wale',
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
    slug: 'black-sherif', wiki: 'Black Sherif',
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
    slug: 'stonebwoy', wiki: 'Stonebwoy',
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
    slug: 'king-promise', wiki: 'King Promise',
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
    slug: 'gyakie', wiki: 'Gyakie',
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
    slug: 'kidi', wiki: 'KiDi',
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
    slug: 'wendy-shay', wiki: 'Wendy Shay',
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
    slug: 'medikal', wiki: 'Medikal',
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
    slug: 'camidoh', wiki: 'Camidoh',
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
    slug: 'fameye', wiki: 'Fameye',
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
    slug: 'r2bees', wiki: 'R2Bees',
    name: 'R2Bees',
    image: p('1472099645785-5658abf4ff4e'),
    isMajor: true,
    priority: 12,
    keywords: ['r2bees', 'r2 bees'],
    instagram: 'r2bees',
    xHandle: 'R2Bees',
  },
  // Acts with shows on Akwaaba right now (Oct 2026)
  { id: 'kwabena-kwabena', slug: 'kwabena-kwabena', wiki: 'Kwabena Kwabena', name: 'Kwabena Kwabena', image: '', isMajor: true, priority: 13, keywords: ['kwabena kwabena'] },
  { id: 'fancy-gadam', slug: 'fancy-gadam', wiki: 'Fancy Gadam', name: 'Fancy Gadam', image: '', isMajor: true, priority: 14, keywords: ['fancy gadam', 'gadam nation', 'gadam concert'] },
  { id: 'kweku-smoke', slug: 'kweku-smoke', wiki: 'Kweku Smoke', name: 'Kweku Smoke', image: '', isMajor: true, priority: 15, keywords: ['kweku smoke'] },
  { id: 'essumann', slug: 'essumann', wiki: 'Essumann', name: 'Essumann', image: '', isMajor: true, priority: 16, keywords: ['essumann'] },
  // ── More acts that regularly headline or tour (Oct 2026) ──────────────
  ...([
    ['manifest', 'M.anifest', ['m.anifest', 'manifest gh'], 'M.anifest'],
    ['kuami-eugene', 'Kuami Eugene', ['kuami eugene'], 'Kuami Eugene'],
    ['kofi-kinaata', 'Kofi Kinaata', ['kofi kinaata', 'made in taadi'], 'Kofi Kinaata'],
    ['amerado', 'Amerado', ['amerado'], 'Amerado'],
    ['lasmid', 'Lasmid', ['lasmid'], 'Lasmid'],
    ['king-paluta', 'King Paluta', ['king paluta'], 'King Paluta'],
    ['kelvyn-boy', 'Kelvyn Boy', ['kelvyn boy', 'kelvynboy', 'kelvyn colt'], 'Kelvyn Boy'],
    ['kwesi-arthur', 'Kwesi Arthur', ['kwesi arthur'], 'Kwesi Arthur'],
    ['joey-b', 'Joey B', ['joey b'], 'Joey B'],
    ['darkovibes', 'Darkovibes', ['darkovibes', 'darko vibes'], 'Darkovibes'],
    ['kojo-antwi', 'Kojo Antwi', ['kojo antwi', 'music man kojo antwi'], 'Kojo Antwi'],
    ['amakye-dede', 'Amakye Dede', ['amakye dede'], 'Amakye Dede'],
    ['akwaboah', 'Akwaboah', ['akwaboah'], 'Akwaboah'],
    ['bisa-kdei', 'Bisa Kdei', ['bisa kdei', 'bisa k’dei', "bisa k'dei"], "Bisa K'dei"],
    ['samini', 'Samini', ['samini'], 'Samini'],
    ['obrafour', 'Obrafour', ['obrafour'], 'Obrafour'],
    ['okyeame-kwame', 'Okyeame Kwame', ['okyeame kwame'], 'Okyeame Kwame'],
    ['reggie-rockstone', 'Reggie Rockstone', ['reggie rockstone'], 'Reggie Rockstone'],
    ['edem', 'Edem', ['edem vrayo', 'vrayo'], 'Edem (rapper)'],
    ['efya', 'Efya', ['efya'], 'Efya'],
    ['becca', 'Becca', ['becca gh'], 'Becca (singer)'],
    ['adina', 'Adina Thembi', ['adina thembi'], 'Adina Thembi'],
    ['cina-soul', 'Cina Soul', ['cina soul'], 'Cina Soul'],
    ['amaarae', 'Amaarae', ['amaarae'], 'Amaarae'],
    ['moliy', 'Moliy', ['moliy'], 'Moliy'],
    ['sister-deborah', 'Sister Deborah', ['sister deborah'], 'Sister Deborah'],
    ['sista-afia', 'Sista Afia', ['sista afia'], 'Sista Afia'],
    ['mzvee', 'MzVee', ['mzvee', 'mz vee'], 'MzVee'],
    ['eno-barony', 'Eno Barony', ['eno barony'], 'Eno Barony'],
    ['strongman', 'Strongman', ['strongman burner'], 'Strongman (rapper)'],
    ['teephlow', 'Teephlow', ['teephlow'], 'Teephlow'],
    ['kofi-mole', 'Kofi Mole', ['kofi mole'], 'Kofi Mole'],
    ['kweku-flick', 'Kweku Flick', ['kweku flick'], 'Kweku Flick'],
    ['yaw-tog', 'Yaw Tog', ['yaw tog'], 'Yaw Tog'],
    ['oseikrom-sikanii', 'Oseikrom Sikanii', ['oseikrom sikanii'], 'Oseikrom Sikanii'],
    ['pappy-kojo', 'Pappy Kojo', ['pappy kojo'], 'Pappy Kojo'],
    ['mr-drew', 'Mr Drew', ['mr drew', 'mr. drew'], 'Mr Drew'],
    ['krymi', 'Krymi', ['krymi'], 'Krymi'],
    ['wiyaala', 'Wiyaala', ['wiyaala'], 'Wiyaala'],
    ['kojo-cue', 'Kojo Cue', ['kojo cue'], 'Kojo Cue'],
    ['article-wan', 'Article Wan', ['article wan'], 'Article Wan'],
    ['dj-switch', 'DJ Switch', ['dj switch'], 'DJ Switch (Ghanaian DJ)'],
    // Gospel — big concert draws
    ['diana-hamilton', 'Diana Hamilton', ['diana hamilton'], 'Diana Hamilton'],
    ['joe-mettle', 'Joe Mettle', ['joe mettle'], 'Joe Mettle'],
    ['piesie-esther', 'Piesie Esther', ['piesie esther'], 'Piesie Esther'],
    ['celestine-donkor', 'Celestine Donkor', ['celestine donkor'], 'Celestine Donkor'],
    ['nacee', 'Nacee', ['nacee'], 'Nacee'],
    ['mogmusic', 'MOGmusic', ['mogmusic', 'mog music'], 'MOGmusic'],
    ['mr-eazi', 'Mr Eazi', ['mr eazi', 'mr. eazi', 'mreazi'], 'Mr Eazi'],
  ] as const).map(([slug, name, keywords, wiki], i): Artist => ({
    id: slug, slug, name, wiki, image: '', isMajor: true, priority: 20 + i, keywords: [...keywords],
  })),
];

/** Main genre per artist (Artists page filters) */
const GENRE: Record<string, ArtistGenre> = {
  'sarkodie': 'Hip-hop',
  'black-sherif': 'Hip-hop',
  'medikal': 'Hip-hop',
  'r2bees': 'Hip-hop',
  'kweku-smoke': 'Hip-hop',
  'manifest': 'Hip-hop',
  'amerado': 'Hip-hop',
  'king-paluta': 'Hip-hop',
  'kwesi-arthur': 'Hip-hop',
  'joey-b': 'Hip-hop',
  'obrafour': 'Hip-hop',
  'okyeame-kwame': 'Hip-hop',
  'reggie-rockstone': 'Hip-hop',
  'edem': 'Hip-hop',
  'eno-barony': 'Hip-hop',
  'strongman': 'Hip-hop',
  'teephlow': 'Hip-hop',
  'kofi-mole': 'Hip-hop',
  'kweku-flick': 'Hip-hop',
  'yaw-tog': 'Hip-hop',
  'oseikrom-sikanii': 'Hip-hop',
  'pappy-kojo': 'Hip-hop',
  'kojo-cue': 'Hip-hop',
  'shatta-wale': 'Dancehall',
  'stonebwoy': 'Dancehall',
  'samini': 'Dancehall',
  'king-promise': 'Afrobeats',
  'gyakie': 'Afrobeats',
  'kidi': 'Afrobeats',
  'wendy-shay': 'Afrobeats',
  'camidoh': 'Afrobeats',
  'fameye': 'Afrobeats',
  'fancy-gadam': 'Afrobeats',
  'kuami-eugene': 'Afrobeats',
  'lasmid': 'Afrobeats',
  'kelvyn-boy': 'Afrobeats',
  'efya': 'Afrobeats',
  'becca': 'Afrobeats',
  'adina': 'Afrobeats',
  'sister-deborah': 'Afrobeats',
  'sista-afia': 'Afrobeats',
  'mzvee': 'Afrobeats',
  'mr-drew': 'Afrobeats',
  'krymi': 'Afrobeats',
  'wiyaala': 'Afrobeats',
  'article-wan': 'Afrobeats',
  'mr-eazi': 'Afrobeats',
  'kwabena-kwabena': 'Highlife',
  'essumann': 'Highlife',
  'kofi-kinaata': 'Highlife',
  'kojo-antwi': 'Highlife',
  'amakye-dede': 'Highlife',
  'akwaboah': 'Highlife',
  'bisa-kdei': 'Highlife',
  'darkovibes': 'Alté',
  'cina-soul': 'Alté',
  'amaarae': 'Alté',
  'moliy': 'Alté',
  'diana-hamilton': 'Gospel',
  'joe-mettle': 'Gospel',
  'piesie-esther': 'Gospel',
  'celestine-donkor': 'Gospel',
  'nacee': 'Gospel',
  'mogmusic': 'Gospel',
  'dj-switch': 'DJ',
};
for (const a of artists) a.genre = a.genre ?? GENRE[a.slug];

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
    // A billed name that is exactly the artist's name (works for short or common names too)
    const plain = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (event.lineup.some((n) => plain(n) === plain(artist.name))) return true;
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

/** Scan free text for known major artists (title, caption, flyer OCR). */
export function detectArtistsFromText(
  ...parts: Array<string | null | undefined>
): { artistSlugs: string[]; lineup: string[] } {
  const text = parts.filter(Boolean).join(' ').toLowerCase();
  if (!text.trim()) return { artistSlugs: [], lineup: [] };

  const found: Artist[] = [];
  for (const a of majorArtists) {
    const keywords = [...a.keywords].sort((x, y) => y.length - x.length);
    if (keywords.some((k) => keywordInText(k, text))) {
      found.push(a);
    }
  }
  return {
    artistSlugs: found.map((a) => a.slug),
    lineup: found.map((a) => a.name),
  };
}

/** The artist a line-up name refers to ("Sarkodie", "King Promise (live band)"), if we have a page for them */
export function artistForName(name: string): Artist | undefined {
  const n = name.toLowerCase();
  return artists.find((a) => a.name.toLowerCase() === n.trim())
    ?? artists.find((a) => [a.name, ...a.keywords].some((k) => keywordInText(k, n)));
}
