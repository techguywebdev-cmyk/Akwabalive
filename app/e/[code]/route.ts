import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/** Short links: tsacoal.com/e/<code> opens the event's page (the code an organiser picked, or the event's own slug) */
export async function GET(req: Request, { params }: { params: { code: string } }) {
  const code = decodeURIComponent(params.code || '').toLowerCase().trim();
  const home = new URL('/events', req.url);
  if (!/^[a-z0-9-]{2,120}$/.test(code)) return NextResponse.redirect(home, 307);
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data } = await db.from('events').select('slug').eq('status', 'published').or(`short_code.eq.${code},slug.eq.${code}`).limit(1).maybeSingle();
  if (!data) return NextResponse.redirect(home, 307);
  const to = new URL(`/events/${data.slug}`, req.url);
  new URL(req.url).searchParams.forEach((v, k) => to.searchParams.set(k, v));
  return NextResponse.redirect(to, 307);
}
