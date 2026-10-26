import { notFound } from 'next/navigation';
import SeriesPageClient from '@/components/series/SeriesPageClient';
import { getSeries, editionsOf, momentInSeries } from '@/lib/data/series';
import { artists, getArtistBySlug } from '@/lib/data/artists';
import { loadAllEvents } from '@/lib/data/allEvents';
import { fetchMoments } from '@/lib/moments/server';
import { getArtistPhotos } from '@/lib/artists/photos';
import { BRAND_NAME } from '@/lib/theme';
import { seriesCovers } from '@/lib/data/seriesSummary';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const s = getSeries(params.slug);
  if (!s) return { title: BRAND_NAME };
  return { title: `${s.name} — ${BRAND_NAME}`, description: s.blurb };
}

export default async function SeriesPage({ params }: { params: { slug: string } }) {
  const series = getSeries(params.slug);
  if (!series) notFound();
  const hostArtists = series.hosts.map(getArtistBySlug).filter(Boolean) as typeof artists;
  const [events, moments, photos] = await Promise.all([loadAllEvents(), fetchMoments(), getArtistPhotos(hostArtists, 2000)]);
  const { upcoming, past } = editionsOf(series, events);
  const covers = await seriesCovers(events, moments);
  return (
    <SeriesPageClient
      series={series}
      upcoming={upcoming}
      past={past}
      moments={moments.filter((m) => momentInSeries(m, series)).slice(0, 12)}
      cover={covers[series.slug] ?? null}
      hosts={hostArtists.map((a) => ({ slug: a.slug, name: a.name, photo: photos[a.slug]?.url ?? null }))}
    />
  );
}
