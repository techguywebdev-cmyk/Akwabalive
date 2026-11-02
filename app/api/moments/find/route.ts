import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { findOfficialVideos } from '@/lib/moments/finder';
import { confirmPerformers } from '@/lib/moments/performers';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const maxDuration = 60;

/** Daily cron (Vercel sends Authorization: Bearer $CRON_SECRET): a big round */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const finder = await findOfficialVideos({ resolve: 15, scan: 20, search: 8 });
  const performers = await confirmPerformers(150).catch(() => null);
  return NextResponse.json({ ...finder, performers });
}

/** "Find official videos now" from the admin page: a bigger round than the background one */
export async function POST(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data } = await sb.auth.getUser(token);
  if (!data?.user || data.user.id !== process.env.INGEST_ORGANIZER_ID) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const result = await findOfficialVideos({ resolve: 12, scan: 15, search: 6 });
  return NextResponse.json(result);
}
