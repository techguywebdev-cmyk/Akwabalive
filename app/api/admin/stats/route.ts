import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Private numbers for the TsaCoal admin: who signed up, what people looked at, saved, went to and bought.
 * The caller sends their own sign-in token; only the admin account (checked in the database) gets an answer.
 */
export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !key) return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  if (!token) return NextResponse.json({ error: 'Sign in' }, { status: 401 });

  // Ask the database as this person whether they're the admin
  const asUser = createClient(url, anon, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: isAdmin } = await asUser.rpc('is_akwaaba_admin');
  if (isAdmin !== true) return NextResponse.json({ error: 'Not allowed' }, { status: 403 });

  const db = createClient(url, key, { auth: { persistSession: false } });
  const days = Math.min(90, Math.max(7, Number(new URL(req.url).searchParams.get('days')) || 30));
  const now = Date.now();
  const since = new Date(now - (days - 1) * DAY);
  const sinceIso = iso(since);
  const prevIso = iso(new Date(now - (2 * days - 1) * DAY));
  const sinceTs = `${sinceIso}T00:00:00Z`;
  const prevTs = `${prevIso}T00:00:00Z`;

  const [profiles, views, saves, going, follows, sfollows, alerts, tickets, shares, calendars] = await Promise.all([
    db.from('profiles').select('id, created_at').limit(100000),
    db.from('event_views').select('event_slug, viewer, day, kind').gte('day', prevIso).limit(200000),
    db.from('calendar_events').select('event_slug, added_at').gte('added_at', prevTs).limit(100000),
    db.from('event_attendance').select('event_slug, status, created_at').limit(100000),
    db.from('artist_follows').select('created_at').limit(100000),
    db.from('series_follows').select('created_at').limit(100000),
    db.from('ticket_alerts').select('created_at').limit(100000),
    db.from('tickets').select('event_slug, event_title, quantity, total_paid, status, created_at').limit(100000),
    db.from('share_visits').select('by_username, path, created_at').gte('created_at', prevTs).limit(100000),
    db.from('calendars').select('id, created_at').limit(100000),
  ]);

  type R = { created_at?: string; added_at?: string; day?: string };
  const when = (r: R) => (r.day ?? r.created_at ?? r.added_at ?? '').slice(0, 10);
  const inNow = (r: R) => when(r) >= sinceIso;
  const inPrev = (r: R) => when(r) >= prevIso && when(r) < sinceIso;
  const pair = (rows: R[] | null) => ({ now: (rows ?? []).filter(inNow).length, prev: (rows ?? []).filter(inPrev).length });

  const v = (views.data ?? []) as { event_slug: string; viewer: string; day: string; kind: string }[];
  const pageViews = v.filter((x) => x.kind === 'view');
  const live = (tickets.data ?? []).filter((t) => t.status !== 'void') as { event_slug: string; event_title: string; quantity: number; total_paid: number; created_at: string }[];
  const allFollows = [...(follows.data ?? []), ...(sfollows.data ?? [])] as R[];

  // Day by day for the chart
  const series: { day: string; views: number; visitors: number; saves: number; signups: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = iso(new Date(since.getTime() + i * DAY));
    const dv = pageViews.filter((x) => x.day === d);
    series.push({
      day: d,
      views: dv.length,
      visitors: new Set(dv.map((x) => x.viewer)).size,
      saves: (saves.data ?? []).filter((x) => when(x as R) === d).length,
      signups: (profiles.data ?? []).filter((x) => when(x as R) === d).length,
    });
  }

  // Top events this period: views, saves, going
  const top = new Map<string, { slug: string; views: number; visitors: Set<string>; saves: number; going: number }>();
  const row = (slug: string) => top.get(slug) ?? (top.set(slug, { slug, views: 0, visitors: new Set(), saves: 0, going: 0 }), top.get(slug)!);
  for (const x of pageViews) if (x.day >= sinceIso) { const r = row(x.event_slug); r.views++; r.visitors.add(x.viewer); }
  for (const x of (saves.data ?? []) as { event_slug: string; added_at: string }[]) if (inNow(x)) row(x.event_slug).saves++;
  for (const x of (going.data ?? []) as { event_slug: string; created_at: string }[]) if (inNow(x)) row(x.event_slug).going++;
  const ranked = Array.from(top.values()).sort((a, b) => b.views + b.saves * 5 + b.going * 5 - (a.views + a.saves * 5 + a.going * 5)).slice(0, 12);
  const { data: titles } = ranked.length ? await db.from('events').select('slug, title, date, image_url').in('slug', ranked.map((r) => r.slug)) : { data: [] };
  const t = new Map((titles ?? []).map((e: { slug: string; title: string; date: string; image_url: string | null }) => [e.slug, e]));

  const sharers = new Map<string, number>();
  for (const s of (shares.data ?? []) as { by_username: string; created_at: string }[]) if (inNow(s)) sharers.set(s.by_username, (sharers.get(s.by_username) ?? 0) + 1);

  return NextResponse.json({
    days,
    totals: {
      people: (profiles.data ?? []).length,
      calendars: (calendars.data ?? []).length,
      ticketsSold: live.reduce((n, x) => n + (x.quantity || 1), 0),
      revenue: live.reduce((n, x) => n + Number(x.total_paid || 0), 0),
    },
    period: {
      signups: pair(profiles.data as R[]),
      views: pair(pageViews),
      visitors: { now: new Set(pageViews.filter(inNow).map((x) => x.viewer)).size, prev: new Set(pageViews.filter(inPrev).map((x) => x.viewer)).size },
      impressions: pair(v.filter((x) => x.kind === 'impression')),
      saves: pair(saves.data as R[]),
      going: pair(going.data as R[]),
      follows: pair(allFollows),
      alerts: pair(alerts.data as R[]),
      tickets: pair(live),
      shareVisits: pair(shares.data as R[]),
    },
    series,
    topEvents: ranked.map((r) => ({ slug: r.slug, title: t.get(r.slug)?.title ?? r.slug, date: t.get(r.slug)?.date ?? null, image: t.get(r.slug)?.image_url ?? null, views: r.views, visitors: r.visitors.size, saves: r.saves, going: r.going })),
    topSharers: Array.from(sharers.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([username, visits]) => ({ username, visits })),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
