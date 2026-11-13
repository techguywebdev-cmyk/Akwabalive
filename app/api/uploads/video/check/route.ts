import { NextResponse } from 'next/server';
import { presignPut, r2Put, r2Delete, r2Ready, r2PublicBase, startMultipart, presignPart, finishMultipart } from '@/lib/r2';

export const dynamic = 'force-dynamic';

/**
 * Temporary: checks video storage is set up right, without showing any keys.
 * Writes and deletes a tiny test file, and asks storage whether the site may upload to it (CORS).
 */
export async function GET() {
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
  return NextResponse.json(out);
}
