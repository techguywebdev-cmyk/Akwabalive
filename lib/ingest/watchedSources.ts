import { majorArtists } from '@/lib/data/artists';

export type WatchedSource = {
  artistSlug: string;
  artistName: string;
  /** X/Twitter handle without @ */
  xHandle?: string;
  /** Instagram handle without @ — discovery is link-based, not full scrape */
  instagram?: string;
  /** Extra public ticket/promoter search hints */
  searchHints: string[];
};

/** Major acts we actively try to cover before organic listings catch up. */
export function getWatchedSources(): WatchedSource[] {
  return majorArtists.map((a) => ({
    artistSlug: a.slug,
    artistName: a.name,
    xHandle: a.xHandle,
    instagram: a.instagram,
    searchHints: [
      `${a.name} concert`,
      `${a.name} live`,
      `${a.name} tickets`,
      ...a.keywords.slice(0, 3),
    ],
  }));
}

/** Words that suggest a post is an event announcement */
export const EVENT_SIGNAL_RE =
  /\b(tickets?|concert|live\s+in|tour|stadium|arena|festival|presale|on\s+sale|doors\s+open|performing\s+at|billed\s+to|line\s*up|lineup|eventbrite|shotgun|posh\.vic|o2\s+academy)\b/i;
