import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Artist } from '@/lib/types';
import { lookupSpotify, spotifyConfigured } from '@/lib/artists/spotify';

/** An artist's photo and who to credit for it */
export type ArtistPhoto = {
  url: string;
  credit: string | null;
  license: string | null;
  sourceUrl: string | null;
  source: 'wikimedia' | 'upload' | 'spotify';
  /** The artist on Spotify, for a "Listen on Spotify" link (whatever the photo's source) */
  spotifyUrl?: string | null;
};

type Row = {
  slug: string; photo_url: string | null; photo_credit: string | null; photo_license: string | null;
  photo_source_url: string | null; photo_source: 'wikimedia' | 'upload' | null; checked_at: string | null;
  spotify_id?: string | null; spotify_url?: string | null; spotify_image?: string | null; spotify_checked_at?: string | null;
};

const noStore = { global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: 'no-store' }) } };
const anon = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? createClient(url, key, noStore) : null;
};
const admin = (): SupabaseClient | null => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { ...noStore, auth: { persistSession: false } }) : null;
};

/** Uploaded photo first, then Spotify's (official, current), then the free Wikimedia one */
const toPhoto = (r: Row): ArtistPhoto | null => {
  const spotifyUrl = r.spotify_url ?? null;
  if (r.photo_source === 'upload' && r.photo_url)
    return { url: r.photo_url, credit: r.photo_credit, license: null, sourceUrl: null, source: 'upload', spotifyUrl };
  // Spotify's artist image is sometimes just an album cover (…/ab67616d…); prefer a real Wikimedia photo then
  const albumArt = !!r.spotify_image && r.spotify_image.includes('/ab67616d');
  if (r.spotify_image && !(albumArt && r.photo_source === 'wikimedia' && r.photo_url))
    return { url: r.spotify_image, credit: 'Spotify', license: null, sourceUrl: spotifyUrl, source: 'spotify', spotifyUrl };
  if (r.photo_source === 'wikimedia' && r.photo_url)
    return { url: r.photo_url, credit: r.photo_credit, license: r.photo_license, sourceUrl: r.photo_source_url, source: 'wikimedia', spotifyUrl };
  return null;
};

async function readRows(): Promise<Row[]> {
  const db = anon();
  if (!db) return [];
  try {
    const { data } = await db.from('artist_profiles').select('*');
    return (data ?? []) as Row[];
  } catch { return []; }
}

/* ── Wikimedia lookup ───────────────────────────────────────────────── */

const UA = 'AkwaabaEvents/1.0 (https://akwabalive.vercel.app; techguywebdev@gmail.com)';
const WEEK = 7 * 24 * 3600 * 1000;

async function getJson(url: string, ms: number) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA }, signal: ctl.signal, cache: 'no-store' });
    if (!r.ok) console.warn('[artist photos]', r.status, url.slice(0, 80));
    return r.ok ? await r.json() : null;
  } catch (e) { console.warn('[artist photos] fetch failed', String(e)); return null; } finally { clearTimeout(t); }
}

const stripHtml = (s?: string) =>
  (s ?? '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim() || null;

/**
 * Free photos for these artists from Wikimedia Commons: each Wikipedia article's free lead image
 * (`page_image_free`), with the photographer and licence from Commons.
 */
async function lookupWikimedia(list: Artist[], ms: number): Promise<Map<string, Omit<ArtistPhoto, 'source'> | null>> {
  const out = new Map<string, Omit<ArtistPhoto, 'source'> | null>();
  const withWiki = list.filter((a) => a.wiki);
  if (!withWiki.length) return out;

  // Wikipedia's own pointer to the article's *free* lead image (never a fair-use upload). Light and fast.
  const titles = withWiki.map((a) => a.wiki!).join('|');
  const wp = await getJson(`https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&ppprop=page_image_free&redirects=1&titles=${encodeURIComponent(titles)}&format=json&formatversion=2`, ms);
  if (!wp?.query) { console.warn('[artist photos] wikipedia lookup failed', wp?.error?.info ?? 'no response'); return out; }
  const hop = new Map<string, string>();
  for (const n of [...(wp.query.normalized ?? []), ...(wp.query.redirects ?? [])]) hop.set(n.from, n.to);
  const fileByPage = new Map<string, string>();
  // Photos only: skip drawings, logos and other vector images (.svg)
  for (const pg of wp.query.pages ?? []) {
    const f: string | undefined = pg?.pageprops?.page_image_free;
    if (f && /\.(jpe?g|png|webp)$/i.test(f)) fileByPage.set(pg.title, f);
  }
  const fileByTitle = new Map<string, string>();
  for (const a of withWiki) {
    let t = a.wiki!;
    for (let i = 0; i < 3 && hop.has(t); i++) t = hop.get(t)!;
    const f = fileByPage.get(t);
    if (f) fileByTitle.set(a.wiki!.toLowerCase(), f);
  }

  const files = Array.from(new Set(Array.from(fileByTitle.values())));
  const infoByFile = new Map<string, Omit<ArtistPhoto, 'source'>>();
  if (files.length) {
    const cm = await getJson(`https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(files.map((f) => `File:${f}`).join('|'))}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1200&format=json`, ms);
    const norm = new Map<string, string>((cm?.query?.normalized ?? []).map((n: { from: string; to: string }) => [n.to, n.from]));
    for (const page of Object.values(cm?.query?.pages ?? {}) as Array<Record<string, any>>) {
      const ii = page?.imageinfo?.[0];
      if (!ii) continue;
      const name = String(norm.get(page.title) ?? page.title).replace(/^File:/, '');
      const meta = ii.extmetadata ?? {};
      infoByFile.set(name.replace(/_/g, ' '), {
        url: ii.thumburl || ii.url,
        credit: stripHtml(meta.Artist?.value) ?? stripHtml(meta.Credit?.value),
        license: stripHtml(meta.LicenseShortName?.value),
        sourceUrl: ii.descriptionurl ?? null,
      });
    }
  }

  for (const a of withWiki) {
    const file = fileByTitle.get(a.wiki!.toLowerCase());
    out.set(a.slug, (file && infoByFile.get(file.replace(/_/g, ' '))) || null);
  }
  return out;
}

const isStale = (at: string | null | undefined, now: number) => !at || now - new Date(at).getTime() > WEEK;

/** Wikimedia: free photo + credit, for artists without an uploaded photo */
async function refreshWikimedia(db: SupabaseClient, artists: Artist[], bySlug: Map<string, Row>, ms: number) {
  const now = Date.now();
  // At most 45 per visit (Wikipedia takes 50 titles a request); the rest are picked up next time
  const stale = artists.filter((a) => { const r = bySlug.get(a.slug); return r?.photo_source !== 'upload' && isStale(r?.checked_at, now); }).slice(0, 45);
  if (!stale.length) return;
  const found = await lookupWikimedia(stale, ms);
  if (!found.size) return; // lookup failed or timed out: try again next visit
  const stamp = new Date().toISOString();
  const updates = stale.filter((a) => found.has(a.slug)).map((a) => {
    const p = found.get(a.slug);
    return {
      slug: a.slug, photo_url: p?.url ?? null, photo_credit: p?.credit ?? null, photo_license: p?.license ?? null,
      photo_source_url: p?.sourceUrl ?? null, photo_source: p ? ('wikimedia' as const) : null, checked_at: stamp,
    };
  });
  const { error } = await db.from('artist_profiles').upsert(updates.map((u) => ({ ...u, updated_at: stamp })));
  if (error) { console.warn('[artist photos] wikimedia save failed', error.message); return; }
  console.log(`[artist photos] wikimedia: checked ${updates.length}, found ${updates.filter((u) => u.photo_url).length}`);
  updates.forEach((u) => bySlug.set(u.slug, { ...(bySlug.get(u.slug) ?? ({} as Row)), ...u }));
}

/** Spotify: artist link + official image */
async function refreshSpotify(db: SupabaseClient, artists: Artist[], bySlug: Map<string, Row>, ms: number) {
  if (!spotifyConfigured()) return;
  const now = Date.now();
  const stale = artists.filter((a) => isStale(bySlug.get(a.slug)?.spotify_checked_at, now)).slice(0, 30);
  if (!stale.length) return;
  const found = await lookupSpotify(stale.map((a) => ({ slug: a.slug, name: a.name })), ms);
  if (!found?.size) return;
  const stamp = new Date().toISOString();
  const updates = stale.filter((a) => found.has(a.slug)).map((a) => {
    const s = found.get(a.slug);
    return { slug: a.slug, spotify_id: s?.id ?? null, spotify_url: s?.url ?? null, spotify_image: s?.image ?? null, spotify_checked_at: stamp };
  });
  const { error } = await db.from('artist_profiles').upsert(updates.map((u) => ({ ...u, updated_at: stamp })));
  if (error) { console.warn('[artist photos] spotify save failed', error.message); return; }
  console.log(`[artist photos] spotify: checked ${updates.length}, found ${updates.filter((u) => u.spotify_id).length}`);
  updates.forEach((u) => bySlug.set(u.slug, { ...(bySlug.get(u.slug) ?? ({ slug: u.slug } as Row)), ...u }));
}

/** Re-check artists not looked up in the last week (uploaded photos are never replaced) */
async function refreshStale(artists: Artist[], rows: Row[], ms: number): Promise<Row[]> {
  const db = admin();
  if (!db) { console.warn('[artist photos] no service role key'); return rows; }
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  await Promise.all([refreshWikimedia(db, artists, bySlug, ms), refreshSpotify(db, artists, bySlug, ms)]);
  return Array.from(bySlug.values());
}

/** Photos for these artists, refreshing stale Wikimedia lookups first (bounded by `ms`) */
export async function getArtistPhotos(artists: Artist[], ms = 3000): Promise<Record<string, ArtistPhoto>> {
  let rows = await readRows();
  try {
    rows = await Promise.race([refreshStale(artists, rows, ms), new Promise<Row[]>((res) => setTimeout(() => res(rows), ms * 2 + 500))]);
  } catch { /* keep what we have */ }
  const out: Record<string, ArtistPhoto> = {};
  for (const r of rows) { const p = toPhoto(r); if (p) out[r.slug] = p; }
  return out;
}
