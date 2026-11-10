import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Footer from '@/components/layout/Footer';
import EventDetailClient from '@/components/events/EventDetailClient';
import { events as staticEvents } from '@/lib/data/events';
import { fetchEventBySlug, supabaseToGhanaEvent } from '@/lib/supabase/events';
import type { GhanaEvent } from '@/lib/types';
import { shareMeta } from '@/lib/og';
import { momentsForEvent } from '@/lib/moments/match';
import type { Moment } from '@/components/moments/types';
import { parseDay, shortDay } from '@/lib/dates';

// Event pages are kept for a minute and refreshed in the background, so they open instantly (and can be prefetched)
export const revalidate = 60;
const FRESH = 60;
/** Built the first time someone opens each event, then served from cache */
export async function generateStaticParams() { return []; }

export async function generateMetadata({ params, searchParams }: { params: { slug: string }; searchParams?: { by?: string } }) {
  const staticEvent = staticEvents.find(e => e.slug === params.slug);
  if (staticEvent) {
    return {
      title: `${staticEvent.title} — Tsacoal`,
      description: `${staticEvent.dateLabel} · ${staticEvent.venue} · ${staticEvent.price === 0 ? 'Free entry' : `From ₵${staticEvent.price}`}`,
    };
  }
  const dbEvent = await fetchEventBySlug(params.slug, FRESH);
  if (dbEvent) {
    const e = supabaseToGhanaEvent(dbEvent);
    const price = e.priceUnknown ? 'Tickets on Tsacoal' : e.price === 0 ? 'Free entry' : `From GH₵ ${e.price.toLocaleString()}`;
    const who = (e.lineup ?? []).slice(0, 4).join(', ');
    // Shared by someone: their name on the preview card
    const by = searchParams?.by?.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 40) || null;
    return shareMeta({
      title: e.title,
      description: [[parseDay(e.date) ? shortDay(parseDay(e.date)!) : e.dateLabel, e.time && !/tba/i.test(e.time) ? e.time : ''].filter(Boolean).join(', '), e.venue, price].filter(Boolean).join(' · ') + (who ? `. With ${who}.` : ''),
      image: `/events/${e.slug}/card?format=og${by ? `&u=${by}` : ''}`,
      path: `/events/${e.slug}`,
    });
  }
  return { title: 'Event not found — Tsacoal' };
}

/** The latest clip from an earlier edition of the same series (same rules as the feed), for "Watch the last edition" */
async function findSeriesMoment(event: { slug: string; title: string }): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const supabase = createClient(url, key, { global: { fetch: (i, o) => fetch(i, { ...o, next: { revalidate: FRESH } }) } });
    const { data } = await supabase.from('moments').select('id, event_name, event_slug, year, title, youtube_id').eq('status', 'live').order('year', { ascending: false }).limit(600);
    return momentsForEvent(event, (data ?? []) as unknown as Moment[])[0]?.id ?? null;
  } catch {
    return null;
  }
}

export default async function EventPage({ params }: { params: { slug: string } }) {
  const staticEvent = staticEvents.find(e => e.slug === params.slug);
  if (staticEvent) {
    const seriesMomentId = await findSeriesMoment(staticEvent);
    const related: GhanaEvent[] = [];
    return (
      <div style={{ background: 'transparent', minHeight: '100vh' }}>
        <EventDetailClient event={staticEvent} related={related} seriesMomentId={seriesMomentId} />
        <Footer />
        <div aria-hidden style={{ height: 'calc(96px + env(safe-area-inset-bottom, 0px))' }} />
      </div>
    );
  }

  const dbEvent = await fetchEventBySlug(params.slug, FRESH);
  if (!dbEvent) notFound();

  // Shared mapper — includes promoVideoUrl, isFeatured, listingType, etc.
  let event = supabaseToGhanaEvent(dbEvent);

  // Attach organizer public profile when available
  if (dbEvent.organizer_id && dbEvent.organizer_id !== process.env.INGEST_ORGANIZER_ID) {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (url && key) {
        const sb = createClient(url, key, { global: { fetch: (i, o) => fetch(i, { ...o, next: { revalidate: FRESH } }) } });
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

  const seriesMomentId = await findSeriesMoment(event);
  const related: GhanaEvent[] = [];

  return (
    <div style={{ background: 'transparent', minHeight: '100vh' }}>
      <EventDetailClient event={event} related={related} seriesMomentId={seriesMomentId} />
      <Footer />
      <div aria-hidden style={{ height: 'calc(96px + env(safe-area-inset-bottom, 0px))' }} />
    </div>
  );
}
