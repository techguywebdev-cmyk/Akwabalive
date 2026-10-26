import ArtistsIndexClient, { type ArtistCard } from '@/components/artists/ArtistsIndexClient';
import { artists, eventMatchesArtist } from '@/lib/data/artists';
import { loadAllEvents } from '@/lib/data/allEvents';
import { parseDay } from '@/lib/dates';
import { BRAND_NAME } from '@/lib/theme';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const metadata = {
  title: `Artists — ${BRAND_NAME}`,
  description: `Ghana’s biggest acts and their upcoming shows on ${BRAND_NAME}.`,
};

export default async function ArtistsPage() {
  const events = await loadAllEvents();
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);

  const cards: ArtistCard[] = artists.map((artist) => {
    const shows = events.filter((e) => eventMatchesArtist(e, artist));
    const upcoming = shows
      .map((e) => ({ e, d: parseDay(e.date) }))
      .filter(({ d }) => d && d >= t0)
      .sort((a, b) => a.d!.getTime() - b.d!.getTime());
    const next = upcoming[0]?.e;
    const latest = next ?? shows.sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    return {
      slug: artist.slug, name: artist.name, priority: artist.priority,
      upcoming: upcoming.length,
      nextDate: next?.date ?? null, nextTitle: next?.title ?? null,
      image: latest?.image ?? null,
    };
  });

  // Artists with shows coming up first (soonest first), then the rest by prominence
  cards.sort((a, b) =>
    (a.nextDate ? 0 : 1) - (b.nextDate ? 0 : 1)
    || String(a.nextDate ?? '').localeCompare(String(b.nextDate ?? ''))
    || a.priority - b.priority);

  return <ArtistsIndexClient artists={cards} />;
}
