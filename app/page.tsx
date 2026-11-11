import EventsPage from './events/page';

// The events page is the home page for now (the separate home design is kept in
// components/home/HomeV2.tsx for later).
export const dynamic = 'force-dynamic';

export const metadata = {
  title: { absolute: 'TsaCoal: Events in Ghana, Concerts, Parties & Tickets' },
  description: 'What’s on in Ghana tonight, this weekend and all of Detty December: concerts, festivals and parties in Accra, Kumasi, Cape Coast and Tamale, with tickets, line-ups and clips.',
  alternates: { canonical: '/' },
};

export default EventsPage;
