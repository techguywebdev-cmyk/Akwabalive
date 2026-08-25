import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import EventsClient from '@/components/events/EventsClient';
import { events as staticEvents } from '@/lib/data/events';
import { fetchPublishedEvents, supabaseToGhanaEvent } from '@/lib/supabase/events';
import { sortNewestFirst } from '@/lib/events/rank';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Events in Ghana 2025 — Akwaaba',
  description: 'Browse all events across Accra, Kumasi, Cape Coast, Tamale and more.',
};

export default async function EventsPage() {
  const supabaseEvents = await fetchPublishedEvents();
  const dynamicEvents = supabaseEvents.map(supabaseToGhanaEvent);

  // New + featured DB events first, then static catalogue
  const allEvents = sortNewestFirst([
    ...dynamicEvents,
    ...staticEvents.map((e) => ({
      ...e,
      createdAt: e.createdAt ?? null,
      isFeatured: e.isFeatured ?? false,
    })),
  ]);

  return (
    <div style={{ background: '#0D0B08', minHeight: '100vh' }}>
      <Nav active="Events" />
      <main style={{ paddingTop: 62 }}>
        <EventsClient events={allEvents} />
      </main>
      <Footer />
    </div>
  );
}
