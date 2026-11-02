import ShowsIndexClient from '@/components/series/ShowsIndexClient';
import { SERIES } from '@/lib/data/series';
import { summarizeSeries, seriesCovers } from '@/lib/data/seriesSummary';
import { loadAllEvents } from '@/lib/data/allEvents';
import { fetchMoments } from '@/lib/moments/server';
import { BRAND_NAME } from '@/lib/theme';
import { getArtistPhotos } from '@/lib/artists/photos';
import { getArtistBySlug } from '@/lib/data/artists';
import type { Artist } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const metadata = {
  title: `Shows — ${BRAND_NAME}`,
  description: 'Rapperholic, Detty Rave, Tidal Rave and the other nights that come back every year — with ratings from people who went.',
};

export default async function ShowsPage() {
  const [events, moments] = await Promise.all([loadAllEvents(), fetchMoments()]);
  const hostArtists = Array.from(new Set(SERIES.flatMap((s) => s.hosts))).map(getArtistBySlug).filter(Boolean) as Artist[];
  const [covers, photos] = await Promise.all([seriesCovers(events, moments), getArtistPhotos(hostArtists, 2000)]);
  const hostPhotos = Object.fromEntries(hostArtists.map((a) => [a.slug, photos[a.slug]?.url ?? null]));
  return <ShowsIndexClient series={summarizeSeries(SERIES, events, covers, hostPhotos)} />;
}
