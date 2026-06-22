import type { GhanaEvent, FilterState } from '@/lib/types';

/** Haversine distance between two lat/lng points, in km */
export function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
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

export function categoryBadgeClass(category: string): string {
  const map: Record<string, string> = {
    festival: 'bg-green/15 text-[#a8ffce] border border-green-light/30',
    concert: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    culture: 'bg-gold/15 text-gold border border-gold/25',
    food: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25',
    nightlife: 'bg-red/20 text-white border border-red/30',
    sports: 'bg-sky-500/15 text-sky-300 border border-sky-500/25',
    tech: 'bg-sky-500/15 text-sky-300 border border-sky-500/25',
    art: 'bg-pink-500/15 text-pink-300 border border-pink-500/25',
    fashion: 'bg-purple-500/15 text-purple-300 border border-purple-500/25',
    wellness: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25',
  };
  return map[category] ?? 'bg-white/8 text-white/60 border border-white/12';
}

/** Apply the full filter state to the event list */
export function filterEvents(
  all: GhanaEvent[],
  filters: FilterState,
  userLoc: { lat: number; lng: number } | null,
  radiusKm = 999999
): GhanaEvent[] {
  let list = all.filter(ev => {
    if (filters.city !== 'all' && ev.city !== filters.city) return false;
    if (filters.category && ev.category !== filters.category) return false;
    if (filters.freeOnly && ev.price > 0) return false;
    if (filters.priceFilter === 'free' && ev.price > 0) return false;
    if (filters.priceFilter === 'u50' && ev.price >= 50) return false;
    if (filters.priceFilter === 'u200' && ev.price >= 200) return false;
    if (filters.priceFilter === 'o200' && ev.price < 200) return false;
    if (filters.maxPrice < 500 && ev.price > filters.maxPrice) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const hay = `${ev.title} ${ev.venue} ${ev.city} ${ev.category}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.sort === 'nearby' && userLoc) {
      const d = haversine(userLoc.lat, userLoc.lng, ev.lat, ev.lng);
      if (d > radiusKm) return false;
    }
    return true;
  });

  if (filters.sort === 'popular') {
    list = [...list].sort((a, b) => (b.attending ?? 0) - (a.attending ?? 0) || (b.hot ? 1 : 0) - (a.hot ? 1 : 0));
  } else if (filters.sort === 'nearby' && userLoc) {
    list = [...list].sort(
      (a, b) =>
        haversine(userLoc.lat, userLoc.lng, a.lat, a.lng) -
        haversine(userLoc.lat, userLoc.lng, b.lat, b.lng)
    );
  } else {
    list = [...list].sort((a, b) => a.date.localeCompare(b.date));
  }

  return list;
}

export function daysFromToday(iso: string, today: Date = new Date()): number {
  const target = new Date(iso + 'T00:00:00');
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - t0.getTime()) / 86400000);
}

export function countdownLabel(iso: string, today: Date = new Date()): { text: string; soon: boolean } | null {
  const d = daysFromToday(iso, today);
  if (d < 0) return null;
  if (d === 0) return { text: 'Today', soon: true };
  if (d === 1) return { text: 'Tomorrow', soon: true };
  if (d <= 7) return { text: `In ${d} days`, soon: true };
  if (d <= 14) return { text: 'Next week', soon: false };
  const wk = Math.round(d / 7);
  if (wk < 5) return { text: `In ${wk} weeks`, soon: false };
  const mo = Math.round(d / 30);
  return { text: `In ~${mo} month${mo > 1 ? 's' : ''}`, soon: false };
}
