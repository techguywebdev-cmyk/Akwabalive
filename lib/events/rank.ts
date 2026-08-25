import type { GhanaEvent } from '@/lib/types';

/** Rank for hero + discovery: featured → hot → newest → sooner date */
export function rankScore(ev: GhanaEvent): number {
  let s = 0;
  if (ev.isFeatured) s += 10_000 - (ev.featuredOrder ?? 100);
  if (ev.hot) s += 500;
  if (ev.badge?.toUpperCase().includes('SELLING')) s += 200;
  if (ev.createdAt) {
    const age = Date.now() - new Date(ev.createdAt).getTime();
    // newer → higher (cap ~7 days boost)
    s += Math.max(0, 150 - age / (1000 * 60 * 60 * 24));
  }
  return s;
}

export function sortByRank(events: GhanaEvent[]): GhanaEvent[] {
  return [...events].sort((a, b) => {
    const d = rankScore(b) - rankScore(a);
    if (d !== 0) return d;
    return (a.date || '').localeCompare(b.date || '');
  });
}

export function sortNewestFirst(events: GhanaEvent[]): GhanaEvent[] {
  return [...events].sort((a, b) => {
    const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (cb !== ca) return cb - ca;
    const feat = Number(!!b.isFeatured) - Number(!!a.isFeatured);
    if (feat !== 0) return feat;
    return (a.date || '').localeCompare(b.date || '');
  });
}

/** Hero: featured + hot, upcoming only, max N */
export function pickHeroEvents(events: GhanaEvent[], max = 6): GhanaEvent[] {
  const today = new Date().toISOString().slice(0, 10);
  const pool = events.filter((e) => {
    if (!e.date || e.date < today) return false;
    return e.isFeatured || e.hot;
  });
  const ranked = sortByRank(pool.length ? pool : events.filter((e) => e.date >= today));
  return ranked.slice(0, max);
}

export function splitTitle(title: string): { line1: string; line2: string } {
  const t = title.trim();
  const parts = t.split(/\s+/);
  if (parts.length <= 2) {
    return { line1: parts[0] || t, line2: parts.slice(1).join(' ') || '' };
  }
  const mid = Math.ceil(parts.length / 2);
  return {
    line1: parts.slice(0, mid).join(' '),
    line2: parts.slice(mid).join(' '),
  };
}

export type HeroSlide = {
  eyebrow: string;
  live?: string;
  titleLine1: string;
  titleLine2: string;
  date: string;
  venue: string;
  time: string;
  cta: string;
  image: string;
  glow: 'green' | 'gold' | 'red';
  href: string;
  promoVideoUrl?: string | null;
};

export function eventToHeroSlide(ev: GhanaEvent): HeroSlide {
  const { line1, line2 } = splitTitle(ev.title);
  const glow: HeroSlide['glow'] =
    ev.category === 'concert' ? 'red' : ev.hot || ev.isFeatured ? 'gold' : 'green';
  const cta =
    ev.price === 0
      ? 'RSVP Free'
      : `Get Tickets — from ₵${ev.price.toLocaleString()}`;
  return {
    eyebrow: (ev.badge || ev.category || 'Event').toString(),
    live: ev.hot ? 'Selling fast' : ev.isFeatured ? 'Featured' : undefined,
    titleLine1: line1,
    titleLine2: line2 || ev.category,
    date: ev.dateLabel || ev.date,
    venue: ev.venue,
    time: ev.time || '',
    cta,
    image: ev.image,
    glow,
    href: `/events/${ev.slug}`,
    promoVideoUrl: ev.promoVideoUrl,
  };
}

export function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i,
  );
  return m?.[1] ?? null;
}
