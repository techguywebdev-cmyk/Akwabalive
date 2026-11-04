import { isScheduler } from '@/lib/cronAuth';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminClient } from '@/lib/payments/fulfill';
import { watchEvents } from '@/lib/watch/watcher';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const maxDuration = 60;

/**
 * Keeps upcoming events fresh: reads each event's official website and the Ghana press (Google News + RSS)
 * for new line-up names. Official sites and stories from two different outlets are applied; single stories wait for review.
 * Auth: Bearer $CRON_SECRET (scheduled runs) or the signed-in admin.
 */
export async function GET(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  let ok = isScheduler(token);
  if (!ok && token) {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const { data } = await sb.auth.getUser(token);
    ok = !!data?.user && data.user.id === process.env.INGEST_ORGANIZER_ID;
  }
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  const result = await watchEvents(db, { max: Number(new URL(req.url).searchParams.get('max')) || 60 });
  return NextResponse.json(result);
}
