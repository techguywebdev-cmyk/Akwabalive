import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import EventDetailClient from '@/components/events/EventDetailClient';
import { events as staticEvents } from '@/lib/data/events';
import { fetchEventBySlug, supabaseToGhanaEvent } from '@/lib/supabase/events';
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
    const mapped = supabaseToGhanaEvent(dbEvent);
    return {
      title: `${mapped.title} — Akwaaba`,
      description: `${mapped.dateLabel} · ${mapped.venue} · ${mapped.price === 0 ? 'Free entry' : `From ₵${mapped.price}`}`,
    };
  }
  return { title: 'Event not found — Akwaaba' };
}

async function findSeriesMoment(title: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const series = title
    .toLowerCase()
    .replace(/\b(20)?\d{2}\b/g, '')
    .replace(/\b(kumasi|accra|live|concert|festival|edition|the)\b/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 3)[0];

  if (!series) return null;

  try {
    const supabase = createClient(url, key);
    const { data } = await supabase
      .from('moments')
      .select('id')
      .or(`event_name.ilike.%${series}%,title.ilike.%${series}%,event_slug.ilike.%${series}%`)
      .order('year', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

export default async function EventPage({ params }: { params: { slug: string } }) {
  const staticEvent = staticEvents.find(e => e.slug === params.slug);
  if (staticEvent) {
    const related = staticEvents
      .filter(e => e.id !== staticEvent.id && (e.city === staticEvent.city || e.category === staticEvent.category))
      .slice(0, 4);
    const seriesMomentId = await findSeriesMoment(staticEvent.title);
    return (
      <div style={{ background: '#0D0B08', minHeight: '100vh' }}>
        <Nav active="Events" />
        <EventDetailClient event={staticEvent} related={related} seriesMomentId={seriesMomentId} />
        <Footer />
      </div>
    );
  }

  const dbEvent = await fetchEventBySlug(params.slug);
  if (!dbEvent) notFound();

  const event = supabaseToGhanaEvent(dbEvent);
  const related = staticEvents
    .filter(e => e.city === event.city || e.category === event.category)
    .slice(0, 4);
  const seriesMomentId = await findSeriesMoment(event.title);

  return (
    <div style={{ background: '#0D0B08', minHeight: '100vh' }}>
      <Nav active="Events" />
      <EventDetailClient event={event} related={related} seriesMomentId={seriesMomentId} />
      <Footer />
    </div>
  );
}
