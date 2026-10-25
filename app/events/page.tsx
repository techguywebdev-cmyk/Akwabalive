import Footer from '@/components/layout/Footer';
import EventsClient from '@/components/events/EventsClient';
import { events as staticEvents } from '@/lib/data/events';
import { fetchPublishedEvents, supabaseToGhanaEvent } from '@/lib/supabase/events';
import { sortNewestFirst } from '@/lib/events/rank';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export const metadata = {
  title: 'Events in Ghana — Akwaaba',
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
    <div style={{ background: 'transparent', minHeight: '100vh' }}>
      <EventsClient events={allEvents} />
      <Footer />
    </div>
  );
}
