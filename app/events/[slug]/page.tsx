import { notFound } from 'next/navigation';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import EventDetailClient from '@/components/events/EventDetailClient';
import { events } from '@/lib/data/events';

export async function generateStaticParams() {
  return events.map(e => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  const event = events.find(e => e.slug === params.slug);
  if (!event) return { title: 'Event not found — Akwaaba' };
  return {
    title: `${event.title} — Akwaaba`,
    description: `${event.dateLabel} · ${event.venue} · ${event.price === 0 ? 'Free entry' : `From ₵${event.price}`}`,
  };
}

export default function EventPage({
  params,
}: {
  params: { slug: string };
}) {
  const event = events.find(e => e.slug === params.slug);
  if (!event) notFound();

  const related = events
    .filter(
      e =>
        e.id !== event.id &&
        (e.city === event.city || e.category === event.category),
    )
    .slice(0, 4);

  return (
    <div style={{ background: '#0D0B08', minHeight: '100vh' }}>
      <Nav active="Events" />
      <EventDetailClient event={event} related={related} />
      <Footer />
    </div>
  );
}
