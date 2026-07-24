import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import EventsClient from '@/components/events/EventsClient';
import { events as staticEvents } from '@/lib/data/events';
import { fetchPublishedEvents } from '@/lib/supabase/events';
import type { GhanaEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Events in Ghana 2025 — Akwaaba',
  description: 'Browse all events across Accra, Kumasi, Cape Coast, Tamale and more.',
};

function supabaseToGhanaEvent(ev: any): GhanaEvent {
  const minPrice = ev.ticket_tiers?.length > 0
    ? Math.min(...ev.ticket_tiers.map((t: any) => t.price))
    : 0;

  return {
    id:         parseInt(ev.id.replace(/-/g, '').slice(0, 8), 16) % 999999 + 10000,
    slug:       ev.slug,
    title:      ev.title,
    city:       ev.city as any,
    region:     ev.region ?? ev.city,
    venue:      ev.venue,
    category:   ev.category as any,
    price:      minPrice,
    date:       ev.date,
    dateLabel:  ev.date_label ?? ev.date,
    time:       ev.time,
    lat:        5.6037,
    lng:        -0.187,
    image:      ev.image_url ?? 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=80&auto=format&fit=crop',
    hot:        false,
    recurring:  false,
    badge:      ev.category?.toUpperCase() ?? 'EVENT',
    attending:  0,
  };
}

export default async function EventsPage() {
  const supabaseEvents = await fetchPublishedEvents();
  const dynamicEvents  = supabaseEvents.map(supabaseToGhanaEvent);
  const allEvents      = [...dynamicEvents, ...staticEvents];

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
