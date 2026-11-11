import EventsPage from '../events/page';

// The home page at its own address, for sharing on X and elsewhere: a fresh link that apps
// haven't cached a preview for. Kept out of search so it doesn't compete with the home page.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export const metadata = {
  title: { absolute: 'TsaCoal | Ghana, after dark' },
  description: 'Every concert, rave, pool party and gospel night in one place. Find the show, save it, bring your people.',
  alternates: { canonical: '/launch' },
  robots: { index: false, follow: true },
};

export default EventsPage;
