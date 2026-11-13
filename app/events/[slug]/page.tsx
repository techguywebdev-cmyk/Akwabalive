import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { pageFaqs } from '@/lib/events/page';
import { eventInfo } from '@/lib/events/contacts';
import type { OrganiserInfo } from '@/components/events/EventPageSections';
import Footer from '@/components/layout/Footer';
import EventDetailClient from '@/components/events/EventDetailClient';
import { events as staticEvents } from '@/lib/data/events';
import { fetchEventBySlug, supabaseToGhanaEvent } from '@/lib/supabase/events';
import type { GhanaEvent } from '@/lib/types';
import { shareMeta } from '@/lib/og';
import { momentsForEvent } from '@/lib/moments/match';
import type { Moment } from '@/components/moments/types';
import { parseDay, shortDay } from '@/lib/dates';
import { JsonLd, eventJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { getArtistBySlug } from '@/lib/data/artists';

// Event pages are kept for a minute and refreshed in the background, so they open instantly (and can be prefetched)
export const revalidate = 60;
const FRESH = 60;
/** Built the first time someone opens each event, then served from cache */
export async function generateStaticParams() { return []; }

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const staticEvent = staticEvents.find(e => e.slug === params.slug);
  if (staticEvent) {
    return {
      title: staticEvent.title,
      description: `${staticEvent.dateLabel} · ${staticEvent.venue} · ${staticEvent.price === 0 ? 'Free entry' : `From ₵${staticEvent.price}`}`,
    };
  }
  const dbEvent = await fetchEventBySlug(params.slug, FRESH);
  if (dbEvent) {
    const e = supabaseToGhanaEvent(dbEvent);
    const price = e.priceUnknown ? 'Tickets on TsaCoal' : e.price === 0 ? 'Free entry' : `From GH₵ ${e.price.toLocaleString()}`;
    const who = (e.lineup ?? []).slice(0, 4).join(', ');
    // Not personalised by ?by=: reading searchParams here makes the cached page dynamic and it 500s
    const meta = shareMeta({
      title: e.title,
      description: [[parseDay(e.date) ? shortDay(parseDay(e.date)!) : e.dateLabel, e.time && !/tba/i.test(e.time) ? e.time : ''].filter(Boolean).join(', '), e.venue, price].filter(Boolean).join(' · ') + (who ? `. With ${who}.` : ''),
      image: `/events/${e.slug}/card?format=og&v=4`,
      path: `/events/${e.slug}`,
    });
    // In search results: what people type ("tidal rave 2026 tickets"); share previews keep the plain name
    const city = e.city ? e.city.charAt(0).toUpperCase() + e.city.slice(1) : 'Ghana';
    const long = `${e.title}: Tickets, Date & Line-up`;
    return { ...meta, title: long.length <= 58 ? long : e.title.length <= 46 ? `${e.title} · ${city} Tickets` : e.title };
  }
  return { title: 'Event not found', robots: { index: false } };
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
        <JsonLd data={eventJsonLd(staticEvent)} />
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

  // The organiser: their profile, contacts and their other shows (for the organiser block and past editions)
  let organiser: OrganiserInfo | null = null;
  if (dbEvent.organizer_id && dbEvent.organizer_id !== process.env.INGEST_ORGANIZER_ID) {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (url && key) {
        const sb = createClient(url, key, { global: { fetch: (i, o) => fetch(i, { ...o, next: { revalidate: FRESH } }) } });
        const [{ data: org }, { data: theirs }] = await Promise.all([
          sb.from('profiles').select('id, username, full_name, avatar_url, bio, instagram, whatsapp, website').eq('id', dbEvent.organizer_id).maybeSingle(),
          sb.from('events').select('slug, title, date, image_url, venue, city').eq('organizer_id', dbEvent.organizer_id).eq('status', 'published').neq('slug', dbEvent.slug).order('date', { ascending: false }).limit(40),
        ]);
        if (org) {
          event = { ...event, organizerId: org.id, organizerUsername: org.username, organizerName: org.full_name, organizerAvatar: org.avatar_url };
          const today = new Date().toISOString().slice(0, 10);
          const shows = (theirs ?? []).map((x) => ({ slug: x.slug, title: x.title, date: String(x.date).slice(0, 10), image: x.image_url, venue: x.venue, city: x.city }));
          organiser = {
            id: org.id, username: org.username, name: org.full_name || org.username, avatar: org.avatar_url, bio: org.bio,
            instagram: org.instagram, whatsapp: org.whatsapp, website: org.website,
            upcoming: shows.filter((x) => x.date >= today).reverse().slice(0, 10),
            past: shows.filter((x) => x.date < today).slice(0, 10),
            hosted: shows.length + 1,
          };
        }
      }
    } catch {
      // non-fatal
    }
  }

  const seriesMomentId = await findSeriesMoment(event);
  const related: GhanaEvent[] = [];
  const info = eventInfo(event.description, event.listingInfo, event.ticketSource, event.flyerText);
  const faqs = event.page ? pageFaqs(event.page, { dressCode: info.dressCode, age: info.age }) : [];
  const performers = (event.artistSlugs ?? []).map((s) => getArtistBySlug(s)).filter(Boolean).map((a) => ({ name: a!.name, slug: a!.slug }));

  return (
    <div style={{ background: 'transparent', minHeight: '100vh' }}>
      <JsonLd data={[eventJsonLd(event, { performers }), breadcrumbJsonLd([['Events', '/events'], [event.title, `/events/${event.slug}`]]), ...(faqs.length ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }] : [])]} />
      <EventDetailClient event={event} related={related} seriesMomentId={seriesMomentId} organiser={organiser} />
      <Footer />
      <div aria-hidden style={{ height: 'calc(96px + env(safe-area-inset-bottom, 0px))' }} />
    </div>
  );
}
