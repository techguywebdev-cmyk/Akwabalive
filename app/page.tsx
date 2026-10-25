import EventsPage from './events/page';

// The events page is the home page for now (the separate home design is kept in
// components/home/HomeV2.tsx for later).
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export const metadata = {
  title: 'Akwaaba — every event in Ghana',
  description: 'Find and book concerts, festivals, nightlife and more across Accra, Kumasi, Cape Coast, Tamale and the rest of Ghana.',
};

export default EventsPage;
