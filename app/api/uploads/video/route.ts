import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createWriteStream } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { r2Get, r2Put, r2Delete, r2Ready, r2PublicBase, VIDEO_TYPES, VIDEO_MAX_MB } from '@/lib/r2';
import { makeTicket, checkTicket } from '@/lib/uploadTicket';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

/** Size of each piece the phone sends (small, so a dropped connection only costs a moment) */
const CHUNK_BYTES = 1024 * 1024;
const MAX_CHUNKS = Math.ceil((VIDEO_MAX_MB * 1024 * 1024) / CHUNK_BYTES);

async function who(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  if (!token) return null;
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data } = await anon.auth.getUser(token);
  return data?.user ?? null;
}

/**
 * Start uploading one video (a moment or an event's promo video). Signed-in people only.
 * The phone then sends 1 MB pieces to /api/uploads/video/chunk on this same site (several at once,
 * each retried on its own), and finally calls PUT here to join them into one file in storage.
 */
export async function POST(req: Request) {
  if (!r2Ready()) return NextResponse.json({ error: 'Video uploads aren’t switched on yet' }, { status: 503 });
  const user = await who(req);
  if (!user) return NextResponse.json({ error: 'Sign in to upload' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const type = String(body.type || '');
  const size = Number(body.size) || 0;
  const kind = body.kind === 'promo' ? 'promo' : 'moments';
  const ext = VIDEO_TYPES[type];
  if (!ext) return NextResponse.json({ error: 'Use an MP4, MOV or WebM video' }, { status: 400 });
  if (!size || size > VIDEO_MAX_MB * 1024 * 1024) return NextResponse.json({ error: `Keep it under ${VIDEO_MAX_MB} MB` }, { status: 400 });
  const key = `${kind}/${user.id}/${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  return NextResponse.json({ key, ticket: makeTicket(key), chunkSize: CHUNK_BYTES, chunks: Math.ceil(size / CHUNK_BYTES), publicUrl: `${r2PublicBase()}/${key}` });
}

/** All pieces are in: join them, in order, into the one file, then tidy the pieces away */
export async function PUT(req: Request) {
  if (!r2Ready()) return NextResponse.json({ error: 'Video uploads aren’t switched on yet' }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const key = String(body.key || ''), chunks = Number(body.chunks) || 0;
  if (!checkTicket(key, String(body.ticket || ''))) return NextResponse.json({ error: 'That upload has expired. Pick the video again.' }, { status: 403 });
  if (!chunks || chunks > MAX_CHUNKS) return NextResponse.json({ error: 'That upload is incomplete. Try again.' }, { status: 400 });

  const dir = await mkdtemp(path.join(tmpdir(), 'join-'));
  const file = path.join(dir, 'joined');
  try {
    const out = createWriteStream(file);
    const missing: number[] = [];
    // Fetch a few pieces at a time, write them in order
    for (let i = 0; i < chunks; i += 8) {
      const batch = await Promise.all(Array.from({ length: Math.min(8, chunks - i) }, (_, j) => r2Get(`${key}.parts/${i + j}`).then(async (r) => (r.ok ? Buffer.from(await r.arrayBuffer()) : null))));
      batch.forEach((b, j) => { if (!b) missing.push(i + j); else out.write(b); });
      if (missing.length) break;
    }
    await new Promise<void>((resolve, reject) => out.end((e?: Error | null) => (e ? reject(e) : resolve())));
    if (missing.length) return NextResponse.json({ error: 'missing', missing }, { status: 409 });
    const put = await r2Put(key, await readFile(file), 'application/octet-stream');
    if (!put.ok) return NextResponse.json({ error: 'Saving the video failed. Try again.' }, { status: 502 });
    await Promise.all(Array.from({ length: chunks }, (_, i) => r2Delete(`${key}.parts/${i}`).catch(() => null)));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('upload join failed', e);
    return NextResponse.json({ error: 'The upload didn’t finish. Try again.' }, { status: 500 });
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => null);
  }
}
