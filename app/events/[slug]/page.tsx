import { notFound } from 'next/navigation';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import EventDetailClient from '@/components/events/EventDetailClient';
import { events as staticEvents } from '@/lib/data/events';
import { fetchEventBySlug } from '@/lib/supabase/events';
import type { GhanaEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const staticEvent = staticEvents.find(e => e.slug === params.slug);
  if (staticEvent) {
    return {
      title: `${staticEvent.title} — Akwaaba`,
      description: `${staticEvent.dateLabel} · ${staticEvent.venue} · ${staticEvent.price === 0 ? 'Free entry' : `From ₵${staticEvent.price}`}`,
    };
  }
  const dbEvent = await fetchEventBySlug(params.slug);
  if (dbEvent) {
    const minPrice = dbEvent.ticket_tiers?.length > 0
      ? Math.min(...dbEvent.ticket_tiers.map(t => t.price)) : 0;
    return {
      title: `${dbEvent.title} — Akwaaba`,
      description: `${dbEvent.date_label ?? dbEvent.date} · ${dbEvent.venue} · ${minPrice === 0 ? 'Free entry' : `From ₵${minPrice}`}`,
    };
  }
  return { title: 'Event not found — Akwaaba' };
}

function supabaseToGhanaEvent(ev: any): GhanaEvent {
  const minPrice = ev.ticket_tiers?.length > 0
    ? Math.min(...ev.ticket_tiers.map((t: any) => t.price)) : 0;
  return {
    id:        parseInt(ev.id.replace(/-/g, '').slice(0, 8), 16) % 999999 + 10000,
    slug:      ev.slug,
    title:     ev.title,
    city:      ev.city as any,
    region:    ev.region ?? ev.city,
    venue:     ev.venue,
    category:  ev.category as any,
    price:     minPrice,
    date:      ev.date,
    dateLabel: ev.date_label ?? ev.date,
    time:      ev.time,
    lat:       5.6037,
    lng:       -0.187,
    image:     ev.image_url ?? 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=80&auto=format&fit=crop',
    hot:       false,
    recurring: false,
    badge:     ev.category?.toUpperCase() ?? 'EVENT',
    attending: 0,
  };
}

export default async function EventPage({ params }: { params: { slug: string } }) {
  // Try static events first
  const staticEvent = staticEvents.find(e => e.slug === params.slug);
  if (staticEvent) {
    const related = staticEvents
      .filter(e => e.id !== staticEvent.id && (e.city === staticEvent.city || e.category === staticEvent.category))
      .slice(0, 4);
    return (
      <div style={{ background: '#0D0B08', minHeight: '100vh' }}>
        <Nav active="Events" />
        <EventDetailClient event={staticEvent} related={related} />
        <Footer />
      </div>
    );
  }

  // Try Supabase events
  const dbEvent = await fetchEventBySlug(params.slug);
  if (!dbEvent) notFound();

  const event   = supabaseToGhanaEvent(dbEvent);
  const related = staticEvents
    .filter(e => e.city === event.city || e.category === event.category)
    .slice(0, 4);

  return (
    <div style={{ background: '#0D0B08', minHeight: '100vh' }}>
      <Nav active="Events" />
      <EventDetailClient event={event} related={related} />
      <Footer />
    </div>
  );
}
