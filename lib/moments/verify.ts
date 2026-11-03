import { createClient } from '@supabase/supabase-js';
import { detectArtistsFromText } from '@/lib/data/artists';
import { SERIES, momentInSeries } from '@/lib/data/series';
import { getArtistBySlug } from '@/lib/data/artists';

type Row = { id: string; title: string; event_name: string | null; description: string | null; youtube_id: string };

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');

/**
 * Names that would make a channel "official" for this moment: the artists it's about, the hosts
 * of its show, and the show itself (e.g. "Sarkodie", "Rapperholic", "Detty Rave").
 */
function ownerNames(m: Row): string[] {
  const names = new Set<string>();
  for (const slug of detectArtistsFromText(m.title, m.event_name, m.description).artistSlugs) {
    const a = getArtistBySlug(slug);
    if (a) { names.add(a.name); a.keywords.forEach((k) => names.add(k)); }
  }
  for (const s of SERIES) {
    if (!momentInSeries(m, s)) continue;
    names.add(s.name);
    s.keywords.forEach((k) => names.add(k));
    if (s.organiser) names.add(s.organiser);
    s.hosts.forEach((h) => { const a = getArtistBySlug(h); if (a) names.add(a.name); });
  }
  return Array.from(names).map(norm).filter((n) => n.length >= 4);
}

/** Ask YouTube who posted each video (oEmbed, no key needed) and whether it still embeds */
export async function verifyMoments(limit = 40): Promise<{ checked: number; official: number; gone: number }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { checked: 0, official: 0, gone: 0 };
  const db = createClient(url, key, { auth: { persistSession: false }, global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) } });
  const { data } = await db.from('moments').select('id, title, event_name, description, youtube_id, found_by').eq('source', 'youtube').or(`source_checked_at.is.null,source_checked_at.lt.${new Date(Date.now() - 14 * 86400000).toISOString()}`).limit(limit);
  const rows = (data ?? []) as Row[];
  let official = 0, gone = 0;
  await Promise.all(rows.map(async (m) => {
    let patch: Record<string, unknown> = { source_checked_at: new Date().toISOString() };
    try {
      const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${m.youtube_id}`)}`, { cache: 'no-store' });
      if (r.status === 401 || r.status === 403 || r.status === 404) {
        patch = { ...patch, available: false };
        gone++;
      } else if (r.ok) {
        const j = await r.json();
        const channel = String(j.author_name ?? '');
        const isOfficial = ownerNames(m).some((n) => norm(channel).includes(n) || n.includes(norm(channel)) && norm(channel).length >= 4);
        if (isOfficial) official++;
        patch = { ...patch, channel_name: channel || null, channel_url: j.author_url ?? null, available: true };
        // Keep 'official' when the finder already knows it came from the official channel
        if (!(m as Row & { found_by?: string | null }).found_by) patch.official = isOfficial;
      } else {
        return; // try again next time
      }
    } catch { return; }
    await db.from('moments').update(patch).eq('id', m.id);
  }));
  return { checked: rows.length, official, gone };
}
