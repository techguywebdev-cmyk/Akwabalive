import { notFound } from 'next/navigation';
import LiveClient from '@/components/stream/LiveClient';
import { events as staticEvents } from '@/lib/data/events';
import { fetchEventBySlug, supabaseToGhanaEvent } from '@/lib/supabase/events';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const db = await fetchEventBySlug(params.slug);
  const title = db?.title ?? staticEvents.find((e) => e.slug === params.slug)?.title ?? 'Live';
  return { title: `Watch ${title} live — Akwaaba` };
}

/** Ticket-gated livestream for one event. */
export default async function LivePage({ params }: { params: { slug: string } }) {
  const db = await fetchEventBySlug(params.slug);
  const event = db ? supabaseToGhanaEvent(db) : staticEvents.find((e) => e.slug === params.slug);
  if (!event) notFound();
  return <LiveClient event={event} />;
}
