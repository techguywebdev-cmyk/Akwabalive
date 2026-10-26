import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import ArtistPageClient from '@/components/artists/ArtistPageClient';
import { getArtistBySlug, eventMatchesArtist } from '@/lib/data/artists';
import { loadAllEvents } from '@/lib/data/allEvents';
import { BRAND_NAME } from '@/lib/theme';
import type { Moment } from '@/components/moments/types';
import { momentsForArtist } from '@/lib/moments/matchArtist';
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

async function fetchMoments(): Promise<Moment[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const supabase = createClient(url, key, { global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) } });
    const { data } = await supabase
      .from('moments')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('year', { ascending: false })
      .limit(80);
    return (data ?? []) as Moment[];
  } catch {
    return [];
  }
}

export default async function ArtistPage({ params }: { params: { slug: string } }) {
  const artist = getArtistBySlug(params.slug);
  if (!artist) notFound();

  const events = await loadAllEvents();

  const matched = events
    .filter((e) => eventMatchesArtist(e, artist))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const [allMoments, photos] = await Promise.all([fetchMoments(), getArtistPhotos([artist])]);
  const moments = momentsForArtist(allMoments, artist, events);

  return (
    <ArtistPageClient artist={artist} events={matched} moments={moments} photo={photos[artist.slug] ?? null} />
  );
}
