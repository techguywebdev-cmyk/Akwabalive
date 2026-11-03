import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { addMomentFromLink } from '@/lib/moments/addLink';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/** Admin: add a moment from a YouTube or X link (for videos the finder can't reach, like posts on X) */
export async function POST(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!, service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data: who } = await anon.auth.getUser(token);
  if (!who?.user || who.user.id !== process.env.INGEST_ORGANIZER_ID || !service) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const db = createClient(url, service, { auth: { persistSession: false } });
  const r = await addMomentFromLink(db, { url: String(body.url ?? ''), event_name: String(body.event_name ?? ''), year: Number(body.year) || null, title: body.title || null, description: body.description || null });
  return r.error ? NextResponse.json({ error: r.error }, { status: r.status ?? 400 }) : NextResponse.json({ ok: true, id: r.id });
}
