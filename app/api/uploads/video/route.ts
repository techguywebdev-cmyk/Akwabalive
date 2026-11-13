import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { r2Ready, r2PublicBase, startMultipart, presignPart, finishMultipart, VIDEO_TYPES, VIDEO_MAX_MB, PART_MB } from '@/lib/r2';

export const dynamic = 'force-dynamic';

/**
 * Start uploading one video (a moment or an event's promo video). Signed-in people only.
 * The file goes up in 5 MB pieces, each straight to R2 with its own link, so a dropped connection
 * only means retrying one piece. Then `PUT` here (with the same token) joins them.
 */
export async function POST(req: Request) {
  if (!r2Ready()) return NextResponse.json({ error: 'Video uploads aren’t switched on yet' }, { status: 503 });
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  if (!token) return NextResponse.json({ error: 'Sign in to upload' }, { status: 401 });
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data: who } = await anon.auth.getUser(token);
  if (!who?.user) return NextResponse.json({ error: 'Sign in to upload' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const type = String(body.type || '');
  const size = Number(body.size) || 0;
  const kind = body.kind === 'promo' ? 'promo' : 'moments';
  const ext = VIDEO_TYPES[type];
  if (!ext) return NextResponse.json({ error: 'Use an MP4, MOV or WebM video' }, { status: 400 });
  if (!size || size > VIDEO_MAX_MB * 1024 * 1024) return NextResponse.json({ error: `Keep it under ${VIDEO_MAX_MB} MB` }, { status: 400 });

  const key = `${kind}/${who.user.id}/${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const partSize = PART_MB * 1024 * 1024;
  const count = Math.max(1, Math.ceil(size / partSize));
  try {
    const uploadId = await startMultipart(key, type);
    const urls = await Promise.all(Array.from({ length: count }, (_, i) => presignPart(key, uploadId, i + 1)));
    return NextResponse.json({ key, uploadId, partSize, urls, publicUrl: `${r2PublicBase()}/${key}` });
  } catch (e) {
    console.error('upload start failed', e);
    return NextResponse.json({ error: 'Couldn’t start the upload. Try again.' }, { status: 502 });
  }
}

/** All pieces are up: join them into the file */
export async function PUT(req: Request) {
  if (!r2Ready()) return NextResponse.json({ error: 'Video uploads aren’t switched on yet' }, { status: 503 });
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data: who } = token ? await anon.auth.getUser(token) : { data: null };
  if (!who?.user) return NextResponse.json({ error: 'Sign in to upload' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const key = String(body.key || ''), uploadId = String(body.uploadId || ''), parts = Number(body.parts) || 0;
  if (!key.startsWith(`moments/${who.user.id}/`) && !key.startsWith(`promo/${who.user.id}/`)) return NextResponse.json({ error: 'That upload isn’t yours' }, { status: 403 });
  try {
    await finishMultipart(key, uploadId, parts);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('upload finish failed', e);
    return NextResponse.json({ error: 'The upload didn’t finish. Try again.' }, { status: 502 });
  }
}
