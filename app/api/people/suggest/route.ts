import { isHiddenPerson } from '@/lib/hiddenPeople';
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/payments/fulfill';

export const dynamic = 'force-dynamic';

type Suggestion = { id: string; username: string; name: string; avatar: string | null; reason: string };

/**
 * People to follow, for the signed-in user, best first:
 * people who follow you (and you don’t follow back), people going to the same events (public plans only), then new members.
 * GET /api/people/suggest — Authorization: Bearer <access token>
 */
export async function GET(req: Request) {
  const db = getAdminClient();
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  if (!db || !token) return NextResponse.json({ people: [] });
  const { data: auth } = await db.auth.getUser(token);
  const me = auth?.user;
  if (!me) return NextResponse.json({ people: [] }, { status: 401 });

  const [{ data: mine }, { data: fans }, { data: plans }] = await Promise.all([
    db.from('follows').select('following_id').eq('follower_id', me.id).limit(2000),
    db.from('follows').select('follower_id').eq('following_id', me.id).limit(500),
    db.from('event_attendance').select('event_slug').eq('user_id', me.id).eq('status', 'going').limit(100),
  ]);
  const skip = new Set<string>([me.id, ...(mine ?? []).map((r: any) => r.following_id)]);
  const reason = new Map<string, { why: string; score: number; top: number }>();
  const add = (id: string, why: string, score: number) => {
    if (skip.has(id)) return;
    const cur = reason.get(id);
    if (!cur) { reason.set(id, { why, score, top: score }); return; }
    cur.score += score; // more shared events = stronger suggestion
    if (score > cur.top) { cur.why = why; cur.top = score; }
  };

  (fans ?? []).forEach((r: any) => add(r.follower_id, 'Follows you', 100));

  const slugs = (plans ?? []).map((p: any) => p.event_slug);
  if (slugs.length) {
    const { data: also } = await db.from('event_attendance').select('user_id, event_slug').in('event_slug', slugs).eq('status', 'going').eq('is_public', true).limit(500);
    const { data: evs } = await db.from('events').select('slug, title').in('slug', slugs);
    const title = new Map((evs ?? []).map((e: any) => [e.slug, e.title]));
    (also ?? []).forEach((r: any) => add(r.user_id, `Also going to ${title.get(r.event_slug) ?? 'an event you’re going to'}`, 10));
  }

  if (reason.size < 12) {
    const { data: recent } = await db.from('profiles').select('id').eq('is_public', true).order('created_at', { ascending: false }).limit(30);
    (recent ?? []).forEach((r: any) => { if (!reason.has(r.id)) add(r.id, 'New on Tsacoal', 1); });
  }

  const ids = Array.from(reason.entries()).sort((a, b) => b[1].score - a[1].score).slice(0, 20).map(([id]) => id);
  if (!ids.length) return NextResponse.json({ people: [] });
  const { data: profiles } = await db.from('profiles').select('id, username, full_name, avatar_url').in('id', ids);
  const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  const people: Suggestion[] = ids.map((id) => byId.get(id)).filter((p: any) => p?.username && !isHiddenPerson(p.username)).map((p: any) => ({
    id: p.id, username: p.username, name: p.full_name?.trim() || p.username, avatar: p.avatar_url, reason: reason.get(p.id)!.why,
  }));
  return NextResponse.json({ people }, { headers: { 'cache-control': 'private, max-age=30' } });
}
