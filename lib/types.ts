export type City =
  | 'accra'
  | 'kumasi'
  | 'cape-coast'
  | 'tamale'
  | 'takoradi'
  | 'ho'
  | 'melbourne'
  | 'sydney'
  | 'london'
  | 'international';

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

export type ListingType = 'hosted' | 'listed';

export interface GhanaEvent {
  id: number;
  slug: string;
  title: string;
  city: City;
  region: string;
  venue: string;
  category: Category;
  price: number;
  date: string;
  dateLabel: string;
  time: string;
  lat: number;
  lng: number;
  image: string;
  hot: boolean;
  recurring: boolean;
  badge: string;
  attending?: number;
  /** hosted = sold on Akwaaba. listed = tickets sold elsewhere. */
  listingType?: ListingType;
  ticketUrl?: string | null;
  ticketSource?: string | null;
  sourceUrl?: string | null;
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

export function isListedEvent(event: Pick<GhanaEvent, 'listingType' | 'ticketUrl'>): boolean {
  return event.listingType === 'listed' || Boolean(event.ticketUrl);
}
