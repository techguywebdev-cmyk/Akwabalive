import ShowsIndexClient from '@/components/series/ShowsIndexClient';
import { SERIES } from '@/lib/data/series';
import { summarizeSeries } from '@/lib/data/seriesSummary';
import { loadAllEvents } from '@/lib/data/allEvents';
import { BRAND_NAME } from '@/lib/theme';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const metadata = {
  title: `Shows — ${BRAND_NAME}`,
  description: 'Rapperholic, Detty Rave, Tidal Rave and the other nights that come back every year — with ratings from people who went.',
};

export default async function ShowsPage() {
  const events = await loadAllEvents();
  const list = summarizeSeries(SERIES, events);
  return <ShowsIndexClient series={list} />;
}
