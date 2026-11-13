import type { GhanaEvent } from '@/lib/types';

/**
 * Guide pages: one page for each thing people search ("events in Ghana today", "free events in Ghana",
 * "events in Accra"...). Each lists the matching shows live from TsaCoal, answers the common questions,
 * and links to the other guides.
 */
export type Day = { today: string; weekendFrom: string; weekendTo: string; monthEnd: string; year: string };
export type Guide = {
  slug: string;
  /** The heading: the search itself, said plainly */
  h1: string;
  /** Page title for search results (kept under ~60 characters) */
  title: string;
  /** Meta description base; the count and dates are added when the page renders */
  about: string;
  /** Opening line above the list */
  intro: string;
  match: (e: GhanaEvent, d: Day) => boolean;
  /** Short label for links from other guides */
  label: string;
  /** Extra questions specific to this search */
  faqs?: (list: GhanaEvent[], d: Day) => { q: string; a: string }[];
};

const isPool = (e: GhanaEvent) => /\bpool(side)?\b|pool party|\bsplash\b|\bswim/i.test(`${e.title} ${e.venue ?? ''}`);
const isFestival = (e: GhanaEvent) => e.category === 'festival' || /\bfest(ival)?\b/i.test(e.title);
const inCity = (city: string) => (e: GhanaEvent) => e.city === city;
const upcoming = (e: GhanaEvent, d: Day) => e.date >= d.today;
const names = (l: GhanaEvent[], n = 3) => l.slice(0, n).map((e) => e.title).join(', ');

export const GUIDES: Guide[] = [
  {
    slug: 'events-in-ghana-today', label: 'Today', h1: 'Events in Ghana today', title: 'Events in Ghana Today: Concerts, Parties & What’s On',
    about: 'What’s on in Ghana today: concerts, parties, festivals and shows in Accra, Kumasi and across the country, with times, venues and how to get tickets.',
    intro: 'Everything happening in Ghana today, from concerts and raves to church programmes and pool parties.',
    match: (e, d) => e.date === d.today,
  },
  {
    slug: 'events-in-ghana-this-weekend', label: 'This weekend', h1: 'Events in Ghana this weekend', title: 'Events in Ghana This Weekend: Concerts & Parties',
    about: 'Plan your weekend in Ghana: concerts, parties, day raves and festivals this Friday to Sunday, with times, venues and ticket codes.',
    intro: 'Friday to Sunday in Ghana: the shows, parties and day raves worth leaving the house for.',
    match: (e, d) => e.date >= d.weekendFrom && e.date <= d.weekendTo,
  },
  {
    slug: 'free-events-in-ghana', label: 'Free events', h1: 'Free events in Ghana', title: 'Free Events in Ghana: Concerts, Shows & Things to Do',
    about: 'Free things to do in Ghana: free concerts, shows, festivals and community events in Accra and beyond, all free to attend.',
    intro: 'Shows you can walk into without a ticket: free concerts, festivals, exhibitions and community nights.',
    match: (e, d) => upcoming(e, d) && e.price === 0 && !e.priceUnknown,
  },
  {
    slug: 'upcoming-events-in-ghana', label: `Upcoming in Ghana`, h1: 'Upcoming events in Ghana', title: 'Upcoming Events in Ghana 2026: Concerts, Festivals & Shows',
    about: 'Every upcoming event in Ghana for 2026 and into 2027: concerts, festivals, parties and big shows, soonest first, with tickets.',
    intro: 'Every show coming up in Ghana, soonest first, as soon as it’s announced.',
    match: upcoming,
  },
  {
    slug: 'festivals-in-ghana', label: 'Festivals', h1: 'Festivals in Ghana 2026', title: 'Festivals in Ghana 2026: Music & Culture Festivals',
    about: 'The major festivals in Ghana in 2026: music festivals, beach festivals, cultural festivals and Detty December, with dates, venues and tickets.',
    intro: 'Ghana’s festivals, from beach raves to culture days and the big December nights.',
    match: (e, d) => upcoming(e, d) && isFestival(e),
    faqs: (l) => [{ q: 'What are the major festivals in Ghana in 2026?', a: l.length ? `Coming up on TsaCoal: ${names(l, 6)}. December is the busiest month, with Detty December shows almost every night from mid-December into January.` : 'December is the busiest month, with Detty December festivals and concerts almost every night from mid-December into January.' }],
  },
  {
    slug: 'concerts-in-ghana', label: 'Concerts', h1: 'Concerts in Ghana', title: 'Concerts in Ghana 2026: Upcoming Shows & Tickets',
    about: 'Upcoming concerts in Ghana: Afrobeats, highlife, drill, gospel and more, with headliners, dates, venues and how to buy tickets.',
    intro: 'Headline shows and live sets across Ghana, with who’s on stage and how to get in.',
    match: (e, d) => upcoming(e, d) && e.category === 'concert',
  },
  {
    slug: 'events-in-accra', label: 'Accra', h1: 'Events in Accra', title: 'Events in Accra: Concerts, Parties & Things to Do',
    about: 'What’s on in Accra: concerts, parties, festivals and nightlife across Osu, East Legon, Labadi and beyond, with dates and tickets.',
    intro: 'Accra’s nights out: concerts, raves, beach parties and church programmes across the city.',
    match: (e, d) => upcoming(e, d) && e.city === 'accra',
  },
  {
    slug: 'things-to-do-in-accra', label: 'Things to do in Accra', h1: 'Things to do in Accra', title: 'Things to Do in Accra This Month: Shows, Food & Nights Out',
    about: 'Things to do in Accra this month: live music, festivals, food events, exhibitions and nights out, picked from every listing in the city.',
    intro: 'The best things to do in Accra over the next month: shows, food, art and nights out.',
    match: (e, d) => e.city === 'accra' && e.date >= d.today && e.date <= d.monthEnd,
  },
  {
    slug: 'parties-in-accra', label: 'Parties in Accra', h1: 'Parties in Accra', title: 'Parties in Accra: Raves, Club Nights & Day Parties',
    about: 'Parties in Accra this week and beyond: raves, club nights, day parties and beach parties, with venues, times and ticket codes.',
    intro: 'Raves, club nights and day parties in Accra, as they’re announced.',
    match: (e, d) => upcoming(e, d) && e.city === 'accra' && (e.category === 'nightlife' || /\b(party|rave|vibes|turn up|link ?up)\b/i.test(e.title)),
  },
  {
    slug: 'pool-parties-in-accra', label: 'Pool parties', h1: 'Pool parties in Accra', title: 'Pool Parties in Accra: Day Raves & Splash Parties',
    about: 'Pool parties and day raves in Accra and around Ghana: poolside parties, splash parties and swim-wear day raves, with dates and tickets.',
    intro: 'Poolside day raves and splash parties, only the ones that are actually by the pool.',
    match: (e, d) => upcoming(e, d) && isPool(e),
  },
  { slug: 'events-in-kumasi', label: 'Kumasi', h1: 'Events in Kumasi', title: 'Events in Kumasi: Concerts, Parties & Things to Do', about: 'What’s on in Kumasi: concerts, Asakaa nights, parties and festivals in the Garden City, with dates, venues and tickets.', intro: 'Kumasi’s shows and nights out, from Asakaa drill to highlife and church programmes.', match: (e, d) => upcoming(e, d) && inCity('kumasi')(e) },
  { slug: 'events-in-cape-coast', label: 'Cape Coast', h1: 'Events in Cape Coast', title: 'Events in Cape Coast: Festivals, Shows & Things to Do', about: 'What’s on in Cape Coast: festivals, beach parties, concerts and culture, with dates and venues.', intro: 'Cape Coast’s festivals, beach nights and shows.', match: (e, d) => upcoming(e, d) && inCity('cape-coast')(e) },
  { slug: 'events-in-takoradi', label: 'Takoradi', h1: 'Events in Takoradi', title: 'Events in Takoradi: Concerts, Parties & Things to Do', about: 'What’s on in Takoradi: concerts, beach parties and nights out in the Oil City, with dates and venues.', intro: 'Takoradi’s concerts, beach parties and nights out.', match: (e, d) => upcoming(e, d) && inCity('takoradi')(e) },
  { slug: 'events-in-tamale', label: 'Tamale', h1: 'Events in Tamale', title: 'Events in Tamale: Shows, Festivals & Things to Do', about: 'What’s on in Tamale: concerts, festivals and culture in the north, with dates and venues.', intro: 'Tamale’s shows, festivals and culture nights.', match: (e, d) => upcoming(e, d) && inCity('tamale')(e) },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);

/** Today and this weekend, in Ghana time (GMT all year) */
export function days(now = new Date()): Day {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const today = iso(now);
  const dow = now.getUTCDay(); // 0 Sun ... 6 Sat
  const from = new Date(now); const to = new Date(now);
  if (dow >= 1 && dow <= 4) { from.setUTCDate(now.getUTCDate() + (5 - dow)); to.setUTCDate(now.getUTCDate() + (7 - dow)); }
  else if (dow === 5) { to.setUTCDate(now.getUTCDate() + 2); }
  else if (dow === 6) { to.setUTCDate(now.getUTCDate() + 1); }
  const monthEnd = new Date(now); monthEnd.setUTCDate(now.getUTCDate() + 30);
  return { today, weekendFrom: iso(from), weekendTo: iso(to), monthEnd: iso(monthEnd), year: String(now.getUTCFullYear()) };
}
