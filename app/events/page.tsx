import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import EventsClient from '@/components/events/EventsClient';
import { events } from '@/lib/data/events';

export const metadata = {
  title: 'Events in Ghana 2025 — Akwaaba',
  description: 'Browse all events across Accra, Kumasi, Cape Coast, Tamale and more.',
};

export default function EventsPage() {
  return (
    <div style={{ background: '#0D0B08', minHeight: '100vh' }}>
      <Nav active="Events" />
      <main style={{ paddingTop: 62 }}>
        <EventsClient events={events} />
      </main>
      <Footer />
    </div>
  );
}
