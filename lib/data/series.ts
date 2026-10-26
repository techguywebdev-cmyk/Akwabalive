import type { GhanaEvent } from '@/lib/types';

/**
 * Event series: the shows that come back every year (Rapperholic, Detty Rave…). People can
 * follow a series to keep up with the next edition, whoever is on the bill.
 */
export interface EventSeries {
  slug: string;
  name: string;
  /** Matched against event titles and descriptions (word boundaries, case-insensitive) */
  keywords: string[];
  /** Artists who host it (artist slugs) */
  hosts: string[];
  /** Who puts it on, when it isn't an artist */
  organiser?: string;
  /** When / where it usually happens */
  usually: string;
  blurb: string;
  /** Wikipedia article, for a free cover photo when we have no flyer */
  wiki?: string;
}

export const SERIES: EventSeries[] = [
  { slug: 'rapperholic', name: 'Rapperholic', keywords: ['rapperholic', 'rapholic'], hosts: ['sarkodie'], usually: 'Every December · Accra',
    blurb: 'Sarkodie’s yearly concert — one of the biggest nights in Ghanaian music, with surprise guests every edition.' },
  { slug: 'detty-rave', name: 'Detty Rave', keywords: ['detty rave'], hosts: ['mr-eazi'], usually: 'Every December · Accra',
    blurb: 'Mr Eazi’s December festival: Afrobeats, amapiano and the Choplife Soundsystem, running deep into the night.' },
  { slug: 'tidal-rave', name: 'Tidal Rave', keywords: ['tidal rave'], hosts: [], organiser: 'Echo House', usually: 'Kokrobite Beach', wiki: 'Tidal Rave Festival',
    blurb: 'The beach festival at Kokrobite: big Ghanaian line-ups, sand, sea and a crowd that doesn’t sleep.' },
  { slug: 'afro-future', name: 'AfroFuture', keywords: ['afro future', 'afrofuture', 'afrochella'], hosts: [], usually: 'Every December · Accra', wiki: 'Afrochella',
    blurb: 'Accra’s December culture festival (formerly Afrochella): music, fashion, art and food from across the diaspora.' },
  { slug: 'bhim-concert', name: 'Bhim Concert', keywords: ['bhim concert'], hosts: ['stonebwoy'], usually: 'Accra',
    blurb: 'Stonebwoy’s own concert, with the Bhim Nation out in full.' },
  { slug: 'ashaiman-to-the-world', name: 'Ashaiman To The World', keywords: ['ashaiman to the world'], hosts: ['stonebwoy'], usually: 'Ashaiman',
    blurb: 'Stonebwoy brings the show home to Ashaiman.' },
  { slug: 'made-in-taadi', name: 'Made in Taadi', keywords: ['made in taadi'], hosts: ['kofi-kinaata'], usually: 'Takoradi',
    blurb: 'Kofi Kinaata’s hometown concert in Takoradi, drawing tens of thousands every year.' },
  { slug: 'kweku-smoke-revival', name: 'Revival Concert', keywords: ['kweku smoke revival', 'smoke revival'], hosts: ['kweku-smoke'], usually: 'Accra',
    blurb: 'Kweku Smoke’s headline concert.' },
  { slug: 'gadam-nation', name: 'Gadam Nation Concert', keywords: ['gadam nation', 'gadam concert'], hosts: ['fancy-gadam'], usually: 'Tamale',
    blurb: 'Fancy Gadam’s yearly concert for the north.' },
];

const re = (k: string) => new RegExp(`(?:^|[^a-z0-9])${k.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*')}(?:$|[^a-z0-9])`, 'i');

export const getSeries = (slug: string) => SERIES.find((s) => s.slug === slug);

/** Travel packages and tours that mention a show aren't editions of it */
const NOT_AN_EDITION = /\b(tour|tours|package|trip|itinerary|vacation|holiday)\b/i;

/** An edition names the show in its title (descriptions mention other shows too often) */
export function eventInSeries(e: Pick<GhanaEvent, 'title' | 'description'>, s: EventSeries): boolean {
  const t = e.title ?? '';
  return !NOT_AN_EDITION.test(t) && s.keywords.some((k) => re(k).test(t));
}

export const seriesForEvent = (e: Pick<GhanaEvent, 'title' | 'description'>) => SERIES.find((s) => eventInSeries(e, s));
export const seriesForArtist = (artistSlug: string) => SERIES.filter((s) => s.hosts.includes(artistSlug));
export const momentInSeries = (m: { title?: string | null; event_name?: string | null }, s: EventSeries) =>
  s.keywords.some((k) => re(k).test([m.title, m.event_name].filter(Boolean).join(' ')));

/** Editions of a series among these events: upcoming (soonest first) and past (latest first) */
export function editionsOf(s: EventSeries, events: GhanaEvent[]) {
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const mine = events.filter((e) => eventInSeries(e, s));
  const when = (e: GhanaEvent) => new Date(`${e.date}T00:00:00`).getTime();
  const upcoming = mine.filter((e) => !e.date || when(e) >= t0.getTime()).sort((a, b) => when(a) - when(b));
  const past = mine.filter((e) => e.date && when(e) < t0.getTime()).sort((a, b) => when(b) - when(a));
  return { upcoming, past };
}
