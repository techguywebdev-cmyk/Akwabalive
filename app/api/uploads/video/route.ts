import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { presignPut, r2Ready, r2PublicBase, VIDEO_TYPES, VIDEO_MAX_MB } from '@/lib/r2';

export const dynamic = 'force-dynamic';

/**
 * Ask for an upload link for one short clip (a moment or an event's promo video).
 * Signed-in people only. The browser then PUTs the file straight to R2 and keeps the public URL.
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
  return NextResponse.json({ uploadUrl: await presignPut(key, type), publicUrl: `${r2PublicBase()}/${key}`, key });
}
