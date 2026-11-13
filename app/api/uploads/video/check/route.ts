import { NextResponse } from 'next/server';
import { makeTicket } from '@/lib/uploadTicket';
import { presignPut, r2Put, r2Delete, r2Ready, r2PublicBase, startMultipart, presignPart, finishMultipart } from '@/lib/r2';

export const dynamic = 'force-dynamic';

/**
 * Temporary: checks video storage is set up right, without showing any keys.
 * Writes and deletes a tiny test file, and asks storage whether the site may upload to it (CORS).
 */
export async function GET(req: Request) {
  if (!r2Ready()) return NextResponse.json({ ready: false });
  const key = `check/${Date.now()}.txt`;
  const out: Record<string, unknown> = { ready: true, publicBase: r2PublicBase(), accountIdLength: (process.env.R2_ACCOUNT_ID || '').length, accountIdTrimmed: (process.env.R2_ACCOUNT_ID || '') === (process.env.R2_ACCOUNT_ID || '').trim(), bucket: process.env.R2_BUCKET };
  try {
    const put = await r2Put(key, 'ok', 'text/plain');
    out.serverPut = { status: put.status, body: put.ok ? '' : (await put.text()).slice(0, 300) };
    if (put.ok) await r2Delete(key);
  } catch (e) { out.serverPut = { error: String(e) }; }
  try {
    const url = await presignPut(`check/${Date.now()}-b.mp4`, 'video/mp4');
    out.signedHost = new URL(url).host.replace(/^[^.]+/, '<account>');
    const pre = await fetch(url, { method: 'OPTIONS', headers: { Origin: 'https://tsacoal.com', 'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'content-type' } });
    out.preflight = { status: pre.status, allowOrigin: pre.headers.get('access-control-allow-origin'), allowMethods: pre.headers.get('access-control-allow-methods'), allowHeaders: pre.headers.get('access-control-allow-headers'), body: pre.ok ? '' : (await pre.text()).slice(0, 300) };
    const browserPut = await fetch(url, { method: 'PUT', body: 'x', headers: { 'Content-Type': 'video/mp4', Origin: 'https://tsacoal.com' } });
    out.signedPut = { status: browserPut.status, allowOrigin: browserPut.headers.get('access-control-allow-origin'), body: browserPut.ok ? '' : (await browserPut.text()).slice(0, 300) };
  } catch (e) { out.preflight = { error: String(e) }; }
  // The piece-by-piece path, end to end: start, send one piece with its signed link, join, read back, delete
  try {
    const mk = `check/${Date.now()}-m.mp4`;
    const id = await startMultipart(mk, 'video/mp4');
    const partUrl = await presignPart(mk, id, 1);
    // Exactly what a phone's browser does first: ask permission for a PUT with no extra headers
    const pre = await fetch(partUrl, { method: 'OPTIONS', headers: { Origin: 'https://tsacoal.com', 'Access-Control-Request-Method': 'PUT' } });
    const preBody = pre.ok ? '' : (await pre.text()).slice(0, 300);
    const put = await fetch(partUrl, { method: 'PUT', body: 'piece', headers: { Origin: 'https://tsacoal.com' } });
    out.multipart = {
      partPreflight: { status: pre.status, allowOrigin: pre.headers.get('access-control-allow-origin'), allowMethods: pre.headers.get('access-control-allow-methods'), body: preBody },
      partStatus: put.status, partAllowOrigin: put.headers.get('access-control-allow-origin'), partBody: put.ok ? '' : (await put.text()).slice(0, 300),
      partUrlParams: Array.from(new URL(partUrl).searchParams.keys()).join(','),
    };
    await finishMultipart(mk, id, 1);
    const back = await fetch(`${r2PublicBase()}/${mk}`, { cache: 'no-store' });
    out.multipart = { ...(out.multipart as object), joined: true, publicRead: back.status, content: (await back.text()).slice(0, 20) };
    await r2Delete(mk);
  } catch (e) { out.multipart = { ...(out.multipart as object), error: String(e).slice(0, 600) }; }
  // The small-pieces path the phone uses now: send two pieces to this site, join, read back
  try {
    const origin = new URL(req.url).origin;
    const ck = `check/${Date.now()}-c.mp4`, t = makeTicket(ck);
    const a = Buffer.alloc(1024 * 1024, 65), b = Buffer.alloc(1000, 66);
    const t0 = Date.now();
    const r = await Promise.all([a, b].map((buf, n) => fetch(`${origin}/api/uploads/video/chunk?key=${encodeURIComponent(ck)}&n=${n}&t=${encodeURIComponent(t)}`, { method: 'POST', body: buf, headers: { 'Content-Type': 'application/octet-stream' } })));
    const join = await fetch(`${origin}/api/uploads/video`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: ck, ticket: t, chunks: 2 }) });
    const back = await fetch(`${r2PublicBase()}/${ck}`, { cache: 'no-store' });
    const got = Buffer.from(await back.arrayBuffer());
    out.chunked = { pieces: r.map((x) => x.status), pieceBody: r[0].ok ? '' : (await r[0].text()).slice(0, 200), join: join.status, joinBody: join.ok ? '' : (await join.text()).slice(0, 200), bytes: got.length, right: got.length === a.length + b.length && got[0] === 65 && got[got.length - 1] === 66, ms: Date.now() - t0 };
    await r2Delete(ck);
  } catch (e) { out.chunked = { error: String(e).slice(0, 400) }; }
  return NextResponse.json(out);
}
