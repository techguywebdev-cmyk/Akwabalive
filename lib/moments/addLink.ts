import type { SupabaseClient } from '@supabase/supabase-js';
import { artists } from '@/lib/data/artists';
import { categorize } from '@/lib/moments/categorize';
import { isOurClip } from '@/lib/r2';

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
const ARTIST_NAMES = new Set(artists.map((a) => norm(a.name)));
const isArtist = (name: string | null) => !!name && ARTIST_NAMES.has(norm(name).replace(/(official|music|vevo|tv)$/, ''));

export type LinkInput = {
  url: string; event_name: string; year?: number | null; title?: string | null; description?: string | null;
  event_slug?: string | null;
  /** Set when an organiser posts it: shown as "From the organiser", always official */
  postedBy?: { id: string; name: string; profileUrl: string | null } | null;
  /** A clip uploaded to TsaCoal instead of a link (organisers only), with its still */
  upload?: { videoUrl: string; posterUrl?: string | null } | null;
};

/** Add a moment from a YouTube or X link. Returns the new id, or an error a person can read. */
export async function addMomentFromLink(db: SupabaseClient, input: LinkInput): Promise<{ id?: string; error?: string; status?: number }> {
  const link = input.url.trim();
  const eventName = input.event_name.trim();
  const up = input.upload;
  if ((!link && !up) || !eventName) return { error: 'Add a link or a clip, and the show name', status: 400 };
  if (up && !isOurClip(up.videoUrl)) return { error: 'That clip isn’t one uploaded to TsaCoal', status: 400 };

  const yt = link.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/);
  const x = link.match(/(?:x|twitter)\.com\/([^/?#]+)\/status\/(\d+)/);
  if (!up && !yt && !x) return { error: 'That isn’t a YouTube or X video link', status: 400 };

  let row: Record<string, unknown>;
  if (up) {
    // An uploaded clip: its own file, played by the browser. The key in its URL keeps it unique.
    const key = up.videoUrl.split('/').pop()!.replace(/\.[a-z0-9]+$/i, '');
    row = {
      youtube_id: `up-${key}`, source: 'upload', source_url: up.videoUrl, thumbnail_url: up.posterUrl ?? null,
      title: String(input.title || eventName).slice(0, 140), published_at: new Date().toISOString(),
    };
  } else if (yt) {
    const o = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${yt[1]}`)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (!o) return { error: 'That YouTube video can’t be played outside YouTube (it may be private or embedding is off)', status: 400 };
    row = {
      youtube_id: yt[1], source: 'youtube', source_url: `https://www.youtube.com/watch?v=${yt[1]}`,
      title: String(input.title || o.title || eventName).slice(0, 140), channel_name: o.author_name ?? null, channel_url: o.author_url ?? null,
      official: isArtist(o.author_name ?? null),
    };
  } else {
    const id = x![2], handle = x![1];
    const o = await fetch(`https://publish.twitter.com/oembed?omit_script=1&url=${encodeURIComponent(`https://x.com/${handle}/status/${id}`)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null);
    // The post's time is inside its id (X "snowflake" ids)
    const postedAt = new Date(Number(BigInt(id) >> BigInt(22)) + 1288834974657).toISOString();
    row = {
      youtube_id: `x-${id}`, source: 'x', source_url: `https://x.com/${handle}/status/${id}`,
      title: String(input.title || eventName).slice(0, 140), channel_name: o?.author_name ?? `@${handle}`, channel_url: `https://x.com/${handle}`,
      official: isArtist(o?.author_name ?? handle), published_at: postedAt,
    };
  }

  const { data: dupe } = await db.from('moments').select('id').eq('youtube_id', row.youtube_id).in('status', ['live', 'pending']).limit(1);
  if (dupe?.length) return { error: 'That video is already in Moments', status: 409 };

  const posted = input.postedBy;
  const { data, error } = await db.from('moments').insert({
    ...row,
    ...(posted ? { channel_name: posted.name, channel_url: posted.profileUrl, official: true, posted_by: posted.id } : {}),
    event_name: eventName, event_slug: input.event_slug ?? null,
    year: input.year ?? (row.published_at ? new Date(String(row.published_at)).getFullYear() : new Date().getFullYear()),
    description: input.description ? String(input.description).trim().slice(0, 600) || null : null, is_featured: false,
    available: true, status: 'live', found_by: posted ? 'organiser' : 'manual', source_checked_at: new Date().toISOString(),
    category: categorize({ title: String(row.title), event_name: eventName, found_by: 'manual' }),
  }).select('id').single();
  if (error) return { error: error.message, status: 500 };
  return { id: data.id };
}
