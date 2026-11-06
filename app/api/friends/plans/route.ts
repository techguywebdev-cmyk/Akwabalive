import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/payments/fulfill';

export const dynamic = 'force-dynamic';

/**
 * Where the people you follow are going: upcoming events with a ticket or a public "going" from someone you follow.
 * GET /api/friends/plans  (Authorization: Bearer <access token>)
 * → { plans: [{ slug, friends: [{ id, username, name, avatar, hasTicket }] }] }, most friends first.
 * Only people the caller follows; private attendance is skipped.
 */
export async function GET(req: Request) {
  const db = getAdminClient();
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  if (!db || !token) return NextResponse.json({ plans: [] });
  const { data: auth } = await db.auth.getUser(token);
  const me = auth?.user;
  if (!me) return NextResponse.json({ plans: [] }, { status: 401 });

  const { data: follows } = await db.from('follows').select('following_id').eq('follower_id', me.id).limit(1000);
  const ids = (follows ?? []).map((f: { following_id: string }) => f.following_id);
  if (!ids.length) return NextResponse.json({ plans: [] });

  const today = new Date().toISOString().slice(0, 10);
  const { data: upcoming } = await db.from('events').select('slug').eq('status', 'published').gte('date', today).limit(2000);
  const live = new Set((upcoming ?? []).map((e: { slug: string }) => e.slug));

  const [{ data: tickets }, { data: attendance }] = await Promise.all([
    db.from('tickets').select('user_id, event_slug').eq('status', 'active').in('user_id', ids).limit(2000),
    db.from('event_attendance').select('user_id, event_slug, is_public').eq('status', 'going').in('user_id', ids).limit(2000),
  ]);
  const hidden = new Set((attendance ?? []).filter((a: any) => a.is_public === false).map((a: any) => `${a.user_id}|${a.event_slug}`));
  const by = new Map<string, Map<string, boolean>>(); // slug → user → has ticket
  const add = (slug: string, uid: string, ticket: boolean) => {
    if (!live.has(slug) || hidden.has(`${uid}|${slug}`)) return;
    const m = by.get(slug) ?? new Map<string, boolean>();
    m.set(uid, (m.get(uid) ?? false) || ticket);
    by.set(slug, m);
  };
  (tickets ?? []).forEach((t: any) => add(t.event_slug, t.user_id, true));
  (attendance ?? []).forEach((a: any) => a.is_public !== false && add(a.event_slug, a.user_id, false));
  if (!by.size) return NextResponse.json({ plans: [] });

  const people = Array.from(new Set(Array.from(by.values()).flatMap((m) => Array.from(m.keys()))));
  const { data: profiles } = await db.from('profiles').select('id, username, full_name, avatar_url').in('id', people);
  const prof = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  const plans = Array.from(by.entries()).map(([slug, m]) => ({
    slug,
    friends: Array.from(m.entries()).filter(([id]) => prof.has(id)).map(([id, hasTicket]) => {
      const p: any = prof.get(id);
      return { id, username: p.username, name: p.full_name || p.username, avatar: p.avatar_url, hasTicket };
    }).sort((a, b) => Number(b.hasTicket) - Number(a.hasTicket)),
  })).filter((p) => p.friends.length).sort((a, b) => b.friends.length - a.friends.length).slice(0, 12);

  return NextResponse.json({ plans }, { headers: { 'cache-control': 'private, max-age=60' } });
}
