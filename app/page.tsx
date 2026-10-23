import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import HomeV2 from '@/components/home/HomeV2';
import { events as staticEvents } from '@/lib/data/events';
import { fetchPublishedEvents, supabaseToGhanaEvent } from '@/lib/supabase/events';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const db = await fetchPublishedEvents();
  const seen = new Set<string>();
  const events = [...db.map(supabaseToGhanaEvent), ...staticEvents].filter((e) => (seen.has(e.slug) ? false : (seen.add(e.slug), true)));

  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden' }}>
      <Nav active="Discover" />
      <HomeV2 events={events} />
      <Footer />
    </div>
  );
}
