import { NextResponse } from 'next/server';
import { requestUser } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

/**
 * Player keeps its device lock alive every ~30 s.
 * POST { slug, sessionId } → { ok } or { kicked: true } when another device took over.
 */
export async function POST(req: Request) {
  const { db, user } = await requestUser(req);
  if (!db || !user) return NextResponse.json({ ok: false }, { status: 401 });
  const { slug, sessionId } = await req.json().catch(() => ({}));
  if (!slug || !sessionId) return NextResponse.json({ ok: false }, { status: 400 });

  const { data: tickets } = await db.from('tickets').select('id').eq('event_slug', slug).eq('user_id', user.id).eq('kind', 'stream').eq('status', 'active');
  const ids = (tickets ?? []).map((t: { id: string }) => t.id);
  if (!ids.length) return NextResponse.json({ ok: true }); // organiser

  const { data: locks } = await db.from('stream_viewers').select('ticket_id, session_id').in('ticket_id', ids);
  const mine = (locks ?? []).find((l: any) => l.session_id === sessionId);
  if (!mine) return NextResponse.json({ kicked: true });
  await db.from('stream_viewers').update({ last_seen: new Date().toISOString() }).eq('ticket_id', mine.ticket_id).eq('session_id', sessionId);
  return NextResponse.json({ ok: true });
}
