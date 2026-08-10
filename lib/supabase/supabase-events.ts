import { createClient } from '@supabase/supabase-js';

// Server-side client using env vars directly
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
  try {
    const supabase = getServerClient();
    const { data, error } = await supabase
      .from('events')
      .select('*, ticket_tiers(*)')
      .eq('status', 'published')
      .order('date', { ascending: true });

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
      .select('*, ticket_tiers(*)')
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
