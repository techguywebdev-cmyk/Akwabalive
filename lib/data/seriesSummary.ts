import type { GhanaEvent } from '@/lib/types';
import type { SeriesSummary } from '@/components/artists/parts';
import { getArtistBySlug } from '@/lib/data/artists';
import { editionsOf, type EventSeries } from '@/lib/data/series';

/** What a series row needs: next edition date and the latest flyer */
export function summarizeSeries(list: EventSeries[], events: GhanaEvent[]): SeriesSummary[] {
  return list.map((s) => {
    const { upcoming, past } = editionsOf(s, events);
    const show = upcoming[0] ?? past[0];
    return {
      slug: s.slug, name: s.name, usually: s.usually,
      image: show?.image ?? null, nextDate: upcoming[0]?.date ?? null,
      hostNames: s.hosts.map((h) => getArtistBySlug(h)?.name).filter(Boolean) as string[],
      lastSlug: past[0]?.slug ?? null,
    };
  });
}
