import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/payments/fulfill';

export const dynamic = 'force-dynamic';

/**
 * People the signed-in user follows who have a ticket for (or are going to) an event.
 *
 * GET /api/events/friends?slug=<event slug>
 * Headers: Authorization: Bearer <supabase access token>
 *
 * Tickets are private to their owner in the database, so this runs on the server.
 * It only ever returns people the caller follows, and skips anyone who marked
 * their attendance for this event as private.
 */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get('slug');
  if (!slug) return NextResponse.json({ friends: [] }, { status: 400 });

  const db = getAdminClient();
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  if (!db || !token) return NextResponse.json({ friends: [] });

  const { data: auth } = await db.auth.getUser(token);
  const me = auth?.user;
  if (!me) return NextResponse.json({ friends: [] }, { status: 401 });

  const { data: follows } = await db.from('follows').select('following_id').eq('follower_id', me.id).limit(1000);
  const ids = (follows ?? []).map((f: { following_id: string }) => f.following_id);
  if (!ids.length) return NextResponse.json({ friends: [] });

  const [{ data: tickets }, { data: attendance }] = await Promise.all([
    db.from('tickets').select('user_id').eq('event_slug', slug).eq('status', 'active').in('user_id', ids),
    db.from('event_attendance').select('user_id, is_public').eq('event_slug', slug).eq('status', 'going').in('user_id', ids),
  ]);

  const hidden = new Set((attendance ?? []).filter((a: any) => a.is_public === false).map((a: any) => a.user_id));
  const withTicket = new Set((tickets ?? []).map((t: any) => t.user_id).filter((id: string) => !hidden.has(id)));
  const going = new Set((attendance ?? []).filter((a: any) => a.is_public !== false).map((a: any) => a.user_id));
  const all = Array.from(new Set([...Array.from(withTicket), ...Array.from(going)])).slice(0, 24);
  if (!all.length) return NextResponse.json({ friends: [] });

  const { data: profiles } = await db.from('profiles').select('id, username, full_name, avatar_url').in('id', all);
  const friends = (profiles ?? [])
    .map((p: any) => ({ id: p.id, username: p.username, name: p.full_name || p.username, avatar: p.avatar_url, hasTicket: withTicket.has(p.id) }))
    .sort((a, b) => Number(b.hasTicket) - Number(a.hasTicket));

  return NextResponse.json({ friends }, { headers: { 'cache-control': 'private, max-age=60' } });
}
