import type { GhanaEvent, Artist } from '@/lib/types';
import type { EventSeries } from '@/lib/data/series';
import { SITE_URL } from '@/lib/og';

/**
 * Structured data (schema.org JSON-LD) so Google, Bing and AI answer engines read each page as what it is:
 * an event with a date, place and price, an artist with their shows, a yearly show, the site itself.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  // "<" is escaped so a title can never close the script tag
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

const abs = (u?: string | null) => (!u ? undefined : u.startsWith('http') ? u.replace('https://akwabalive.vercel.app', SITE_URL) : `${SITE_URL}${u.startsWith('/') ? '' : '/'}${u}`);
const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : undefined);
const PUBLISHER = { '@type': 'Organization', name: 'TsaCoal', url: SITE_URL };

/** "8:00 PM" → "20:00" */
function to24(t?: string | null): string | null {
  const m = t?.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ?? '00';
  if (m[3]) { const pm = m[3].toLowerCase() === 'pm'; if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
  return h > 23 ? null : `${String(h).padStart(2, '0')}:${min}`;
}
/** Ghana is GMT all year: no daylight saving */
const isoStart = (date: string, time?: string | null) => { const t = to24(time); return t ? `${date}T${t}:00+00:00` : date; };

export function siteJsonLd() {
  return [
    {
      '@context': 'https://schema.org', '@type': 'Organization', '@id': `${SITE_URL}/#org`, name: 'TsaCoal', url: SITE_URL,
      logo: `${SITE_URL}/icon`, email: 'hello@tsacoal.com', areaServed: { '@type': 'Country', name: 'Ghana' },
      description: 'TsaCoal lists every event in Ghana in one place: concerts, festivals, parties and shows in Accra, Kumasi and beyond, with tickets, line-ups and clips from past nights.',
    },
    {
      '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${SITE_URL}/#site`, name: 'TsaCoal', url: SITE_URL, inLanguage: 'en-GH', publisher: { '@id': `${SITE_URL}/#org` },
      potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/events?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
    },
  ];
}

export function eventJsonLd(e: GhanaEvent, opts: { description?: string | null; performers?: { name: string; slug?: string }[] } = {}) {
  const tiers = e.tiers ?? [];
  const url = `${SITE_URL}/events/${e.slug}`;
  const offers = tiers.length
    ? tiers.map((t) => ({
      '@type': 'Offer', name: t.name, price: t.price, priceCurrency: 'GHS', url,
      availability: t.quantity != null && t.sold != null && t.sold >= t.quantity ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    }))
    : e.ticketUrl
      ? [{ '@type': 'Offer', url: e.ticketUrl, priceCurrency: 'GHS', ...(e.price > 0 && !e.priceUnknown ? { price: e.price } : {}), availability: 'https://schema.org/InStock' }]
      : e.price === 0 && !e.priceUnknown ? [{ '@type': 'Offer', price: 0, priceCurrency: 'GHS', url, availability: 'https://schema.org/InStock' }] : undefined;
  const venueKnown = e.venue && !/to be announced|tba/i.test(e.venue);
  const performers: { name: string; slug?: string }[] = opts.performers?.length ? opts.performers : (e.lineup ?? []).map((name) => ({ name }));
  const music = ['concert', 'music', 'festival', 'party', 'nightlife'].includes(String(e.category));
  return {
    '@context': 'https://schema.org',
    '@type': music ? 'MusicEvent' : 'Event',
    name: e.title,
    url,
    startDate: isoStart(e.date, e.time),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    image: e.image ? [abs(e.image)] : undefined,
    description: (opts.description || e.description || `${e.title} at ${venueKnown ? e.venue : cap(e.city)}, ${cap(e.city)}, Ghana.`).slice(0, 500),
    location: {
      '@type': 'Place',
      name: venueKnown ? e.venue : `${cap(e.city)}, Ghana`,
      address: { '@type': 'PostalAddress', addressLocality: cap(e.area || e.city), addressRegion: e.region || cap(e.city), addressCountry: 'GH' },
      ...(e.lat && e.lng ? { geo: { '@type': 'GeoCoordinates', latitude: e.lat, longitude: e.lng } } : {}),
    },
    ...(offers ? { offers } : {}),
    ...(performers.length ? { performer: performers.slice(0, 12).map((p) => ({ '@type': 'PerformingGroup', name: p.name, ...(p.slug ? { url: `${SITE_URL}/artists/${p.slug}` } : {}) })) } : {}),
    organizer: e.organizerName ? { '@type': 'Organization', name: e.organizerName, ...(e.organizerUsername ? { url: `${SITE_URL}/u/${e.organizerUsername}` } : {}) } : PUBLISHER,
  };
}

export function artistJsonLd(a: Artist, opts: { photo?: string | null; bio?: string | null; events: GhanaEvent[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const same = [a.instagram ? `https://instagram.com/${a.instagram.replace(/^@/, '')}` : null, a.xHandle ? `https://x.com/${a.xHandle.replace(/^@/, '')}` : null, a.wiki ? `https://en.wikipedia.org/wiki/${encodeURIComponent(a.wiki.replace(/ /g, '_'))}` : null].filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: a.name,
    url: `${SITE_URL}/artists/${a.slug}`,
    ...(opts.photo ? { image: abs(opts.photo) } : {}),
    ...(a.genre ? { genre: a.genre } : {}),
    ...(opts.bio ? { description: opts.bio.slice(0, 500) } : {}),
    ...(same.length ? { sameAs: same } : {}),
    event: opts.events.filter((e) => e.date >= today).slice(0, 10).map((e) => eventJsonLd(e)).map(({ '@context': _c, ...rest }) => rest),
  };
}

export function seriesJsonLd(s: EventSeries, upcoming: GhanaEvent[], description?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'EventSeries',
    name: s.name,
    url: `${SITE_URL}/shows/${s.slug}`,
    description: description ?? (s as EventSeries & { blurb?: string }).blurb,
    ...(upcoming.length ? { subEvent: upcoming.slice(0, 5).map((e) => eventJsonLd(e)).map(({ '@context': _c, ...rest }) => rest) } : {}),
  };
}

/** A list of events (hub pages): lets search engines pick up every event linked from it */
export function eventListJsonLd(name: string, path: string, events: GhanaEvent[]) {
  return {
    '@context': 'https://schema.org', '@type': 'ItemList', name, url: `${SITE_URL}${path}`,
    itemListElement: events.slice(0, 40).map((e, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/events/${e.slug}`, name: e.title })),
  };
}

export function breadcrumbJsonLd(items: [string, string][]) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${SITE_URL}${path}` })),
  };
}
