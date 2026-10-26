import type { Artist, GhanaEvent } from '@/lib/types';
import type { SeriesSummary } from '@/components/artists/parts';
import type { Moment } from '@/components/moments/types';
import { getArtistBySlug } from '@/lib/data/artists';
import { SERIES, editionsOf, momentInSeries, type EventSeries } from '@/lib/data/series';
import { getArtistPhotos } from '@/lib/artists/photos';

/** Wide YouTube still (no letterbox bars); the client falls back to a smaller one if it's missing */
export const videoStill = (id: string) => `https://i.ytimg.com/vi/${id}/hq720.jpg`;

/**
 * Covers for every show, best first: the next or last edition's flyer, a free Wikipedia photo of
 * the festival, a still from its latest video, then the host artist's photo.
 */
export async function seriesCovers(events: GhanaEvent[], moments: Moment[]): Promise<Record<string, string>> {
  const pseudo: Artist[] = SERIES.filter((s) => s.wiki).map((s) => ({
    id: `series-${s.slug}`, slug: `series-${s.slug}`, name: s.name, wiki: s.wiki, image: '', isMajor: false, priority: 999, keywords: [],
  }));
  const hosts = Array.from(new Set(SERIES.flatMap((s) => s.hosts))).map(getArtistBySlug).filter(Boolean) as Artist[];
  const [wiki, hostPhotos] = await Promise.all([
    getArtistPhotos(pseudo, 2500, { spotify: false }),
    getArtistPhotos(hosts, 2500),
  ]);
  const out: Record<string, string> = {};
  for (const s of SERIES) {
    const { upcoming, past } = editionsOf(s, events);
    const flyer = (upcoming[0] ?? past[0])?.image;
    // A video that's also filed under another show isn't a reliable picture of this one
    const clip = moments
      .filter((m) => momentInSeries(m, s) && !SERIES.some((o) => o.slug !== s.slug && moments.some((x) => x.youtube_id === m.youtube_id && momentInSeries(x, o))))
      .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))[0];
    const host = s.hosts.map((h) => hostPhotos[h]?.url).find(Boolean);
    const cover = flyer || wiki[`series-${s.slug}`]?.url || (clip ? videoStill(clip.youtube_id) : null) || host;
    if (cover) out[s.slug] = cover;
  }
  return out;
}

/** What a show tile needs: next edition date, cover, hosts, and the last edition (for its rating) */
export function summarizeSeries(list: EventSeries[], events: GhanaEvent[], covers: Record<string, string> = {}): SeriesSummary[] {
  return list.map((s) => {
    const { upcoming, past } = editionsOf(s, events);
    const show = upcoming[0] ?? past[0];
    return {
      slug: s.slug, name: s.name, usually: s.usually,
      image: covers[s.slug] ?? show?.image ?? null, nextDate: upcoming[0]?.date ?? null,
      hostNames: s.hosts.map((h) => getArtistBySlug(h)?.name).filter(Boolean) as string[],
      lastSlug: past[0]?.slug ?? null,
    };
  });
}
