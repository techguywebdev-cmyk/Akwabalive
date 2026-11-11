import { createClient } from '@supabase/supabase-js';
import { shareMeta, SITE_URL } from '@/lib/og';
import CalendarClient from '@/components/calendars/CalendarClient';

export const revalidate = 60;

/** Public calendars only: private ones stay out of share previews and are read by the owner in the browser */
async function publicCalendar(slug: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const db = createClient(url, key, { global: { fetch: (i, o) => fetch(i, { ...o, next: { revalidate } }) } });
  const { data } = await db.from('calendars').select('title, description, calendar_events(event_slug), profiles(full_name, username)').eq('slug', slug).eq('is_public', true).maybeSingle();
  return data as unknown as { title: string; description: string | null; calendar_events: unknown[]; profiles: { full_name: string | null; username: string | null } | null } | null;
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const c = await publicCalendar(params.slug);
  if (!c) return { title: 'Calendar', robots: { index: false } };
  const who = params.slug.startsWith('akwaaba-') ? 'TsaCoal' : c.profiles?.full_name || c.profiles?.username || 'Someone';
  const n = c.calendar_events?.length ?? 0;
  return shareMeta({
    title: `${c.title} · ${who}’s calendar`,
    description: c.description || `${n} ${n === 1 ? 'show' : 'shows'} ${who} is lining up. Like it, rate it, or make your own on Tsacoal.`,
    image: `${SITE_URL}/c/${params.slug}/opengraph-image`,
    path: `/c/${params.slug}`,
  });
}

export default function CalendarPage({ params }: { params: { slug: string } }) {
  return <CalendarClient slug={params.slug} />;
}
