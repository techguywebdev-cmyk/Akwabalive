import ShowsIndexClient from '@/components/series/ShowsIndexClient';
import { SERIES } from '@/lib/data/series';
import { summarizeSeries, seriesCovers } from '@/lib/data/seriesSummary';
import { loadAllEvents } from '@/lib/data/allEvents';
import { fetchMoments } from '@/lib/moments/server';
import { BRAND_NAME } from '@/lib/theme';
import { getArtistPhotos } from '@/lib/artists/photos';
import { getArtistBySlug } from '@/lib/data/artists';
import type { Artist } from '@/lib/types';
import { linkTentpoles, EXPECTED } from '@/lib/data/tentpoles';
import type { CalendarItem } from '@/components/series/ShowsIndexClient';

// Served from cache and refreshed in the background every minute, so the page opens instantly
export const revalidate = 60;
export const fetchCache = 'force-cache';
export const metadata = {
  title: 'Ghana’s Biggest Yearly Shows & Festivals',
  alternates: { canonical: '/shows' },
  description: 'Rapperholic, Detty Rave, Tidal Rave and the other nights that come back every year, with ratings from people who went.',
};

export default async function ShowsPage() {
  const [events, moments] = await Promise.all([loadAllEvents(), fetchMoments()]);
  const poleArtists = [...linkTentpoles([]).map((t) => t.artist), ...EXPECTED.map((x) => x.artist)].filter(Boolean) as string[];
  const hostArtists = (Array.from(new Set([...SERIES.flatMap((s) => s.hosts), ...poleArtists])).map(getArtistBySlug).filter(Boolean) as Artist[]);
  const [covers, photos] = await Promise.all([seriesCovers(events, moments), getArtistPhotos(hostArtists, 2000)]);
  const hostPhotos = Object.fromEntries(hostArtists.map((a) => [a.slug, photos[a.slug]?.url ?? null]));
  const series = summarizeSeries(SERIES, events, covers, hostPhotos);

  // The December calendar: the season's confirmed big nights (same list as /december), then the expected regulars
  const seriesFor = (title: string) => series.find((x) => x.name.toLowerCase().replace(/[^a-z0-9]/g, '') === title.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' });
  const calendar: CalendarItem[] = [
    ...linkTentpoles(events).filter((t) => (t.end ?? t.date) >= today).map((t) => {
      const sr = seriesFor(t.title);
      return {
        key: t.title, date: t.date, end: t.end ?? null, title: t.title, sub: [t.event?.venue ?? t.venue].filter(Boolean).join('') || t.blurb,
        href: t.event ? `/events/${t.event.slug}` : sr ? `/shows/${sr.slug}` : '/december#big-nights',
        image: t.event?.image ?? sr?.image ?? (t.artist ? hostPhotos[t.artist] ?? null : null),
      };
    }),
    ...EXPECTED.map((x) => {
      const sr = seriesFor(x.title);
      return { key: x.title, date: null, end: null, title: x.title, sub: x.when, href: sr ? `/shows/${sr.slug}` : '/december#big-nights', image: sr?.image ?? (x.artist ? hostPhotos[x.artist] ?? null : null) };
    }),
  ];
  return <ShowsIndexClient series={series} calendar={calendar} />;
}
