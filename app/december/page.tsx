import { createClient } from '@supabase/supabase-js';
import { fetchEventsBetween, supabaseToGhanaEvent } from '@/lib/supabase/events';
import { artistsForEvent } from '@/lib/data/artists';
import { shareMeta } from '@/lib/og';
import { hiRes } from '@/lib/events/image';
import DecemberClient, { type DecEvent } from '@/components/december/DecemberClient';

export const revalidate = 300;

const FROM = '2026-12-15';
const TO = '2027-01-05';

export async function generateMetadata() {
  const rows = await fetchEventsBetween(FROM, TO);
  const top = rows.find((r) => r.is_hot && r.image_url) ?? rows.find((r) => r.image_url);
  return shareMeta({
    title: 'Detty December 2026 in Accra',
    description: `${rows.length} concerts, festivals and parties from 15 December to 5 January: the big shows, day by day, all on Akwaaba.`,
    image: top?.image_url ? hiRes(top.image_url, 1200) ?? top.image_url : null,
    path: '/december',
  });
}

/** Real interest for ranking: people who saw it this week and who's going */
async function counts(slugs: string[]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !slugs.length) return {} as Record<string, { seen: number; going: number }>;
  const db = createClient(url, key, { global: { fetch: (i, o) => fetch(i, { ...o, next: { revalidate } }) } });
  const out: Record<string, { seen: number; going: number }> = {};
  for (let i = 0; i < slugs.length; i += 60) {
    const { data } = await db.rpc('event_counts', { p_slugs: slugs.slice(i, i + 60) });
    for (const r of (data ?? []) as { event_slug: string; seen_7d: number; going: number }[]) out[r.event_slug] = { seen: Number(r.seen_7d), going: Number(r.going) };
  }
  return out;
}

export default async function DecemberPage() {
  const events = (await fetchEventsBetween(FROM, TO)).map(supabaseToGhanaEvent).filter((e) => e.image);
  const c = await counts(events.map((e) => e.slug)).catch(() => ({} as Record<string, { seen: number; going: number }>));
  const list: DecEvent[] = events.map((e) => {
    const stars = artistsForEvent(e).length;
    const n = c[e.slug] ?? { seen: 0, going: 0 };
    // What makes a December show big: flagged hot or featured, known names on the bill, real interest
    const score = (e.hot ? 60 : 0) + (e.isFeatured ? 50 : 0) + Math.min(stars, 5) * 12 + Math.min(n.seen, 500) / 5 + n.going * 2 + (e.highlight ? 6 : 0);
    return { event: e, seen: n.seen, going: n.going, score };
  });
  return <DecemberClient list={list} from={FROM} to={TO} />;
}
