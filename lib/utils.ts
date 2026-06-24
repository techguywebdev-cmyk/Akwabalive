import type { GhanaEvent, FilterState } from '@/lib/types';

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

export function filterEvents(
  all: GhanaEvent[],
  filters: FilterState,
  userLoc: { lat: number; lng: number } | null,
  radiusKm = 999999,
): GhanaEvent[] {
  let list = all.filter(ev => {
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
    list = [...list].sort((a, b) => (b.attending ?? 0) - (a.attending ?? 0));
  } else if (filters.sort === 'nearby' && userLoc) {
    list = [...list].sort((a, b) =>
      haversine(userLoc.lat, userLoc.lng, a.lat, a.lng) -
      haversine(userLoc.lat, userLoc.lng, b.lat, b.lng),
    );
  } else {
    list = [...list].sort((a, b) => a.date.localeCompare(b.date));
  }

  return list;
}
