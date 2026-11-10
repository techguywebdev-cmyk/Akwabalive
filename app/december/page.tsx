import { createClient } from '@supabase/supabase-js';
import { fetchEventsBetween, supabaseToGhanaEvent } from '@/lib/supabase/events';
import { artistsForEvent } from '@/lib/data/artists';
import { shareMeta } from '@/lib/og';
import { hiRes } from '@/lib/events/image';
import { linkTentpoles, EXPECTED } from '@/lib/data/tentpoles';
import DecemberClient, { type DecEvent, type DecPole } from '@/components/december/DecemberClient';

export const revalidate = 300;

const FROM = '2026-12-15';
const TO = '2027-01-05';

export async function generateMetadata() {
  const rows = await fetchEventsBetween(FROM, TO);
  const top = rows.find((r) => r.is_hot && r.image_url) ?? rows.find((r) => r.image_url);
  return shareMeta({
    title: 'Detty December 2026 in Accra',
    description: `${rows.length} concerts, festivals and parties from 15 December to 5 January: the big shows, day by day, all on Tsacoal.`,
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
  const season = (await fetchEventsBetween('2026-11-01', TO)).map(supabaseToGhanaEvent);
  const c = await counts(season.filter((e) => e.date >= '2026-11-14').map((e) => e.slug)).catch(() => ({} as Record<string, { seen: number; going: number }>));
  const scored = season.map((e) => {
    const stars = artistsForEvent(e).length;
    const n = c[e.slug] ?? { seen: 0, going: 0 };
    // What makes a show big: flagged hot or featured, known names on the bill, real interest
    const score = (e.hot ? 60 : 0) + (e.isFeatured ? 50 : 0) + Math.min(stars, 5) * 12 + Math.min(n.seen, 500) / 5 + n.going * 2 + (e.highlight ? 6 : 0);
    return { event: e, seen: n.seen, going: n.going, score };
  });
  const list: DecEvent[] = scored.filter((x) => x.event.image && x.event.date >= FROM);

  // The big nights: our checked picks, expected shows once they're listed, and the biggest listings on Tsacoal
  const ref = (e: (typeof season)[number]) => ({ slug: e.slug, image: e.image ?? null, venue: e.venue ?? null, going: c[e.slug]?.going ?? 0 });
  const picked = linkTentpoles(season);
  const used = new Set(picked.map((p) => p.event?.slug).filter(Boolean) as string[]);
  const poles: DecPole[] = picked.map(({ match: _m, source: _s, event, ...t }) => ({ ...t, event: event ? ref(event) : null }));
  const expected = EXPECTED.filter((x) => {
    const e = season.find((ev) => x.match.test(ev.title) && ev.date >= '2026-11-14' && ev.image);
    if (!e) return true;
    used.add(e.slug);
    poles.push({ date: e.date, title: x.title, artist: x.artist, blurb: e.highlight || x.when, venue: e.venue ?? undefined, event: ref(e) });
    return false;
  }).map(({ match: _m, ...x }) => x);
  const night = (cat: string) => !['business', 'faith', 'tech', 'wellness', 'sports'].includes(cat);
  scored
    .filter((x) => x.event.image && x.event.date >= '2026-11-14' && !used.has(x.event.slug) && night(x.event.category) && x.score >= 36)
    .sort((a, b) => b.score - a.score).slice(0, 6)
    .forEach(({ event: e }) => {
      const names = artistsForEvent(e).slice(0, 3).map((a) => a.name);
      poles.push({ date: e.date, title: e.title, blurb: e.highlight || (names.length ? `With ${names.join(', ')}` : ''), venue: e.venue ?? undefined, event: ref(e) });
    });
  poles.sort((a, b) => a.date.localeCompare(b.date));
  return <DecemberClient list={list} poles={poles} expected={expected} from={FROM} to={TO} />;
}
