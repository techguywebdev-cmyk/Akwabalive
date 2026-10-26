import ShowsIndexClient from '@/components/series/ShowsIndexClient';
import { SERIES } from '@/lib/data/series';
import { summarizeSeries, seriesCovers } from '@/lib/data/seriesSummary';
import { loadAllEvents } from '@/lib/data/allEvents';
import { fetchMoments } from '@/lib/moments/server';
import { BRAND_NAME } from '@/lib/theme';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const metadata = {
  title: `Shows — ${BRAND_NAME}`,
  description: 'Rapperholic, Detty Rave, Tidal Rave and the other nights that come back every year — with ratings from people who went.',
};

export default async function ShowsPage() {
  const [events, moments] = await Promise.all([loadAllEvents(), fetchMoments()]);
  const covers = await seriesCovers(events, moments);
  return <ShowsIndexClient series={summarizeSeries(SERIES, events, covers)} />;
}
