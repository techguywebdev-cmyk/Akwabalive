import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import EventsClient from '@/components/events/EventsClient';
import { events } from '@/lib/data/events';

export const metadata = {
  title: 'Events in Ghana 2025 — Akwaaba',
  description: 'Browse all events across Accra, Kumasi, Cape Coast, Tamale and more. Filter by city, category, price or proximity.',
};

export default function EventsPage() {
  return (
    <>
      <Nav active="Events" />
      <main className="pt-[62px]">
        <EventsClient events={events} />
      </main>
      <Footer />
    </>
  );
}
