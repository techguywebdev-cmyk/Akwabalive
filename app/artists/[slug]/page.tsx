import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import ArtistPageClient from '@/components/artists/ArtistPageClient';
import { getArtistBySlug, eventMatchesArtist } from '@/lib/data/artists';
import { events as staticEvents } from '@/lib/data/events';
import { fetchPublishedEvents, supabaseToGhanaEvent } from '@/lib/supabase/events';
import { BRAND_NAME } from '@/lib/theme';
import type { GhanaEvent } from '@/lib/types';
import type { Moment } from '@/components/moments/types';
import { momentsForArtist } from '@/lib/moments/matchArtist';

export const dynamic = 'force-dynamic';

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
    const supabase = createClient(url, key);
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

  let events: GhanaEvent[] = [...staticEvents];
  try {
    const rows = await fetchPublishedEvents();
    if (rows?.length) {
      const mapped = rows.map(supabaseToGhanaEvent);
      const bySlug = new Map<string, GhanaEvent>();
      for (const e of [...mapped, ...staticEvents]) bySlug.set(e.slug, e);
      events = Array.from(bySlug.values());
    }
  } catch {
    // static fallback
  }

  const matched = events
    .filter((e) => eventMatchesArtist(e, artist))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const allMoments = await fetchMoments();
  const moments = momentsForArtist(allMoments, artist, events);

  return (
    <ArtistPageClient artist={artist} events={matched} moments={moments} />
  );
}
