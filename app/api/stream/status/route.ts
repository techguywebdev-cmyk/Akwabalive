import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/payments/fulfill';
import { isLive, streamConfigured } from '@/lib/stream/cloudflare';

export const dynamic = 'force-dynamic';

/**
 * Public: is an event's stream live? Also keeps events.stream_status in step
 * (idle → live → ended) so lists and badges can read it without calling Cloudflare.
 * GET ?slug=
 */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get('slug');
  const db = getAdminClient();
  if (!slug || !db || !streamConfigured()) return NextResponse.json({ status: 'idle' });

  const { data: ev } = await db.from('events').select('id, stream_status, stream_started_at').eq('slug', slug).maybeSingle();
  if (!ev) return NextResponse.json({ status: 'idle' });
  const { data: row } = await db.from('event_streams').select('live_input_uid').eq('event_id', ev.id).maybeSingle();
  if (!row) return NextResponse.json({ status: ev.stream_status || 'idle' });

  const live = await isLive(row.live_input_uid).catch(() => ev.stream_status === 'live');
  let status = ev.stream_status || 'idle';
  if (live && status !== 'live') {
    status = 'live';
    await db.from('events').update({ stream_status: 'live', stream_started_at: ev.stream_started_at ?? new Date().toISOString() }).eq('id', ev.id);
  } else if (!live && status === 'live') {
    status = 'ended';
    await db.from('events').update({ stream_status: 'ended' }).eq('id', ev.id);
  }
  return NextResponse.json({ status, startedAt: ev.stream_started_at }, { headers: { 'cache-control': 'public, max-age=10' } });
}
