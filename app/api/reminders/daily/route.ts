import { NextResponse } from 'next/server';
import { isScheduler } from '@/lib/cronAuth';
import { getAdminClient } from '@/lib/payments/fulfill';
import { SITE_URL } from '@/lib/og';
import { sendPushes } from '@/lib/push';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Day-before reminders by email: tomorrow's shows for everyone with a ticket, a "going", a save, or the show in one of
 * their calendars (the email names the calendar and links back to it).
 * Sends through Resend when RESEND_API_KEY and REMINDER_FROM are set (a verified sending domain is needed);
 * until then it only reports who would get one. Each person gets one email per show (reminder_log).
 */
export async function GET(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  if (!isScheduler(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10); // Ghana is on UTC
  const { data: events } = await db.from('events').select('slug, title, venue, time, image_url').eq('status', 'published').eq('date', tomorrow);
  if (!events?.length) return NextResponse.json({ tomorrow, events: 0, people: 0, sent: 0 });
  const slugs = events.map((e) => e.slug);

  const [{ data: t }, { data: g }, { data: s }, { data: done }, { data: ce }] = await Promise.all([
    db.from('tickets').select('user_id, event_slug').eq('status', 'active').in('event_slug', slugs),
    db.from('event_attendance').select('user_id, event_slug').eq('status', 'going').in('event_slug', slugs),
    db.from('dream_events').select('user_id, event_slug').in('event_slug', slugs),
    db.from('reminder_log').select('user_id, event_slug').eq('kind', 'day_before').in('event_slug', slugs),
    db.from('calendar_events').select('event_slug, calendars!inner(owner_id, title, slug)').in('event_slug', slugs),
  ]);
  // Shows in someone's calendar (starter calendars by Tsacoal don't count: they belong to everyone)
  const cal = new Map<string, { title: string; slug: string }>();
  const calRows = ((ce ?? []) as any[]).filter((r) => r.calendars && !String(r.calendars.slug).startsWith('akwaaba-'))
    .map((r) => { cal.set(`${r.calendars.owner_id}|${r.event_slug}`, { title: r.calendars.title, slug: r.calendars.slug }); return { user_id: r.calendars.owner_id, event_slug: r.event_slug }; });
  const sentBefore = new Set((done ?? []).map((r: any) => `${r.user_id}|${r.event_slug}`));
  const want = new Map<string, { user_id: string; event_slug: string; ticket: boolean }>();
  for (const [rows, ticket] of [[calRows, false], [s, false], [g, false], [t, true]] as const) {
    for (const r of (rows ?? []) as any[]) {
      const k = `${r.user_id}|${r.event_slug}`;
      if (!sentBefore.has(k)) want.set(k, { user_id: r.user_id, event_slug: r.event_slug, ticket: ticket || !!want.get(k)?.ticket });
    }
  }
  // App pushes first (free, instant): "X is tomorrow", once per person per show
  const evBySlug = new Map(events.map((e) => [e.slug, e]));
  const { data: pushedBefore } = await db.from('reminder_log').select('user_id, event_slug').eq('kind', 'push_day_before').in('event_slug', slugs);
  const pushedSet = new Set((pushedBefore ?? []).map((r: any) => `${r.user_id}|${r.event_slug}`));
  const pushList = Array.from(want.values()).concat(((done ?? []) as any[]).map((r) => ({ user_id: r.user_id, event_slug: r.event_slug, ticket: false })))
    .filter((w, i, a) => !pushedSet.has(`${w.user_id}|${w.event_slug}`) && a.findIndex((x) => x.user_id === w.user_id && x.event_slug === w.event_slug) === i);
  const pushed = await sendPushes(db, pushList.map((w) => {
    const e = evBySlug.get(w.event_slug)!;
    const time = e.time && !/tba/i.test(e.time) ? ` at ${e.time}` : '';
    return { userId: w.user_id, title: `${e.title} is tomorrow`, body: `${e.venue ?? 'See the details'}${time}. ${w.ticket ? 'Your ticket is in the app.' : 'Bring your people.'}`, url: `/events/${e.slug}`, image: e.image_url };
  }));
  const pushedRows = pushList.filter((w) => pushed.has(w.user_id)).map((w) => ({ user_id: w.user_id, event_slug: w.event_slug, kind: 'push_day_before' }));
  if (pushedRows.length) await db.from('reminder_log').insert(pushedRows);

  const key = process.env.RESEND_API_KEY;
  const from = process.env.REMINDER_FROM; // e.g. "Tsacoal <reminders@yourdomain.com>"
  if (!key || !from) return NextResponse.json({ tomorrow, events: events.length, people: want.size, pushed: pushedRows.length, sent: 0, note: 'Set RESEND_API_KEY and REMINDER_FROM (verified domain) to send' });

  const bySlug = new Map(events.map((e) => [e.slug, e]));
  let sent = 0;
  for (const w of Array.from(want.values()).slice(0, 200)) {
    const { data: u } = await db.auth.admin.getUserById(w.user_id);
    const email = u?.user?.email;
    const e = bySlug.get(w.event_slug);
    if (!email || !e) continue;
    const inCal = cal.get(`${w.user_id}|${w.event_slug}`);
    const url = `${SITE_URL}/${w.ticket ? 'account/tickets' : `events/${e.slug}`}`;
    const time = e.time && !/tba/i.test(e.time) ? ` at ${e.time}` : '';
    const html = `<div style="background:#050606;padding:32px 20px;font-family:Inter,Arial,sans-serif;color:#fff">
      <div style="max-width:480px;margin:0 auto">
        <p style="margin:0;color:#A8F0C6;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase">Tomorrow${time}</p>
        <h1 style="margin:6px 0 4px;font-size:28px;line-height:1.1">${e.title}</h1>
        <p style="margin:0 0 18px;color:rgba(255,255,255,.6);font-size:15px">${e.venue ?? ''}</p>
        ${e.image_url ? `<img src="${e.image_url}" alt="" style="width:100%;border-radius:16px;display:block;margin-bottom:20px">` : ''}
        <a href="${url}" style="display:inline-block;background:#7BE3A8;color:#03130B;font-weight:700;text-decoration:none;padding:14px 22px;border-radius:999px">${w.ticket ? 'Open your ticket' : 'See the details'}</a>
        ${inCal && !w.ticket ? `<p style="margin:18px 0 0;font-size:14px;color:rgba(255,255,255,.7)">It’s on your calendar <a href="${SITE_URL}/c/${inCal.slug}" style="color:#A8F0C6;font-weight:700;text-decoration:none">${inCal.title}</a>.</p>` : ''}
        <p style="margin:24px 0 0;color:rgba(255,255,255,.4);font-size:12px">You’re getting this because you ${w.ticket ? 'have a ticket for' : inCal ? 'added' : 'saved or are going to'} this show on Tsacoal.</p>
      </div></div>`;
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: email, subject: `${e.title} is tomorrow`, html }),
    }).catch(() => null);
    if (r?.ok) { sent++; await db.from('reminder_log').insert({ user_id: w.user_id, event_slug: w.event_slug, kind: 'day_before' }); }
  }
  return NextResponse.json({ tomorrow, events: events.length, people: want.size, pushed: pushedRows.length, sent });
}
