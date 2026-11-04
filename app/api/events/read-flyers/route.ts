import { isScheduler } from '@/lib/cronAuth';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminClient } from '@/lib/payments/fulfill';
import { readMissingFlyers } from '@/lib/watch/ocrServer';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const maxDuration = 60;

/**
 * Reads the text on event flyers (OCR) so event pages can show contacts, dress code, gate price and so on.
 * A few flyers per run; scheduled every 2 hours and run from "Check now".
 * Auth: Bearer $CRON_SECRET or the signed-in admin for the full batch; otherwise a small batch.
 */
export async function GET(req: Request) {
  // Health check: reads our own BHIM flyer (fixed file, nothing saved) so we can see OCR works on the server
  if (new URL(req.url).searchParams.get('probe') === '1') {
    const { createWorker } = await import('tesseract.js');
    const w = await createWorker('eng', 1, { cachePath: '/tmp/tesseract' });
    try {
      const r = await fetch(new URL('/flyers/bhim-fest-2026.jpg', req.url));
      const text = (await w.recognize(Buffer.from(await r.arrayBuffer()))).data.text ?? '';
      return NextResponse.json({ ok: true, chars: text.length, sample: text.replace(/\s+/g, ' ').slice(0, 120) });
    } finally { await w.terminate(); }
  }
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  let ok = isScheduler(token);
  if (!ok && token) {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const { data } = await sb.auth.getUser(token);
    ok = !!data?.user && data.user.id === process.env.INGEST_ORGANIZER_ID;
  }
  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  // Anyone may nudge a small batch (it only reads our own events' flyers, nothing is taken from the request);
  // scheduled runs and the admin get the full batch
  const result = await readMissingFlyers(db, ok ? {} : { max: 3, budgetMs: 40_000 });
  return NextResponse.json(ok ? result : { read: result.read.length, left: result.left });
}
