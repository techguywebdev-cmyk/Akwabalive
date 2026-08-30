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
  /** Neighbourhood / area label e.g. Dansoman */
  area?: string | null;
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
  /** Admin pin for hero / featured rails */
  isFeatured?: boolean;
  featuredOrder?: number;
  /** Announcement / promo video (YouTube URL or direct mp4) */
  promoVideoUrl?: string | null;
  /** ISO timestamp for "newest first" ranking */
  createdAt?: string | null;
}

export interface CityInfo {
  slug: City;
  name: string;
  region: string;
  image: string;
  count: number;
}

/** upcoming = date; popular = attending/hot; nearby = distance; newest = createdAt */
export type SortMode = 'upcoming' | 'popular' | 'nearby' | 'newest';

/** all = no date limit; upcoming = from today; tonight / weekend / week = windows */
export type WhenFilter = 'upcoming' | 'tonight' | 'weekend' | 'week' | 'all';

export interface FilterState {
  city: City | 'all';
  category: Category | null;
  priceFilter: 'free' | 'u50' | 'u200' | 'o200' | null;
  freeOnly: boolean;
  maxPrice: number;
  search: string;
  sort: SortMode;
  /** Default upcoming = hide past events */
  when: WhenFilter;
}

export function isListedEvent(event: Pick<GhanaEvent, 'listingType' | 'ticketUrl'>): boolean {
  return event.listingType === 'listed' || Boolean(event.ticketUrl);
}
