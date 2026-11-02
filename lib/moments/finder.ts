import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { artists } from '@/lib/data/artists';
import { SERIES } from '@/lib/data/series';
import { EVENT_TOPICS, TRUSTED_MEDIA } from '@/lib/data/festivals';
import { categorize } from '@/lib/moments/categorize';

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
const NOT_LIVE = /(\(?\[?(official )?(live )?performance video\]?\)?|\(live performance\)|sky high|live session|studio session|cue live|colors show|tiny desk|\?\s*$)|\b(react(s|ion|ing)?|vlog|recap video|official (music )?video|lyrics?|lyric video|audio|visuali[sz]er|teaser|trailer|reaction|interview|podcast|snippet)\b/i;

/** Teasers, promos and stubs: never published on their own */
const PROMO = /\b(ad|advert|ready for|get ready|funeral|call us|join (us|our)|live conversation|commercial|up now|up on my channel|new single|newest single|run it|go stream|on audiomack|on spotify|vlog|day \d+ of|is live|announcement|announc|tickets?|see you|tomorrow|tonight|countdown|coming soon|pre-?order|out now|stream now|date|save the date|loading|who'?s coming|link in bio)\b/i;
/** Clearly a performance or an event */
const STRONG = /\b(live (at|in|from|on)|full (show|performance|set|concert)|concert|performance|performs?|performed|festival|fest|tour|highlights|on stage|stage performance|durbar|procession|celebrat\w*|carnival)\b/i;

/** "Song title #tag #tag 🔥" → "Song title" */
export function tidyTitle(t: string): string {
  return t.replace(/#[^\s#]+/g, '').replace(/\s*[|•]\s*$/g, '').replace(/\s{2,}/g, ' ').trim().replace(/[\s,.-]+$/, '').slice(0, 140);
}

/** Publish straight away when the title reads like a real performance, not a promo or a short */
export function credible(title: string): boolean {
  const hashtags = (title.match(/#/g) ?? []).length;
  return STRONG.test(title) && !PROMO.test(title) && !NOT_LIVE.test(title) && hashtags < 3 && tidyTitle(title).length >= 12;
}

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

  const rows = picks.filter((p) => !have.has(p.contentDetails!.videoId!) && tidyTitle(p.snippet?.title ?? '').length >= 12).map((p) => {
    const raw = (p.snippet?.title ?? '').replace(/\s+/g, ' ').trim();
    const title = tidyTitle(raw) || raw.slice(0, 140);
    const inSeries = series && series.keywords.some((k) => title.toLowerCase().includes(k));
    const when = p.contentDetails?.videoPublishedAt ?? p.snippet?.publishedAt ?? null;
    const firstLine = (p.snippet?.description ?? '').split('\n').map((x) => x.trim()).find((x) => x.length > 20 && !/https?:\/\//.test(x)) ?? null;
    return {
      title, youtube_id: p.contentDetails!.videoId!, event_name: inSeries ? series!.name : t.eventName, event_slug: null,
      description: firstLine ? firstLine.slice(0, 160) : null, year: when ? new Date(when).getFullYear() : null, is_featured: false,
      channel_name: channelTitle, channel_url: `https://www.youtube.com/channel/${channelId}`, official: true, available: true,
      source_checked_at: new Date().toISOString(), status: credible(raw) ? 'live' : 'pending', found_by: `youtube:${t.slug}`, published_at: when,
      category: categorize({ title, event_name: inSeries ? series!.name : t.eventName, found_by: `youtube:${t.slug}` }),
    };
  });
  if (!rows.length) return 0;
  const { error } = await db.from('moments').insert(rows);
  if (error) { console.warn('[video finder] insert failed', error.message); return 0; }
  return rows.length;
}

/** "Mr Eazi", "Black Sherif Music", "KiDi VEVO" — a channel named after one of our artists */
const ARTIST_NAMES = new Set(artists.map((a) => norm(a.name)));
const isArtistChannel = (channel: string) => {
  const c = norm(channel).replace(/(official|music|vevo|tv)$/, '');
  return c.length >= 3 && ARTIST_NAMES.has(c);
};

const trusted = (channel: string) => {
  const c = norm(channel);
  return TRUSTED_MEDIA.some((m) => { const n = norm(m); return n.length < 5 ? c === n : c === n || c.startsWith(n); });
};

/**
 * Festivals and shows rarely have their own channel, so search YouTube for them directly.
 * Videos from the artists' official channels or trusted media go live; anything else that
 * clearly matches waits for review (at most a couple per search, so the queue stays short).
 */
async function searchTopic(db: SupabaseClient, topic: (typeof EVENT_TOPICS)[number], officialIds: Set<string>): Promise<number> {
  const since = new Date(Date.now() - 3 * 365 * DAY).toISOString();
  const s = await yt('search', { part: 'snippet', type: 'video', q: topic.name, maxResults: '25', regionCode: 'GH', relevanceLanguage: 'en', videoEmbeddable: 'true', publishedAfter: since });
  type Hit = { id?: { videoId?: string }; snippet?: { title?: string; description?: string; channelTitle?: string; channelId?: string; publishedAt?: string } };
  const hits: Hit[] = (s?.items ?? []).filter((h: Hit) => {
    const title = (h.snippet?.title ?? '').toLowerCase().replace(/&amp;/g, '&');
    return h.id?.videoId && topic.keywords.some((k) => title.includes(k)) && !NOT_LIVE.test(title) && !PROMO.test(title);
  });
  if (!hits.length) return 0;
  const ids = hits.map((h) => h.id!.videoId!);
  const { data: known } = await db.from('moments').select('youtube_id').in('youtube_id', ids);
  const have = new Set((known ?? []).map((k: { youtube_id: string }) => k.youtube_id));
  let review = 0;
  const rows = hits.filter((h) => !have.has(h.id!.videoId!) && tidyTitle(h.snippet?.title ?? '').length >= 12).flatMap((h) => {
    const sn = h.snippet!;
    const raw = (sn.title ?? '').replace(/&amp;/g, '&').replace(/&#39;/g, '’').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
    const official = (!!sn.channelId && officialIds.has(sn.channelId)) || isArtistChannel(sn.channelTitle ?? '');
    // The title already names the event and isn't a promo; an official or trusted source is enough
    // ...but it must read like the event itself: a performance word, or the edition's year
    const ok = (official || trusted(sn.channelTitle ?? '')) && (credible(raw) || /\b20\d\d\b/.test(raw));
    if (!ok && review >= 2) return [];
    if (!ok) review++;
    const when = sn.publishedAt ?? null;
    const firstLine = (sn.description ?? '').split('\n').map((x) => x.trim()).find((x) => x.length > 20 && !/https?:\/\//.test(x)) ?? null;
    return [{
      title: tidyTitle(raw) || raw.slice(0, 140), youtube_id: h.id!.videoId!, event_name: topic.name, event_slug: null,
      description: firstLine ? firstLine.slice(0, 160) : null, year: when ? new Date(when).getFullYear() : null, is_featured: false,
      channel_name: sn.channelTitle ?? null, channel_url: sn.channelId ? `https://www.youtube.com/channel/${sn.channelId}` : null, official,
      available: true, source_checked_at: new Date().toISOString(), status: ok ? 'live' : 'pending', found_by: `search:${topic.slug}`, published_at: when,
      category: categorize({ title: raw, event_name: topic.name, found_by: `search:${topic.slug}` }),
    }];
  }).slice(0, 8);
  if (!rows.length) return 0;
  const { error } = await db.from('moments').insert(rows);
  if (error) { console.warn('[video finder] insert failed', error.message); return 0; }
  return rows.length;
}

/**
 * One round of work, small enough for a page load or a cron tick:
 * resolve a few channels we don't know yet, then scan a few channels due for a look.
 */
export async function findOfficialVideos(opts: { resolve?: number; scan?: number; search?: number } = {}): Promise<{ resolved: number; scanned: number; searched?: number; found: number; enabled: boolean }> {
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
  // 3. Festivals and shows by search (each every 14 days; a search costs 100 quota units)
  const topicKey = (slug: string) => `topic:${slug}`;
  const topicsDue = EVENT_TOPICS
    .filter((t) => { const r = rows.get(topicKey(t.slug)); return !r?.scanned_at || now - new Date(String(r.scanned_at)).getTime() > 14 * DAY; })
    .sort((a, b) => new Date(String(rows.get(topicKey(a.slug))?.scanned_at ?? 0)).getTime() - new Date(String(rows.get(topicKey(b.slug))?.scanned_at ?? 0)).getTime())
    .slice(0, opts.search ?? 1);
  const officialIds = new Set(Array.from(rows.values()).map((r) => r.channel_id).filter(Boolean).map(String));
  for (const t of topicsDue) {
    // Mark first, so a second visitor at the same moment doesn't search the same thing
    await db.from('official_channels').upsert({ slug: topicKey(t.slug), kind: 'series', channel_id: null, channel_title: null, subscribers: null, confirmed: true, checked_at: new Date().toISOString(), scanned_at: new Date().toISOString() });
    found += await searchTopic(db, t, officialIds);
  }

  return { resolved, scanned: due.length, searched: topicsDue.length, found, enabled: true };
}
