import { isScheduler } from '@/lib/cronAuth';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminClient } from '@/lib/payments/fulfill';
import { fillListingInfo } from '@/lib/ingest/fillListingInfo';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const maxDuration = 60;

/**
 * Reads each listed event's ticket page for its dial code, organiser contacts, dress code and so on (Info & contact).
 * Auth: Bearer $CRON_SECRET / FRESHNESS_KEY or the signed-in admin for the full batch; otherwise a small batch
 * (it only re-reads our own events' ticket pages, nothing is taken from the request).
 */
export async function GET(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  let ok = isScheduler(token);
  if (!ok && token) {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const { data } = await sb.auth.getUser(token);
    ok = !!data?.user && data.user.id === process.env.INGEST_ORGANIZER_ID;
  }
  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  const r = await fillListingInfo(db, ok ? {} : { max: 6 });
  return NextResponse.json(ok ? r : { checked: r.checked, read: r.done.length });
}
