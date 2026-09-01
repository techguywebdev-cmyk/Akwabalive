import { notFound } from 'next/navigation';
import ArtistPageClient from '@/components/artists/ArtistPageClient';
import { getArtistBySlug, eventMatchesArtist } from '@/lib/data/artists';
import { events as staticEvents } from '@/lib/data/events';
import { fetchPublishedEvents, supabaseToGhanaEvent } from '@/lib/supabase/events';
import { BRAND_NAME } from '@/lib/theme';
import type { GhanaEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const artist = getArtistBySlug(params.slug);
  if (!artist) return { title: `Artist — ${BRAND_NAME}` };
  return {
    title: `${artist.name} shows — ${BRAND_NAME}`,
    description: `Upcoming and past concerts for ${artist.name} on ${BRAND_NAME}.`,
  };
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

  return <ArtistPageClient artist={artist} events={matched} />;
}
