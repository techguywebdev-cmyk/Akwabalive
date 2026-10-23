import { NextResponse } from 'next/server';
import { requestUser } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

/**
 * Post to an event's live chat. Only people with a ticket (stream or in-person)
 * and the organiser can post. Max one message every 3 seconds.
 * POST { slug, body }
 */
export async function POST(req: Request) {
  const { db, user } = await requestUser(req);
  if (!db) return NextResponse.json({ message: 'Server not configured.' }, { status: 500 });
  if (!user) return NextResponse.json({ message: 'Please sign in to chat.' }, { status: 401 });

  const { slug, body } = await req.json().catch(() => ({}));
  const text = String(body || '').replace(/\s+/g, ' ').trim().slice(0, 280);
  if (!slug || !text) return NextResponse.json({ message: 'Say something first.' }, { status: 400 });

  const [{ data: ev }, { data: ticket }, { data: profile }, { data: last }] = await Promise.all([
    db.from('events').select('organizer_id').eq('slug', slug).maybeSingle(),
    db.from('tickets').select('ticket_tier, kind').eq('event_slug', slug).eq('user_id', user.id).eq('status', 'active').limit(1).maybeSingle(),
    db.from('profiles').select('username').eq('id', user.id).maybeSingle(),
    db.from('stream_messages').select('created_at').eq('event_slug', slug).eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const organiser = ev?.organizer_id === user.id;
  if (!ticket && !organiser) return NextResponse.json({ message: 'Get a ticket to join the chat.' }, { status: 403 });
  if (last && Date.now() - new Date(last.created_at).getTime() < 3000) return NextResponse.json({ message: 'Slow down a little.' }, { status: 429 });

  const { error } = await db.from('stream_messages').insert({
    event_slug: slug, user_id: user.id, username: profile?.username ?? 'guest', tier_name: organiser ? 'Organiser' : ticket?.ticket_tier ?? null, body: text,
  });
  if (error) return NextResponse.json({ message: 'Couldn’t send.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
