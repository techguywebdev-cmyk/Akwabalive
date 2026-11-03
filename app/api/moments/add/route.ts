import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { artists } from '@/lib/data/artists';
import { categorize } from '@/lib/moments/categorize';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
const ARTIST_NAMES = new Set(artists.map((a) => norm(a.name)));
const isArtist = (name: string | null) => !!name && ARTIST_NAMES.has(norm(name).replace(/(official|music|vevo|tv)$/, ''));

/** Admin: add a moment from a YouTube or X link (for videos the finder can't reach, like posts on X) */
export async function POST(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!, service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data: who } = await anon.auth.getUser(token);
  if (!who?.user || who.user.id !== process.env.INGEST_ORGANIZER_ID || !service) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const link = String(body.url ?? '').trim();
  const eventName = String(body.event_name ?? '').trim();
  const year = Number(body.year) || null;
  if (!link || !eventName) return NextResponse.json({ error: 'Add a link and the show name' }, { status: 400 });

  const yt = link.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/);
  const x = link.match(/(?:x|twitter)\.com\/([^/?#]+)\/status\/(\d+)/);
  if (!yt && !x) return NextResponse.json({ error: 'That isn’t a YouTube or X video link' }, { status: 400 });

  let row: Record<string, unknown>;
  if (yt) {
    const o = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${yt[1]}`)}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    row = {
      youtube_id: yt[1], source: 'youtube', source_url: `https://www.youtube.com/watch?v=${yt[1]}`,
      title: String(body.title || o?.title || eventName).slice(0, 140), channel_name: o?.author_name ?? null, channel_url: o?.author_url ?? null,
      official: isArtist(o?.author_name ?? null),
    };
  } else {
    const id = x![2];
    const o = await fetch(`https://publish.twitter.com/oembed?omit_script=1&url=${encodeURIComponent(`https://x.com/${x![1]}/status/${id}`)}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    // The post's time is inside its id (X "snowflake" ids)
    const postedAt = new Date(Number(BigInt(id) >> BigInt(22)) + 1288834974657).toISOString();
    const handle = x![1];
    row = {
      youtube_id: `x-${id}`, source: 'x', source_url: `https://x.com/${handle}/status/${id}`,
      title: String(body.title || eventName).slice(0, 140), channel_name: o?.author_name ?? `@${handle}`, channel_url: `https://x.com/${handle}`,
      official: isArtist(o?.author_name ?? handle), published_at: postedAt,
    };
  }
  const db = createClient(url, service, { auth: { persistSession: false } });
  const { data: dupe } = await db.from('moments').select('id').eq('youtube_id', row.youtube_id).limit(1);
  if (dupe?.length) return NextResponse.json({ error: 'That video is already in Moments' }, { status: 409 });
  const { data, error } = await db.from('moments').insert({
    ...row, event_name: eventName, year: year ?? (row.published_at ? new Date(String(row.published_at)).getFullYear() : null),
    description: body.description ? String(body.description).slice(0, 600) : null, event_slug: null, is_featured: false,
    available: true, status: 'live', found_by: 'manual', source_checked_at: new Date().toISOString(),
    category: categorize({ title: String(row.title), event_name: eventName, found_by: 'manual' }),
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
