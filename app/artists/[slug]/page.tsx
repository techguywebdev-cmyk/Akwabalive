import { notFound } from 'next/navigation';
import ArtistPageClient, { type SimilarArtist } from '@/components/artists/ArtistPageClient';
import { artists, getArtistBySlug, eventMatchesArtist } from '@/lib/data/artists';
import { loadAllEvents } from '@/lib/data/allEvents';
import { seriesForArtist } from '@/lib/data/series';
import { summarizeSeries } from '@/lib/data/seriesSummary';
import { BRAND_NAME } from '@/lib/theme';
import { momentsForArtist } from '@/lib/moments/matchArtist';
import { fetchMoments } from '@/lib/moments/server';
import { getArtistPhotos } from '@/lib/artists/photos';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const artist = getArtistBySlug(params.slug);
  if (!artist) return { title: `Artist — ${BRAND_NAME}` };
  return {
    title: `${artist.name} shows — ${BRAND_NAME}`,
    description: `Upcoming and past concerts and moments for ${artist.name} on ${BRAND_NAME}.`,
  };
}

export default async function ArtistPage({ params }: { params: { slug: string } }) {
  const artist = getArtistBySlug(params.slug);
  if (!artist) notFound();

  const [events, allMoments, photos] = await Promise.all([loadAllEvents(), fetchMoments(), getArtistPhotos(artists)]);
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const isUpcoming = (d?: string) => !!d && new Date(`${d}T00:00:00`) >= t0;

  const matched = events
    .filter((e) => eventMatchesArtist(e, artist))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const moments = momentsForArtist(allMoments, artist, events);
  const hosted = summarizeSeries(seriesForArtist(artist.slug), events);

  // Fans also like: acts they've shared a bill with first, then the same genre
  const coBilled = new Set(artists.filter((a) => a.slug !== artist.slug && matched.some((e) => eventMatchesArtist(e, a))).map((a) => a.slug));
  const similar: SimilarArtist[] = artists
    .filter((a) => a.slug !== artist.slug && (coBilled.has(a.slug) || (artist.genre && a.genre === artist.genre)))
    .sort((a, b) => Number(coBilled.has(b.slug)) - Number(coBilled.has(a.slug)) || a.priority - b.priority)
    .slice(0, 10)
    .map((a) => ({ slug: a.slug, name: a.name, photo: photos[a.slug]?.url ?? null, touring: events.some((e) => isUpcoming(e.date) && eventMatchesArtist(e, a)) }));

  return (
    <ArtistPageClient artist={artist} events={matched} moments={moments} photo={photos[artist.slug] ?? null} hosted={hosted} similar={similar} />
  );
}
