import { NextResponse } from 'next/server';
import { requestUser } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

/**
 * Home page "friends are going": the events most of the people you follow are going to.
 * GET, Authorization: Bearer <token> → { items: [{ slug, count, friends: [{ id, username, name, avatar }] }] }
 * Only people you follow, only public RSVPs.
 */
export async function GET(req: Request) {
  const { db, user } = await requestUser(req);
  if (!db || !user) return NextResponse.json({ items: [] });

  const { data: follows } = await db.from('follows').select('following_id').eq('follower_id', user.id).limit(1000);
  const ids = (follows ?? []).map((f: { following_id: string }) => f.following_id);
  if (!ids.length) return NextResponse.json({ items: [] });

  const { data: rows } = await db
    .from('event_attendance')
    .select('user_id, event_slug')
    .in('user_id', ids).eq('status', 'going').eq('is_public', true)
    .limit(2000);

  const bySlug = new Map<string, string[]>();
  for (const r of rows ?? []) {
    const list = bySlug.get(r.event_slug) ?? [];
    list.push(r.user_id);
    bySlug.set(r.event_slug, list);
  }
  const top = Array.from(bySlug.entries()).sort((a, b) => b[1].length - a[1].length).slice(0, 6);
  const people = Array.from(new Set(top.flatMap(([, u]) => u.slice(0, 5))));
  const { data: profiles } = people.length
    ? await db.from('profiles').select('id, username, full_name, avatar_url').in('id', people)
    : { data: [] as any[] };
  const byId = new Map((profiles ?? []).map((p: any) => [p.id, { id: p.id, username: p.username, name: p.full_name || p.username, avatar: p.avatar_url }]));

  const items = top.map(([slug, users]) => ({
    slug,
    count: users.length,
    friends: users.slice(0, 5).map((id) => byId.get(id)).filter(Boolean),
  }));
  return NextResponse.json({ items }, { headers: { 'cache-control': 'private, max-age=60' } });
}
