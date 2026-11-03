import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Footer from '@/components/layout/Footer';
import EventDetailClient from '@/components/events/EventDetailClient';
import { events as staticEvents } from '@/lib/data/events';
import { fetchEventBySlug, fetchPublishedEvents, supabaseToGhanaEvent } from '@/lib/supabase/events';
import type { GhanaEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

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
    .replace(/\b(kumasi|accra|live|concert|festival|edition|the|melbourne|sydney|australia)\b/g, '')
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
      .eq('status', 'live')
      .or(`event_name.ilike.%${series}%,title.ilike.%${series}%,event_slug.ilike.%${series}%`)
      .order('year', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

/** Real upcoming events like this one: same kind of event first, then same city, soonest first */
async function relatedEvents(current: { slug: string; city: string; category: string }): Promise<GhanaEvent[]> {
  const today = new Date().toISOString().slice(0, 10);
  const all = (await fetchPublishedEvents()).map((e) => supabaseToGhanaEvent(e));
  return all
    .filter((e) => e.slug !== current.slug && e.date >= today && e.image)
    .map((e) => ({ e, score: (e.category === current.category ? 2 : 0) + (e.city === current.city ? 1 : 0) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.e.date.localeCompare(b.e.date))
    .slice(0, 8)
    .map((x) => x.e);
}

export default async function EventPage({ params }: { params: { slug: string } }) {
  const staticEvent = staticEvents.find(e => e.slug === params.slug);
  if (staticEvent) {
    const related = await relatedEvents(staticEvent);
    const seriesMomentId = await findSeriesMoment(staticEvent.title);
    return (
      <div style={{ background: 'transparent', minHeight: '100vh' }}>
        <EventDetailClient event={staticEvent} related={related} seriesMomentId={seriesMomentId} />
        <Footer />
        <div aria-hidden style={{ height: 'calc(96px + env(safe-area-inset-bottom, 0px))' }} />
      </div>
    );
  }

  const dbEvent = await fetchEventBySlug(params.slug);
  if (!dbEvent) notFound();

  // Shared mapper — includes promoVideoUrl, isFeatured, listingType, etc.
  let event = supabaseToGhanaEvent(dbEvent);

  // Attach organizer public profile when available
  if (dbEvent.organizer_id && dbEvent.organizer_id !== process.env.INGEST_ORGANIZER_ID) {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (url && key) {
        const sb = createClient(url, key);
        const { data: org } = await sb
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .eq('id', dbEvent.organizer_id)
          .maybeSingle();
        if (org) {
          event = {
            ...event,
            organizerId: org.id,
            organizerUsername: org.username,
            organizerName: org.full_name,
            organizerAvatar: org.avatar_url,
          };
        }
      }
    } catch {
      // non-fatal
    }
  }

  const related = await relatedEvents(event);
  const seriesMomentId = await findSeriesMoment(event.title);

  return (
    <div style={{ background: 'transparent', minHeight: '100vh' }}>
      <EventDetailClient event={event} related={related} seriesMomentId={seriesMomentId} />
      <Footer />
      <div aria-hidden style={{ height: 'calc(96px + env(safe-area-inset-bottom, 0px))' }} />
    </div>
  );
}
