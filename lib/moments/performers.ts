import { createClient } from '@supabase/supabase-js';
import { artists, detectArtistsFromText, getArtistBySlug } from '@/lib/data/artists';
import { SERIES, momentInSeries } from '@/lib/data/series';
import { categorize } from '@/lib/moments/categorize';
import { cleanExcerpt } from '@/lib/moments/excerpt';

/**
 * Confirms who performed in each moment, so "On stage" only lists people who were really there.
 *
 * Evidence, strongest first:
 *  - channel:     the video is on the artist's own YouTube channel
 *  - title:       the artist is named in the video's title (or the moment's event name)
 *  - description: named near the top of the YouTube description or in its tags (the uploader's credits)
 *  - lineup:      billed on the Akwaaba event the moment belongs to
 *  - host:        hosts the show series the moment belongs to
 *
 * An artist is confirmed by their own channel or by being named in the title. Otherwise it takes two signals,
 * one of them the event's lineup or the show's host: descriptions often name other artists in song credits or
 * links, and a festival clip doesn't show everyone on the bill.
 */

type Evidence = 'channel' | 'title' | 'description' | 'lineup' | 'host';
type Row = {
  id: string; title: string; event_name: string; event_slug: string | null; youtube_id: string; description: string | null;
  channel_name: string | null; channel_url: string | null; found_by: string | null; category: string | null;
};

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
const ARTIST_BY_NAME = new Map(artists.map((a) => [norm(a.name), a.slug]));
const artistForChannel = (name: string | null) => {
  if (!name) return null;
  return ARTIST_BY_NAME.get(norm(name).replace(/(official|music|vevo|tv)$/, '')) ?? null;
};
const rank = (slug: string) => getArtistBySlug(slug)?.priority ?? 999;

async function videoDetails(ids: string[]): Promise<Map<string, { description: string; tags: string[]; channelId: string }>> {
  const out = new Map<string, { description: string; tags: string[]; channelId: string }>();
  const key = process.env.YOUTUBE_API_KEY;
  if (!key || !ids.length) return out;
  for (let i = 0; i < ids.length; i += 50) {
    const qs = new URLSearchParams({ part: 'snippet', id: ids.slice(i, i + 50).join(','), key });
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?${qs}`, { cache: 'no-store' });
    if (!r.ok) { console.warn('[performers] videos.list', r.status); continue; }
    const j = await r.json();
    for (const v of j.items ?? []) out.set(v.id, { description: v.snippet?.description ?? '', tags: v.snippet?.tags ?? [], channelId: v.snippet?.channelId ?? '' });
  }
  return out;
}

export async function confirmPerformers(limit = 40): Promise<{ checked: number; withPerformers: number }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { checked: 0, withPerformers: 0 };
  const db = createClient(url, key, { auth: { persistSession: false }, global: { fetch: (i, init) => fetch(i, { ...init, cache: 'no-store' }) } });

  const stale = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data } = await db.from('moments')
    .select('id, title, event_name, event_slug, youtube_id, description, channel_name, channel_url, found_by, category')
    .in('status', ['live', 'pending'])
    .or(`performers_checked_at.is.null,performers_checked_at.lt.${stale}`)
    .order('status', { ascending: true }) // live first
    .limit(limit);
  const rows = (data ?? []) as Row[];
  if (!rows.length) return { checked: 0, withPerformers: 0 };

  const [details, chans, evs] = await Promise.all([
    videoDetails(rows.map((r) => r.youtube_id)),
    db.from('official_channels').select('slug, channel_id').eq('kind', 'artist').not('channel_id', 'is', null),
    (async () => {
      const slugs = Array.from(new Set(rows.map((r) => r.event_slug).filter(Boolean))) as string[];
      if (!slugs.length) return { data: [] };
      return db.from('events').select('slug, lineup, artist_slugs').in('slug', slugs);
    })(),
  ]);
  const artistByChannelId = new Map(((chans.data ?? []) as { slug: string; channel_id: string }[]).map((c) => [c.channel_id, c.slug]));
  const eventBySlug = new Map(((evs.data ?? []) as { slug: string; lineup: string[] | null; artist_slugs: string[] | null }[]).map((e) => [e.slug, e]));

  let withPerformers = 0;
  for (const m of rows) {
    const ev = new Map<string, Set<Evidence>>();
    const add = (slug: string | null | undefined, e: Evidence) => { if (slug && getArtistBySlug(slug)) (ev.get(slug) ?? ev.set(slug, new Set()).get(slug)!).add(e); };

    const d = details.get(m.youtube_id);
    const channelId = d?.channelId || m.channel_url?.split('/channel/')[1] || '';
    add(artistByChannelId.get(channelId) ?? artistForChannel(m.channel_name), 'channel');
    detectArtistsFromText(m.title, m.event_name).artistSlugs.forEach((s) => add(s, 'title'));
    const credits = [(d?.description ?? m.description ?? '').slice(0, 400), ...(d?.tags ?? [])].join(' \n ');
    detectArtistsFromText(credits).artistSlugs.forEach((s) => add(s, 'description'));
    const e = m.event_slug ? eventBySlug.get(m.event_slug) : undefined;
    (e?.artist_slugs ?? []).forEach((s) => add(s, 'lineup'));
    (e?.lineup ?? []).forEach((n) => add(detectArtistsFromText(n).artistSlugs[0], 'lineup'));
    const series = SERIES.find((s) => momentInSeries({ title: m.title, event_name: m.event_name }, s));
    series?.hosts.forEach((s) => add(s, 'host'));

    const confirmed = Array.from(ev.entries())
      .filter(([, how]) => how.has('channel') || how.has('title') || ((how.has('description') || how.has('lineup')) && (how.has('lineup') || how.has('host')) && how.size >= 2))
      .map(([slug]) => slug)
      .sort((a, b) => rank(a) - rank(b))
      .slice(0, 12);
    if (confirmed.length) withPerformers++;

    await db.from('moments').update({
      performers: confirmed,
      performer_evidence: Object.fromEntries(Array.from(ev.entries()).map(([s, how]) => [s, Array.from(how)])),
      performers_checked_at: new Date().toISOString(),
      ...(m.category ? {} : { category: categorize(m) }),
      // A fuller excerpt from the uploader's description, when what we have is short or missing
      ...(() => {
        const ex = cleanExcerpt(d?.description);
        // Found automatically: always use the cleaned excerpt (or drop text that's only links and notices)
        if (m.found_by) {
          const keep = ex ?? cleanExcerpt(m.description, 200);
          return keep !== m.description ? { description: keep } : {};
        }
        // Written by hand: only fill in when ours is short
        return ex && ex.length > (m.description?.length ?? 0) + 20 && (m.description?.length ?? 0) < 140 ? { description: ex } : {};
      })(),
    }).eq('id', m.id);
  }
  return { checked: rows.length, withPerformers };
}
