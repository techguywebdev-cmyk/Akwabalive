import { NextResponse } from 'next/server';
import { isScheduler } from '@/lib/cronAuth';
import { getAdminClient } from '@/lib/payments/fulfill';
import { sendPushes, type Push } from '@/lib/push';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DIAL = /\*\s?\d{2,4}(?:\s?\*\s?\d{1,6})+\s?#/;

/**
 * App alerts, run daily (8:40, before the 9:00 reminders; Vercel Hobby crons run once a day):
 * - Tickets out: people who asked for a ticket alert on a show, once it has a way to buy (a link, a dial code or tiers on sale).
 * - New show: people who follow an artist, when a show with that artist is added (once per person per show).
 */
export async function GET(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  if (!isScheduler(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  const today = new Date().toISOString().slice(0, 10);

  // Tickets out
  const { data: waiting } = await db.from('ticket_alerts').select('user_id, event_slug').is('notified_at', null).limit(1000);
  const wSlugs = Array.from(new Set((waiting ?? []).map((w) => w.event_slug)));
  const { data: wEvents } = wSlugs.length
    ? await db.from('events').select('slug, title, venue, date, image_url, ticket_url, ticket_source, description, ticket_tiers(is_available)').in('slug', wSlugs).eq('status', 'published').gte('date', today)
    : { data: [] as any[] };
  const onSale = new Map(((wEvents ?? []) as any[]).filter((e) => e.ticket_url || DIAL.test(`${e.ticket_source ?? ''} ${e.description ?? ''}`) || (e.ticket_tiers ?? []).some((t: any) => t.is_available)).map((e) => [e.slug, e]));
  const ticketPushes: Push[] = (waiting ?? []).filter((w) => onSale.has(w.event_slug)).map((w) => {
    const e = onSale.get(w.event_slug);
    const dial = `${e.ticket_source ?? ''} ${e.description ?? ''}`.match(DIAL)?.[0]?.replace(/\s+/g, '');
    return { userId: w.user_id, title: `Tickets are out: ${e.title}`, body: dial ? `Dial ${dial} or tap to get yours.` : 'Tap to get yours before they go.', url: `/events/${e.slug}`, image: e.image_url };
  });
  const gotTickets = await sendPushes(db, ticketPushes);
  for (const w of (waiting ?? []).filter((x) => onSale.has(x.event_slug) && gotTickets.has(x.user_id))) {
    await db.from('ticket_alerts').update({ notified_at: new Date().toISOString() }).eq('user_id', w.user_id).eq('event_slug', w.event_slug);
  }

  // New shows from artists people follow (added in the last 3 days)
  const since = new Date(Date.now() - 3 * 86400000).toISOString();
  const { data: fresh } = await db.from('events').select('slug, title, venue, date, image_url, artist_slugs').eq('status', 'published').gte('date', today).gte('created_at', since).not('artist_slugs', 'is', null);
  const artists = Array.from(new Set(((fresh ?? []) as any[]).flatMap((e) => e.artist_slugs ?? [])));
  const { data: follows } = artists.length ? await db.from('artist_follows').select('user_id, artist_slug').in('artist_slug', artists) : { data: [] as any[] };
  const { data: told } = (fresh ?? []).length ? await db.from('reminder_log').select('user_id, event_slug').eq('kind', 'push_new_show').in('event_slug', (fresh ?? []).map((e: any) => e.slug)) : { data: [] as any[] };
  const toldSet = new Set(((told ?? []) as any[]).map((r) => `${r.user_id}|${r.event_slug}`));
  const showPushes: (Push & { slug: string })[] = [];
  for (const e of (fresh ?? []) as any[]) {
    for (const f of ((follows ?? []) as any[]).filter((f) => (e.artist_slugs ?? []).includes(f.artist_slug))) {
      const k = `${f.user_id}|${e.slug}`;
      if (toldSet.has(k) || showPushes.some((p) => p.userId === f.user_id && p.slug === e.slug)) continue;
      const d = new Date(`${e.date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      showPushes.push({ userId: f.user_id, slug: e.slug, title: `New show: ${e.title}`, body: `${d}${e.venue ? ` · ${e.venue}` : ''}. Save it before your people do.`, url: `/events/${e.slug}`, image: e.image_url });
    }
  }
  const gotShows = await sendPushes(db, showPushes);
  const logRows = showPushes.filter((p) => gotShows.has(p.userId)).map((p) => ({ user_id: p.userId, event_slug: p.slug, kind: 'push_new_show' }));
  if (logRows.length) await db.from('reminder_log').insert(logRows);

  return NextResponse.json({ ticketAlerts: { waiting: waiting?.length ?? 0, onSale: ticketPushes.length, pushed: gotTickets.size }, newShows: { events: fresh?.length ?? 0, pushes: showPushes.length, pushed: gotShows.size } });
}
