import { isScheduler } from '@/lib/cronAuth';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminClient } from '@/lib/payments/fulfill';
import { scanCampus } from '@/lib/watch/campus';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const maxDuration = 60;

/**
 * Campus nights: reads the press, campus radio and Google News for SRC weeks, hall weeks and artiste nights,
 * and saves new stories as leads on the review page. Auth: Bearer $CRON_SECRET / FRESHNESS_KEY, or the signed-in admin.
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
  return NextResponse.json(await scanCampus(db));
}
