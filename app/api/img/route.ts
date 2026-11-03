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
  const declared = r.headers.get('content-type') ?? '';
  if (Number(r.headers.get('content-length') ?? 0) > 8_000_000) return new NextResponse(null, { status: 413 });
  const buf = new Uint8Array(await r.arrayBuffer());
  if (buf.byteLength > 8_000_000) return new NextResponse(null, { status: 413 });
  // Some hosts (AllEvents) send images as octet-stream: trust the file's own signature instead
  const type = declared.startsWith('image/') ? declared : sniff(buf);
  if (!type) return new NextResponse(null, { status: 415 });
  return new NextResponse(buf, { headers: { 'content-type': type, 'cache-control': 'public, max-age=86400, s-maxage=2592000' } });
}

function sniff(b: Uint8Array): string | null {
  const at = (i: number, bytes: number[]) => bytes.every((v, j) => b[i + j] === v);
  if (at(0, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (at(0, [0x89, 0x50, 0x4e, 0x47])) return 'image/png';
  if (at(0, [0x47, 0x49, 0x46, 0x38])) return 'image/gif';
  if (at(0, [0x52, 0x49, 0x46, 0x46]) && at(8, [0x57, 0x45, 0x42, 0x50])) return 'image/webp';
  if (at(4, [0x66, 0x74, 0x79, 0x70])) return 'image/avif';
  return null;
}
