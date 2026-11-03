import { NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * A small YouTube still served from our own domain, so the page can read its colours
 * (browsers won't let a page read pixels from i.ytimg.com directly).
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return NextResponse.json({ error: 'bad id' }, { status: 400 });
  const r = await fetch(`https://i.ytimg.com/vi/${id}/mqdefault.jpg`);
  if (!r.ok) return new NextResponse(null, { status: 404 });
  return new NextResponse(r.body, {
    headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=604800, s-maxage=2592000, immutable' },
  });
}
