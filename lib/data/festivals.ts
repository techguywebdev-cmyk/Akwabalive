/**
 * Festivals, cultural events and big shows to look for on YouTube (beyond artists' own channels).
 * `keywords` must appear in a video title for it to count; the first is the main search term.
 */
export type EventTopic = { slug: string; name: string; keywords: string[]; kind: 'festival' | 'show' | 'concert' | 'awards' };

export const EVENT_TOPICS: EventTopic[] = [
  // Big shows (many acts) and artists' own concerts
  { slug: 'detty-rave', name: 'Detty Rave', keywords: ['detty rave'], kind: 'show' },
  { slug: 'tidal-rave', name: 'Tidal Rave', keywords: ['tidal rave'], kind: 'show' },
  { slug: 'afro-future', name: 'AfroFuture', keywords: ['afrofuture', 'afro future', 'afrochella'], kind: 'show' },
  { slug: 'rapperholic', name: 'Rapperholic', keywords: ['rapperholic'], kind: 'concert' },
  { slug: 'bhim-concert', name: 'BHIM Festival', keywords: ['bhim festival', 'bhim concert', 'bhimfest', 'bhim fest'], kind: 'concert' },
  { slug: 'shatta-fest', name: 'Shatta Fest', keywords: ['shatta fest', 'shattafest'], kind: 'concert' },
  { slug: 'made-in-taadi', name: 'Made in Taadi', keywords: ['made in taadi'], kind: 'concert' },
  { slug: 'promiseland', name: 'PromiseLand', keywords: ['promiseland', 'promise land festival'], kind: 'concert' },
  { slug: 'gadam-nation', name: 'Gadam Nation Concert', keywords: ['gadam nation'], kind: 'concert' },
  { slug: 'kweku-smoke-revival', name: 'Revival Concert', keywords: ['revival concert', 'smoke revival'], kind: 'concert' },
  { slug: 'decemba-2-rememba', name: 'Decemba 2 Rememba', keywords: ['decemba 2 rememba', 'december to remember'], kind: 'show' },
  { slug: 'kwahu-easter', name: 'Kwahu Easter', keywords: ['kwahu easter', 'kwahu paragliding'], kind: 'festival' },
  // Awards
  { slug: 'tgma', name: 'Ghana Music Awards', keywords: ['ghana music awards', 'tgma', 'vgma'], kind: 'awards' },
  { slug: '3music-awards', name: '3Music Awards', keywords: ['3music awards'], kind: 'awards' },
  // Culture and tradition
  { slug: 'chale-wote', name: 'Chale Wote Street Art Festival', keywords: ['chale wote'], kind: 'festival' },
  { slug: 'panafest', name: 'PANAFEST', keywords: ['panafest'], kind: 'festival' },
  { slug: 'homowo', name: 'Homowo Festival', keywords: ['homowo'], kind: 'festival' },
  { slug: 'aboakyer', name: 'Aboakyer Festival', keywords: ['aboakyer'], kind: 'festival' },
  { slug: 'hogbetsotso', name: 'Hogbetsotso Festival', keywords: ['hogbetsotso'], kind: 'festival' },
  { slug: 'odwira', name: 'Odwira Festival', keywords: ['odwira'], kind: 'festival' },
  { slug: 'fetu-afahye', name: 'Fetu Afahye', keywords: ['fetu afahye', 'fetu festival'], kind: 'festival' },
  { slug: 'kundum', name: 'Kundum Festival', keywords: ['kundum'], kind: 'festival' },
  { slug: 'bakatue', name: 'Bakatue Festival', keywords: ['bakatue'], kind: 'festival' },
  { slug: 'akwasidae', name: 'Akwasidae Festival', keywords: ['akwasidae', 'akwasidaekese'], kind: 'festival' },
  { slug: 'dipo', name: 'Dipo Festival', keywords: ['dipo'], kind: 'festival' },
  { slug: 'ngmayem', name: 'Ngmayem Festival', keywords: ['ngmayem'], kind: 'festival' },
  { slug: 'asafotufiam', name: 'Asafotufiam Festival', keywords: ['asafotufiam'], kind: 'festival' },
  { slug: 'apoo', name: 'Apoo Festival', keywords: ['apoo festival'], kind: 'festival' },
  { slug: 'damba', name: 'Damba Festival', keywords: ['damba festival'], kind: 'festival' },
  { slug: 'bugum', name: 'Bugum Fire Festival', keywords: ['bugum', 'fire festival'], kind: 'festival' },
  { slug: 'edina-bronya', name: 'Edina Bronya', keywords: ['edina bronya'], kind: 'festival' },
  { slug: 'afestacc', name: 'AFESTACC', keywords: ['afestacc'], kind: 'festival' },
];

/**
 * Channels whose festival and show coverage we trust enough to publish without review:
 * national broadcasters and established music/culture outlets. Matched on the channel name.
 */
export const TRUSTED_MEDIA = [
  'joynews', 'joy news', 'myjoyonline', 'joy prime', 'citi tv', 'citinewsroom', 'citi newsroom', 'tv3 ghana', 'tv3', '3news',
  'utv ghana', 'adom tv', 'adomonline', 'ghone tv', 'gh one tv', 'ghanaweb tv', 'ghanaweb', 'pulse ghana', 'yfm ghana', 'y107.9fm', 'y1079fm',
  '3music tv', '3music', 'graphic online', 'gbc ghana', 'gtv', 'asaase radio', 'metro tv', 'onua tv', 'max tv', 'kumasi tv',
  'zionfelix', 'ameyaw debrah', 'ghana tourism authority', 'visit ghana', 'chale wote', 'accra[dot]alt', 'afrofuture', 'detty rave', 'tidal rave',
];
