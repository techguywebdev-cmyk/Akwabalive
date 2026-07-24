import { createClient } from './client';

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
  ticket_tiers: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    quantity: number;
    sold: number;
  }[];
}

export async function fetchPublishedEvents(): Promise<SupabaseEvent[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('events')
    .select('*, ticket_tiers(*)')
    .eq('status', 'published')
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching events:', error);
    return [];
  }
  return (data ?? []) as SupabaseEvent[];
}

export async function fetchEventBySlug(slug: string): Promise<SupabaseEvent | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('events')
    .select('*, ticket_tiers(*)')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  return data as SupabaseEvent | null;
}
