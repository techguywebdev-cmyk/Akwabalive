export type City =
  | 'accra'
  | 'kumasi'
  | 'cape-coast'
  | 'tamale'
  | 'takoradi'
  | 'ho';

export type Category =
  | 'festival'
  | 'concert'
  | 'food'
  | 'nightlife'
  | 'culture'
  | 'sports'
  | 'tech'
  | 'art'
  | 'fashion'
  | 'wellness';

export interface GhanaEvent {
  id: number;
  slug: string;
  title: string;
  city: City;
  region: string;
  venue: string;
  category: Category;
  price: number; // 0 = free
  date: string; // ISO yyyy-mm-dd, start date
  dateLabel: string; // "Mar 28–30"
  time: string; // "6:00 PM"
  lat: number;
  lng: number;
  image: string;
  hot: boolean;
  recurring: boolean;
  badge: string; // top-left badge text
  attending?: number;
}

export interface CityInfo {
  slug: City;
  name: string;
  region: string;
  image: string;
  count: number;
}

export type SortMode = 'upcoming' | 'popular' | 'nearby';

export interface FilterState {
  city: City | 'all';
  category: Category | null;
  priceFilter: 'free' | 'u50' | 'u200' | 'o200' | null;
  freeOnly: boolean;
  maxPrice: number;
  search: string;
  sort: SortMode;
}
