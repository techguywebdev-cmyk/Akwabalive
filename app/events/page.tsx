import Footer from '@/components/layout/Footer';
import EventsClient from '@/components/events/EventsClient';
import { events as staticEvents } from '@/lib/data/events';
import { fetchPublishedEvents, supabaseToGhanaEvent } from '@/lib/supabase/events';
import { sortNewestFirst } from '@/lib/events/rank';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export const metadata = {
  title: 'Events in Ghana: Concerts, Parties & Festivals in Accra and Beyond',
  description: 'Every upcoming event in Ghana by date: concerts, parties, festivals and nightlife in Accra, Kumasi, Cape Coast, Tamale and more. Tickets, prices and line-ups.',
  alternates: { canonical: '/events' },
};

import { JsonLd, eventListJsonLd } from '@/lib/seo';

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
      <JsonLd data={eventListJsonLd('Upcoming events in Ghana', '/events', dynamicEvents.filter((e) => e.date >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.date.localeCompare(b.date)))} />
      <EventsClient events={allEvents} seed={Math.floor(Math.random() * 2 ** 31)} />
      <Footer />
    </div>
  );
}
