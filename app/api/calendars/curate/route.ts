import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isScheduler } from '@/lib/cronAuth';
import { CURATED_RULES, type CurateEvent } from '@/lib/curatedCalendars';

export const dynamic = 'force-dynamic';

/**
 * Daily: keeps TsaCoal's starter calendars true to their names. Adds every upcoming event that fits a calendar's
 * rule and takes off upcoming ones that don't. Past nights are left as they were. ?dry=1 reports without writing.
 */
export async function GET(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  if (!isScheduler(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  const dry = new URL(req.url).searchParams.get('dry') === '1';
  const db = createClient(url, key, { auth: { persistSession: false } });
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: evs }, { data: cals }] = await Promise.all([
    db.from('events').select('slug, title, date, time, venue, area, city, category, description, is_hot, artist_slugs')
      .eq('status', 'published').gte('date', today).order('date').limit(3000),
    db.from('calendars').select('id, slug, calendar_events(event_slug)').in('slug', Object.keys(CURATED_RULES)),
  ]);
  const upcoming = (evs ?? []) as CurateEvent[];
  const isUpcoming = new Set(upcoming.map((e) => e.slug));
  const report: Record<string, { added: string[]; removed: string[] }> = {};

  for (const c of (cals ?? []) as { id: string; slug: string; calendar_events: { event_slug: string }[] }[]) {
    const rule = CURATED_RULES[c.slug];
    const want = new Set(upcoming.filter(rule).map((e) => e.slug));
    const have = new Set(c.calendar_events.map((x) => x.event_slug));
    const add = Array.from(want).filter((s) => !have.has(s));
    const drop = Array.from(have).filter((s) => isUpcoming.has(s) && !want.has(s));
    report[c.slug] = { added: add, removed: drop };
    if (dry) continue;
    if (add.length) await db.from('calendar_events').insert(add.map((s) => ({ calendar_id: c.id, event_slug: s })));
    if (drop.length) await db.from('calendar_events').delete().eq('calendar_id', c.id).in('event_slug', drop);
    if (add.length || drop.length) await db.from('calendars').update({ updated_at: new Date().toISOString() }).eq('id', c.id);
  }
  return NextResponse.json({ dry, report });
}
