import { NextResponse } from 'next/server';
import { requestUser } from '@/lib/server/auth';
import { isLive, latestRecording, playbackToken, streamConfigured } from '@/lib/stream/cloudflare';

export const dynamic = 'force-dynamic';

const LOCK_MS = 60_000; // a device counts as watching for 60 s after its last heartbeat

/**
 * Ticket holder: get a private playback link.
 * POST { slug, sessionId, takeover? }
 * → 200 { state: 'live' | 'replay', hls, iframe, expiresAt, tier, replayUntil }
 * → 200 { state: 'not_started' | 'ended' }
 * → 402 { code: 'no_ticket' }   → 409 { code: 'other_device' }
 */
export async function POST(req: Request) {
  const { db, user } = await requestUser(req);
  if (!db) return NextResponse.json({ message: 'Server not configured.' }, { status: 500 });
  if (!user) return NextResponse.json({ code: 'sign_in' }, { status: 401 });
  if (!streamConfigured()) return NextResponse.json({ state: 'not_started', message: 'Streaming isn’t switched on yet.' });

  const { slug, sessionId, takeover } = await req.json().catch(() => ({}));
  if (!slug || !sessionId) return NextResponse.json({ message: 'Bad request.' }, { status: 400 });

  const { data: ev } = await db.from('events').select('id, slug, organizer_id').eq('slug', slug).maybeSingle();
  if (!ev) return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
  const { data: stream } = await db.from('event_streams').select('live_input_uid').eq('event_id', ev.id).maybeSingle();
  if (!stream) return NextResponse.json({ state: 'not_started' });

  const isOrganiser = ev.organizer_id === user.id;
  const { data: tickets } = await db
    .from('tickets')
    .select('id, ticket_tier, replay_until')
    .eq('event_slug', slug).eq('user_id', user.id).eq('kind', 'stream').eq('status', 'active')
    .order('replay_until', { ascending: false, nullsFirst: false });
  const ticket = tickets?.[0];
  if (!ticket && !isOrganiser) return NextResponse.json({ code: 'no_ticket' }, { status: 402 });

  const live = await isLive(stream.live_input_uid).catch(() => false);
  let uid: string | null = null;
  let state: 'live' | 'replay' = 'live';
  if (live) {
    uid = stream.live_input_uid;
  } else {
    const canReplay = isOrganiser || (ticket?.replay_until && new Date(ticket.replay_until).getTime() > Date.now());
    const rec = canReplay ? await latestRecording(stream.live_input_uid).catch(() => null) : null;
    if (!rec) {
      const { data: e2 } = await db.from('events').select('stream_status').eq('id', ev.id).maybeSingle();
      return NextResponse.json({ state: e2?.stream_status === 'ended' ? 'ended' : 'not_started', replayUntil: ticket?.replay_until ?? null });
    }
    uid = rec;
    state = 'replay';
  }

  // One device at a time per ticket
  if (ticket) {
    const { data: lock } = await db.from('stream_viewers').select('session_id, last_seen').eq('ticket_id', ticket.id).maybeSingle();
    const busy = lock && lock.session_id !== sessionId && Date.now() - new Date(lock.last_seen).getTime() < LOCK_MS;
    if (busy && !takeover) return NextResponse.json({ code: 'other_device' }, { status: 409 });
    await db.from('stream_viewers').upsert({ ticket_id: ticket.id, session_id: sessionId, last_seen: new Date().toISOString() });
  }

  const links = await playbackToken(db, uid as string, 3600);
  return NextResponse.json({ state, ...links, tier: ticket?.ticket_tier ?? 'Organiser', replayUntil: ticket?.replay_until ?? null });
}
