import { NextResponse } from 'next/server';
import { requestUser } from '@/lib/server/auth';
import { createLiveInput, isLive, streamConfigured } from '@/lib/stream/cloudflare';

export const dynamic = 'force-dynamic';

/**
 * Organiser: get (or create on first call) the stream details for one of their events.
 * POST { eventId }  → { rtmpsUrl, streamKey, srtUrl, live }
 */
export async function POST(req: Request) {
  const { db, user } = await requestUser(req);
  if (!db) return NextResponse.json({ message: 'Server not configured.' }, { status: 500 });
  if (!user) return NextResponse.json({ message: 'Please sign in.' }, { status: 401 });
  if (!streamConfigured()) return NextResponse.json({ message: 'Streaming isn’t switched on yet. Add the Cloudflare Stream settings on Vercel.' }, { status: 503 });

  const { eventId } = await req.json().catch(() => ({}));
  if (!eventId) return NextResponse.json({ message: 'Missing event.' }, { status: 400 });

  const { data: ev } = await db.from('events').select('id, title, organizer_id').eq('id', eventId).maybeSingle();
  if (!ev || ev.organizer_id !== user.id) return NextResponse.json({ message: 'Only the organiser can set up streaming.' }, { status: 403 });

  let { data: row } = await db.from('event_streams').select('*').eq('event_id', ev.id).maybeSingle();
  if (!row) {
    try {
      const input = await createLiveInput(ev.title);
      const insert = {
        event_id: ev.id,
        live_input_uid: input.uid,
        rtmps_url: input.rtmps.url,
        stream_key: input.rtmps.streamKey,
        srt_url: input.srt ? `${input.srt.url}?streamid=${input.srt.streamId}&passphrase=${input.srt.passphrase}` : null,
      };
      const { error } = await db.from('event_streams').insert(insert);
      if (error) throw new Error(error.message);
      row = insert as any;
    } catch (e: any) {
      return NextResponse.json({ message: `Couldn’t create the stream: ${e?.message || 'unknown error'}` }, { status: 502 });
    }
  }
  await db.from('events').update({ stream_enabled: true }).eq('id', ev.id);

  const live = await isLive(row!.live_input_uid).catch(() => false);
  return NextResponse.json({ rtmpsUrl: row!.rtmps_url, streamKey: row!.stream_key, srtUrl: row!.srt_url, live });
}
