import { createClient } from '@supabase/supabase-js';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import HomeV2 from '@/components/home/HomeV2';
import type { Moment } from '@/components/moments/types';
import { events as staticEvents } from '@/lib/data/events';
import { fetchPublishedEvents, supabaseToGhanaEvent } from '@/lib/supabase/events';

export const dynamic = 'force-dynamic';

async function fetchMoments(): Promise<Moment[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const { data } = await createClient(url, key)
      .from('moments')
      .select('id, title, event_name, event_slug, youtube_id, description, year, is_featured, view_count, like_count')
      .order('is_featured', { ascending: false })
      .order('year', { ascending: false })
      .limit(12);
    return (data ?? []) as Moment[];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [db, moments] = await Promise.all([fetchPublishedEvents(), fetchMoments()]);
  const seen = new Set<string>();
  const events = [...db.map(supabaseToGhanaEvent), ...staticEvents].filter((e) => (seen.has(e.slug) ? false : (seen.add(e.slug), true)));

  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden' }}>
      <Nav active="Discover" />
      <HomeV2 events={events} moments={moments} />
      <Footer />
    </div>
  );
}
