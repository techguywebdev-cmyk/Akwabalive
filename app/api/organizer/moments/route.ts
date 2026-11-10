import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { addMomentFromLink } from '@/lib/moments/addLink';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const noStore = { fetch: (i: RequestInfo | URL, init?: RequestInit) => fetch(i, { ...init, cache: 'no-store' }) };

/** The signed-in organiser (anyone with a published event, or the Tsacoal admin), or null */
async function organiser(req: Request): Promise<{ db: SupabaseClient; id: string; name: string; username: string | null } | null> {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!, service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token || !service) return null;
  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data: who } = await anon.auth.getUser(token);
  if (!who?.user) return null;
  const db = createClient(url, service, { auth: { persistSession: false }, global: noStore });
  const admin = who.user.id === process.env.INGEST_ORGANIZER_ID;
  if (!admin) {
    const { count } = await db.from('events').select('id', { count: 'exact', head: true }).eq('organizer_id', who.user.id).eq('status', 'published');
    if (!count) return null;
  }
  const { data: p } = await db.from('profiles').select('full_name, username').eq('id', who.user.id).maybeSingle();
  return { db, id: who.user.id, name: p?.full_name || p?.username || 'Organiser', username: p?.username ?? null };
}

/** The organiser's moments */
export async function GET(req: Request) {
  const o = await organiser(req);
  if (!o) return NextResponse.json({ error: 'Only organisers can post moments' }, { status: 403 });
  const { data } = await o.db.from('moments').select('id, title, event_name, year, youtube_id, source, created_at')
    .eq('posted_by', o.id).eq('status', 'live').order('created_at', { ascending: false }).limit(50);
  return NextResponse.json({ moments: data ?? [] });
}

/** Post a moment: a YouTube or X link for one of their own past events, or another show they put on */
export async function POST(req: Request) {
  const o = await organiser(req);
  if (!o) return NextResponse.json({ error: 'Only organisers can post moments' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  let eventName = String(body.event_name ?? '').trim();
  let year = Number(body.year) || null;
  let slug: string | null = null;
  if (body.event_id) {
    const { data: ev } = await o.db.from('events').select('slug, title, date, organizer_id').eq('id', body.event_id).maybeSingle();
    if (!ev || ev.organizer_id !== o.id) return NextResponse.json({ error: 'That event isn’t yours' }, { status: 403 });
    if (ev.date && String(ev.date).slice(0, 10) > new Date().toISOString().slice(0, 10)) return NextResponse.json({ error: 'Post moments once the event has happened' }, { status: 400 });
    slug = ev.slug;
    eventName = String(ev.title).replace(/\s*\b(19|20)\d{2}\b\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
    year = ev.date ? Number(String(ev.date).slice(0, 4)) : year;
  }
  const r = await addMomentFromLink(o.db, {
    url: String(body.url ?? ''), event_name: eventName, year, title: body.title || null, description: body.description || null, event_slug: slug,
    postedBy: { id: o.id, name: o.name, profileUrl: o.username ? `/organizer/${o.username}` : null },
  });
  return r.error ? NextResponse.json({ error: r.error }, { status: r.status ?? 400 }) : NextResponse.json({ ok: true, id: r.id });
}

/** Take one of their moments down (hidden, not deleted) */
export async function DELETE(req: Request) {
  const o = await organiser(req);
  if (!o) return NextResponse.json({ error: 'Only organisers can post moments' }, { status: 403 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const { error } = await o.db.from('moments').update({ status: 'rejected' }).eq('id', id).eq('posted_by', o.id);
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
}
