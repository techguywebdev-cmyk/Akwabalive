import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { artists } from '@/lib/data/artists';
import { SERIES } from '@/lib/data/series';

/**
 * Finds official videos for Moments automatically:
 *  1. works out each artist's and show's official YouTube channel (YouTube Data API search,
 *     exact name match, most subscribers, at least 10k),
 *  2. reads each channel's latest uploads (cheap: 1 quota unit per channel),
 *  3. keeps live/concert/festival videos (not music videos or lyric videos) and files them as
 *     *pending* moments for the admin to approve.
 * Needs YOUTUBE_API_KEY. Without it, nothing happens.
 */

const API = 'https://www.googleapis.com/youtube/v3';
const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
const DAY = 86400000;

type Target = { slug: string; kind: 'artist' | 'series'; name: string; keywords: string[]; eventName: string };

function targets(): Target[] {
  return [
    ...SERIES.map((s) => ({ slug: s.slug, kind: 'series' as const, name: s.name, keywords: s.keywords, eventName: s.name })),
    ...artists.map((a) => ({ slug: a.slug, kind: 'artist' as const, name: a.name, keywords: [a.name.toLowerCase(), ...a.keywords], eventName: `${a.name} Live` })),
  ];
}

async function yt(path: string, params: Record<string, string>) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;
  const qs = new URLSearchParams({ ...params, key });
  const r = await fetch(`${API}/${path}?${qs}`, { cache: 'no-store' });
  if (!r.ok) { console.warn('[video finder]', path, r.status); return null; }
  return r.json();
}

/** The official channel for a name: exact title match (or "<name> Official"/VEVO), most subscribers, ≥10k */
async function findChannel(name: string): Promise<{ id: string; title: string; subs: number } | null> {
  const s = await yt('search', { part: 'snippet', type: 'channel', q: name, maxResults: '6' });
  const ids: string[] = (s?.items ?? []).map((i: { snippet?: { channelId?: string } }) => i.snippet?.channelId).filter(Boolean);
  if (!ids.length) return null;
  const c = await yt('channels', { part: 'snippet,statistics', id: ids.join(',') });
  const n = norm(name);
  const ok = (c?.items ?? [])
    .map((i: { id: string; snippet: { title: string }; statistics: { subscriberCount?: string } }) => ({ id: i.id, title: i.snippet.title, subs: Number(i.statistics?.subscriberCount ?? 0) }))
    .filter((x: { title: string; subs: number }) => {
      const t = norm(x.title);
      return x.subs >= 10000 && (t === n || t === `${n}official` || t === `official${n}` || t === `${n}vevo` || t === `${n}tv` || t === `${n}music`);
    })
    .sort((a: { subs: number }, b: { subs: number }) => b.subs - a.subs);
  return ok[0] ?? null;
}

const LIVE = /\b(live|concert|perform(s|ance|ed)?|festival|fest|tour|stage|show|crowd|highlights?|recap|night|rave|homecoming|o2|arena|stadium)\b/i;
const NOT_LIVE = /\b(official (music )?video|lyrics?|lyric video|audio|visuali[sz]er|teaser|trailer|reaction|interview|podcast|snippet)\b/i;

/** Read a channel's recent uploads and pick the live moments worth reviewing */
async function scanChannel(db: SupabaseClient, t: Target, channelId: string, channelTitle: string): Promise<number> {
  const uploads = `UU${channelId.slice(2)}`;
  const page = await yt('playlistItems', { part: 'snippet,contentDetails', playlistId: uploads, maxResults: '50' });
  type Item = { contentDetails?: { videoId?: string; videoPublishedAt?: string }; snippet?: { title?: string; description?: string; publishedAt?: string } };
  const items: Item[] = page?.items ?? [];
  const picks = items.filter((i) => {
    const title = i.snippet?.title ?? '';
    if (!i.contentDetails?.videoId || NOT_LIVE.test(title)) return false;
    if (t.kind === 'series') return t.keywords.some((k) => title.toLowerCase().includes(k.toLowerCase())) || LIVE.test(title);
    return LIVE.test(title);
  }).slice(0, 8);
  if (!picks.length) return 0;

  const ids = picks.map((i) => i.contentDetails!.videoId!);
  const { data: known } = await db.from('moments').select('youtube_id').in('youtube_id', ids);
  const have = new Set((known ?? []).map((k: { youtube_id: string }) => k.youtube_id));
  const series = t.kind === 'series' ? SERIES.find((s) => s.slug === t.slug) : SERIES.find((s) => picks.some((p) => s.keywords.some((k) => (p.snippet?.title ?? '').toLowerCase().includes(k))));

  const rows = picks.filter((p) => !have.has(p.contentDetails!.videoId!)).map((p) => {
    const title = (p.snippet?.title ?? '').replace(/\s+/g, ' ').trim().slice(0, 140);
    const inSeries = series && series.keywords.some((k) => title.toLowerCase().includes(k));
    const when = p.contentDetails?.videoPublishedAt ?? p.snippet?.publishedAt ?? null;
    const firstLine = (p.snippet?.description ?? '').split('\n').map((x) => x.trim()).find((x) => x.length > 20 && !/https?:\/\//.test(x)) ?? null;
    return {
      title, youtube_id: p.contentDetails!.videoId!, event_name: inSeries ? series!.name : t.eventName, event_slug: null,
      description: firstLine ? firstLine.slice(0, 160) : null, year: when ? new Date(when).getFullYear() : null, is_featured: false,
      channel_name: channelTitle, channel_url: `https://www.youtube.com/channel/${channelId}`, official: true, available: true,
      source_checked_at: new Date().toISOString(), status: 'pending', found_by: `youtube:${t.slug}`, published_at: when,
    };
  });
  if (!rows.length) return 0;
  const { error } = await db.from('moments').insert(rows);
  if (error) { console.warn('[video finder] insert failed', error.message); return 0; }
  return rows.length;
}

/**
 * One round of work, small enough for a page load or a cron tick:
 * resolve a few channels we don't know yet, then scan a few channels due for a look.
 */
export async function findOfficialVideos(opts: { resolve?: number; scan?: number } = {}): Promise<{ resolved: number; scanned: number; found: number; enabled: boolean }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !process.env.YOUTUBE_API_KEY) return { resolved: 0, scanned: 0, found: 0, enabled: false };
  const db = createClient(url, key, { auth: { persistSession: false }, global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) } });
  const all = targets();
  const { data } = await db.from('official_channels').select('*');
  const rows = new Map((data ?? []).map((r: { slug: string }) => [r.slug, r as Record<string, unknown>]));
  const now = Date.now();

  // 1. Channels we haven't looked up (or not for 30 days, unless the admin confirmed them)
  let resolved = 0;
  const toResolve = all.filter((t) => {
    const r = rows.get(t.slug);
    return !r || (!r.confirmed && (!r.checked_at || now - new Date(String(r.checked_at)).getTime() > 30 * DAY));
  }).slice(0, opts.resolve ?? 3);
  for (const t of toResolve) {
    const ch = await findChannel(t.name);
    const row = { slug: t.slug, kind: t.kind, channel_id: ch?.id ?? null, channel_title: ch?.title ?? null, subscribers: ch?.subs ?? null, checked_at: new Date().toISOString() };
    await db.from('official_channels').upsert(row);
    rows.set(t.slug, { ...rows.get(t.slug), ...row });
    resolved++;
  }

  // 2. Channels due a scan (every 3 days), most overdue first
  const due = all
    .map((t) => ({ t, r: rows.get(t.slug) }))
    .filter(({ r }) => r?.channel_id && (!r.scanned_at || now - new Date(String(r.scanned_at)).getTime() > 3 * DAY))
    .sort((a, b) => new Date(String(a.r?.scanned_at ?? 0)).getTime() - new Date(String(b.r?.scanned_at ?? 0)).getTime())
    .slice(0, opts.scan ?? 5);
  let found = 0;
  for (const { t, r } of due) {
    found += await scanChannel(db, t, String(r!.channel_id), String(r!.channel_title ?? t.name));
    await db.from('official_channels').update({ scanned_at: new Date().toISOString() }).eq('slug', t.slug);
  }
  return { resolved, scanned: due.length, found, enabled: true };
}
