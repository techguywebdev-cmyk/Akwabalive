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
 * Auth: Bearer $CRON_SECRET or the signed-in admin.
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
  const cron = process.env.CRON_SECRET;
  let ok = !!cron && token === cron;
  if (!ok && token) {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const { data } = await sb.auth.getUser(token);
    ok = !!data?.user && data.user.id === process.env.INGEST_ORGANIZER_ID;
  }
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  return NextResponse.json(await readMissingFlyers(db));
}
