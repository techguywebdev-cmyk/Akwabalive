import { createClient } from '@supabase/supabase-js';
import type { GhanaEvent } from '@/lib/types';

function getServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export interface SupabaseEvent {
  id: string;
  organizer_id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string;
  city: string;
  region: string | null;
  venue: string;
  date: string;
  date_label: string | null;
  time: string;
  end_time: string | null;
  image_url: string | null;
  status: string;
  created_at: string;
  is_featured?: boolean;
  featured_order?: number;
  is_hot?: boolean;
  promo_video_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  area?: string | null;
  listing_type?: string | null;
  ticket_url?: string | null;
  ticket_source?: string | null;
  source_url?: string | null;
  ticket_tiers: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    quantity: number;
    sold: number;
  }[];
}

function isSellingFast(tiers: SupabaseEvent['ticket_tiers']): boolean {
  if (!tiers?.length) return false;
  return tiers.some((t) => t.quantity > 0 && t.sold / t.quantity >= 0.7);
}

export function supabaseToGhanaEvent(ev: SupabaseEvent): GhanaEvent {
  const minPrice =
    ev.ticket_tiers?.length > 0
      ? Math.min(...ev.ticket_tiers.map((t) => t.price))
      : 0;

  const sellingFast = isSellingFast(ev.ticket_tiers || []);
  const featured = !!ev.is_featured;
  const hot = !!ev.is_hot || sellingFast || featured;

  let badge = (ev.category || 'EVENT').toUpperCase();
  if (ev.listing_type === 'listed') badge = 'LISTED';
  if (sellingFast) badge = 'SELLING FAST';
  if (featured) badge = 'FEATURED';
  // NEW if created in last 14 days
  if (ev.created_at) {
    const age = Date.now() - new Date(ev.created_at).getTime();
    if (age < 14 * 24 * 60 * 60 * 1000 && !featured && !sellingFast) {
      badge = 'NEW';
    }
  }

  return {
    id: parseInt(ev.id.replace(/-/g, '').slice(0, 8), 16) % 999999 + 10000,
    slug: ev.slug,
    title: ev.title,
    city: ev.city as any,
    region: ev.region ?? ev.city,
    venue: ev.venue,
    category: (ev.category as any) || 'concert',
    price: minPrice,
    date: ev.date,
    dateLabel: ev.date_label ?? ev.date,
    time: ev.time,
    lat: typeof ev.lat === 'number' && !Number.isNaN(ev.lat) ? ev.lat : 5.6037,
    lng: typeof ev.lng === 'number' && !Number.isNaN(ev.lng) ? ev.lng : -0.187,
    area: ev.area ?? null,
    image:
      ev.image_url ??
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=80&auto=format&fit=crop',
    hot,
    recurring: false,
    badge,
    attending: 0,
    listingType: ev.listing_type === 'listed' ? 'listed' : 'hosted',
    ticketUrl: ev.ticket_url ?? null,
    ticketSource: ev.ticket_source ?? null,
    sourceUrl: ev.source_url ?? null,
    isFeatured: featured,
    featuredOrder: ev.featured_order ?? 100,
    promoVideoUrl: ev.promo_video_url ?? null,
    createdAt: ev.created_at ?? null,
  };
}

const SELECT =
  '*, ticket_tiers(*)';

export async function fetchPublishedEvents(): Promise<SupabaseEvent[]> {
  try {
    const supabase = getServerClient();
    const { data, error } = await supabase
      .from('events')
      .select(SELECT)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('fetchPublishedEvents error:', error.message);
      return [];
    }
    return (data ?? []) as SupabaseEvent[];
  } catch (err) {
    console.error('fetchPublishedEvents exception:', err);
    return [];
  }
}

export async function fetchEventBySlug(slug: string): Promise<SupabaseEvent | null> {
  try {
    const supabase = getServerClient();
    const { data, error } = await supabase
      .from('events')
      .select(SELECT)
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();

    if (error) {
      console.error('fetchEventBySlug error:', error.message);
      return null;
    }
    return data as SupabaseEvent | null;
  } catch (err) {
    console.error('fetchEventBySlug exception:', err);
    return null;
  }
}
