export type Place = {
  id: string;
  label: string;
  city: string;
  area: string;
  lat: number;
  lng: number;
};

export const PLACES: Place[] = [
  { id: 'dansoman', label: 'Dansoman', area: 'Dansoman', city: 'accra', lat: 5.5520, lng: -0.2700 },
  { id: 'osu', label: 'Osu', area: 'Osu', city: 'accra', lat: 5.5580, lng: -0.1820 },
  { id: 'labadi', label: 'Labadi / La', area: 'Labadi', city: 'accra', lat: 5.5600, lng: -0.1550 },
  { id: 'east-legon', label: 'East Legon', area: 'East Legon', city: 'accra', lat: 5.6380, lng: -0.1480 },
  { id: 'airport', label: 'Airport / Cantonments', area: 'Cantonments', city: 'accra', lat: 5.6050, lng: -0.1680 },
  { id: 'kaneshie', label: 'Kaneshie', area: 'Kaneshie', city: 'accra', lat: 5.5680, lng: -0.2350 },
  { id: 'madina', label: 'Madina', area: 'Madina', city: 'accra', lat: 5.6830, lng: -0.1670 },
  { id: 'tema', label: 'Tema', area: 'Tema', city: 'accra', lat: 5.6690, lng: -0.0166 },
  { id: 'adenta', label: 'Adenta', area: 'Adenta', city: 'accra', lat: 5.7080, lng: -0.1560 },
  { id: 'spintex', label: 'Spintex', area: 'Spintex', city: 'accra', lat: 5.6320, lng: -0.1020 },
  { id: 'jamestown', label: 'Jamestown', area: 'Jamestown', city: 'accra', lat: 5.5330, lng: -0.2110 },
  { id: 'accra-cbd', label: 'Accra Central', area: 'Accra Central', city: 'accra', lat: 5.5500, lng: -0.2000 },
  { id: 'kejetia', label: 'Kejetia / Adum', area: 'Adum', city: 'kumasi', lat: 6.6900, lng: -1.6250 },
  { id: 'santasi', label: 'Santasi', area: 'Santasi', city: 'kumasi', lat: 6.6620, lng: -1.6500 },
  { id: 'ayeduase', label: 'Ayeduase / KNUST', area: 'Ayeduase', city: 'kumasi', lat: 6.6780, lng: -1.5680 },
  { id: 'cape-coast-town', label: 'Cape Coast Town', area: 'Cape Coast', city: 'cape-coast', lat: 5.1050, lng: -1.2470 },
  { id: 'takoradi-harbour', label: 'Takoradi Harbour', area: 'Takoradi', city: 'takoradi', lat: 4.8840, lng: -1.7550 },
  { id: 'tamale-central', label: 'Tamale Central', area: 'Tamale', city: 'tamale', lat: 9.4030, lng: -0.8390 },
  { id: 'ho-central', label: 'Ho Central', area: 'Ho', city: 'ho', lat: 6.6110, lng: 0.4700 },
  { id: 'st-kilda', label: 'St Kilda / Prince Bandroom', area: 'St Kilda', city: 'melbourne', lat: -37.8679, lng: 144.9740 },
  { id: 'melbourne-cbd', label: 'Melbourne CBD', area: 'Melbourne CBD', city: 'melbourne', lat: -37.8136, lng: 144.9631 },
  { id: 'sydney-cbd', label: 'Sydney CBD', area: 'Sydney CBD', city: 'sydney', lat: -33.8688, lng: 151.2093 },
  { id: 'london-central', label: 'Central London', area: 'Central London', city: 'london', lat: 51.5074, lng: -0.1278 },
];

export function placesForCity(city: string): Place[] {
  if (!city || city === 'all' || city === 'international') return PLACES;
  const hit = PLACES.filter(p => p.city === city);
  return hit.length ? hit : PLACES;
}

export function matchPlace(query: string, city?: string): Place | null {
  const q = (query || '').toLowerCase().trim();
  if (q.length < 3) return null;
  const pool = city ? placesForCity(city) : PLACES;
  return (
    pool.find(p =>
      p.label.toLowerCase().includes(q) ||
      p.area.toLowerCase().includes(q) ||
      p.id.replace(/-/g, ' ').includes(q),
    ) || null
  );
}
