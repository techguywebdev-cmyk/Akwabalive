import { NextResponse } from 'next/server';

export const runtime = 'edge';

const PRIVATE = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?$|.*\.local$|.*\.internal$)/i;

/**
 * A flyer served from our own domain so the page can read its colours
 * (browsers won't let a page read pixels from most ticket sites' images).
 * Images only, up to 8 MB, public hosts only.
 */
export async function GET(req: Request) {
  const src = new URL(req.url).searchParams.get('src') ?? '';
  let u: URL;
  try { u = new URL(src); } catch { return NextResponse.json({ error: 'bad src' }, { status: 400 }); }
  if (!/^https?:$/.test(u.protocol) || PRIVATE.test(u.hostname)) return NextResponse.json({ error: 'not allowed' }, { status: 400 });
  const r = await fetch(u.toString(), { headers: { accept: 'image/*' } }).catch(() => null);
  if (!r || !r.ok) return new NextResponse(null, { status: 404 });
  const type = r.headers.get('content-type') ?? '';
  const size = Number(r.headers.get('content-length') ?? 0);
  if (!type.startsWith('image/') || size > 8_000_000) return new NextResponse(null, { status: 415 });
  return new NextResponse(r.body, { headers: { 'content-type': type, 'cache-control': 'public, max-age=86400, s-maxage=2592000' } });
}
