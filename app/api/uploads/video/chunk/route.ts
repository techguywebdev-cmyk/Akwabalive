import { NextResponse } from 'next/server';
import { r2Put, r2Ready } from '@/lib/r2';
import { checkTicket } from '@/lib/uploadTicket';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * One 1 MB piece of a video upload, sent to this site (which every phone already reaches) and kept
 * in storage until the upload is joined. Sending the same piece twice is harmless.
 */
export async function POST(req: Request) {
  if (!r2Ready()) return NextResponse.json({ error: 'off' }, { status: 503 });
  const u = new URL(req.url);
  const key = u.searchParams.get('key') || '', n = Number(u.searchParams.get('n'));
  if (!checkTicket(key, u.searchParams.get('t') || '')) return NextResponse.json({ error: 'expired' }, { status: 403 });
  if (!Number.isInteger(n) || n < 0 || n > 400) return NextResponse.json({ error: 'bad piece' }, { status: 400 });
  const buf = Buffer.from(await req.arrayBuffer());
  if (!buf.length || buf.length > 1024 * 1024 + 1024) return NextResponse.json({ error: 'bad size' }, { status: 400 });
  const put = await r2Put(`${key}.parts/${n}`, buf, 'application/octet-stream');
  if (put.ok) console.log('upload piece', key, n, buf.length); else console.error('upload piece store failed', key, n, put.status, (await put.text()).slice(0, 200));
  return put.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'store failed' }, { status: 502 });
}
