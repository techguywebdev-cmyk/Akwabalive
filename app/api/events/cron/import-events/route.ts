import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runImport } from '@/lib/ingest/importSources';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const maxDuration = 60;

/**
 * Imports upcoming Ghana events from ticket sites into the review queue.
 * Runs daily from Vercel Cron, or on demand from the review page.
 *
 * Auth: Authorization: Bearer $CRON_SECRET (Vercel Cron sends this), ?secret=$CRON_SECRET,
 * or a signed-in user whose id is INGEST_ORGANIZER_ID (the reviewer).
 * Query: ?dry=1 (read and report, save nothing), ?only=Egotickets, ?max=20
 */
export async function GET(req: Request) { return run(req); }
export async function POST(req: Request) { return run(req); }

async function authorized(req: Request) {
  const url = new URL(req.url);
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  const cron = process.env.CRON_SECRET;
  if (cron && (token === cron || url.searchParams.get('secret') === cron)) return true;
  const reviewer = process.env.INGEST_ORGANIZER_ID;
  if (!token || !reviewer) return false;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data } = await sb.auth.getUser(token);
  return data?.user?.id === reviewer;
}

async function run(req: Request) {
  if (!(await authorized(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!process.env.INGEST_SECRET) return NextResponse.json({ error: 'INGEST_SECRET is not set' }, { status: 500 });

  const q = new URL(req.url).searchParams;
  try {
    const report = await runImport({
      dryRun: q.get('dry') === '1',
      only: q.get('only') ?? undefined,
      max: q.get('max') ? Number(q.get('max')) : undefined,
    });
    return NextResponse.json({ ok: true, ...report });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'import failed' }, { status: 500 });
  }
}
