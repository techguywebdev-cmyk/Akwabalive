import type { GhanaEvent, FilterState, WhenFilter } from '@/lib/types';
import { rankScore } from '@/lib/events/rank';

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r;
  const dLng = (lng2 - lng1) * r;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

export function formatPrice(price: number): string {
  return price === 0 ? 'Free' : `₵${price.toLocaleString()}`;
}

export function cityLabel(slug: string): string {
  return slug
    .split('-')
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

/** Parse event date string to local YMD (supports YYYY-MM-DD and ISO). */
export function eventDateKey(date: string): string {
  if (!date) return '';
  const m = date.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

function todayKey(now = new Date()): string {
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const da = String(now.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

function addDaysKey(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return todayKey(d);
}

/** Friday–Sunday of the current week (local), or next weekend if already past Sunday night. */
export function weekendRange(now = new Date()): { start: string; end: string } {
  const day = now.getDay(); // 0 Sun … 6 Sat
  const start = new Date(now);
  if (day === 0) {
    // Sunday → today only as weekend end; start Friday
    start.setDate(now.getDate() - 2);
  } else if (day === 6) {
    start.setDate(now.getDate() - 1);
  } else if (day === 5) {
    // Friday
  } else {
    // Mon–Thu → upcoming Friday
    start.setDate(now.getDate() + (5 - day));
  }
  const end = new Date(start);
  end.setDate(start.getDate() + 2);
  return { start: todayKey(start), end: todayKey(end) };
}

export function matchesWhen(ev: GhanaEvent, when: WhenFilter, now = new Date()): boolean {
  const key = eventDateKey(ev.date);
  if (!key) return when === 'all';
  const today = todayKey(now);

  if (when === 'all') return true;
  if (when === 'upcoming') return key >= today;
  if (when === 'tonight') return key === today;
  if (when === 'week') {
    const end = addDaysKey(now, 7);
    return key >= today && key <= end;
  }
  if (when === 'weekend') {
    const { start, end } = weekendRange(now);
    return key >= start && key <= end;
  }
  return true;
}

export function filterEvents(
  all: GhanaEvent[],
  filters: FilterState,
  userLoc: { lat: number; lng: number } | null,
  radiusKm = 999999,
): GhanaEvent[] {
  const when = filters.when ?? 'upcoming';

  let list = all.filter(ev => {
    if (!matchesWhen(ev, when)) return false;
    if (filters.city !== 'all' && ev.city !== filters.city) return false;
    if (filters.category && ev.category !== filters.category) return false;
    if (filters.freeOnly && ev.price > 0) return false;
    if (filters.priceFilter === 'free'  && ev.price > 0)    return false;
    if (filters.priceFilter === 'u50'   && ev.price >= 50)  return false;
    if (filters.priceFilter === 'u200'  && ev.price >= 200) return false;
    if (filters.priceFilter === 'o200'  && ev.price < 200)  return false;
    if (filters.maxPrice < 500 && ev.price > filters.maxPrice) return false;
    if (filters.search) {
      const q   = filters.search.toLowerCase();
      const hay = `${ev.title} ${ev.venue} ${ev.city} ${ev.region ?? ''} ${ev.area ?? ''} ${ev.category}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.sort === 'nearby' && userLoc) {
      const d = haversine(userLoc.lat, userLoc.lng, ev.lat, ev.lng);
      if (d > radiusKm) return false;
    }
    return true;
  });

  if (filters.sort === 'popular') {
    list = [...list].sort((a, b) => {
      const score = rankScore(b) - rankScore(a);
      if (score !== 0) return score;
      return (b.attending ?? 0) - (a.attending ?? 0);
    });
  } else if (filters.sort === 'newest') {
    list = [...list].sort((a, b) => {
      const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (cb !== ca) return cb - ca;
      return rankScore(b) - rankScore(a);
    });
  } else if (filters.sort === 'nearby' && userLoc) {
    list = [...list].sort((a, b) =>
      haversine(userLoc.lat, userLoc.lng, a.lat, a.lng) -
      haversine(userLoc.lat, userLoc.lng, b.lat, b.lng),
    );
  } else {
    list = [...list].sort((a, b) => {
      const score = rankScore(b) - rankScore(a);
      if (score !== 0) return score;
      return (a.date || '').localeCompare(b.date || '');
    });
  }

  return list;
}
