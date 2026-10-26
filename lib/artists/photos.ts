import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Artist } from '@/lib/types';

/** An artist's photo and who to credit for it */
export type ArtistPhoto = {
  url: string;
  credit: string | null;
  license: string | null;
  sourceUrl: string | null;
  source: 'wikimedia' | 'upload';
};

type Row = {
  slug: string; photo_url: string | null; photo_credit: string | null; photo_license: string | null;
  photo_source_url: string | null; photo_source: 'wikimedia' | 'upload' | null; checked_at: string | null;
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

const toPhoto = (r: Row): ArtistPhoto | null =>
  r.photo_url && r.photo_source
    ? { url: r.photo_url, credit: r.photo_credit, license: r.photo_license, sourceUrl: r.photo_source_url, source: r.photo_source }
    : null;

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
    return r.ok ? await r.json() : null;
  } catch { return null; } finally { clearTimeout(t); }
}

const stripHtml = (s?: string) =>
  (s ?? '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim() || null;

/**
 * Free photos for these artists from Wikimedia Commons, via each artist's Wikidata "image"
 * (P18) — which is always a freely licensed Commons file, never a fair-use upload.
 */
async function lookupWikimedia(list: Artist[], ms: number): Promise<Map<string, Omit<ArtistPhoto, 'source'> | null>> {
  const out = new Map<string, Omit<ArtistPhoto, 'source'> | null>();
  const withWiki = list.filter((a) => a.wiki);
  if (!withWiki.length) return out;

  const titles = withWiki.map((a) => a.wiki!.replace(/ /g, '_')).join('|');
  const wd = await getJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles=${encodeURIComponent(titles)}&props=claims|sitelinks&sitefilter=enwiki&normalize=1&format=json`, ms);
  if (!wd?.entities) return out;

  // Wikipedia title → Commons file name
  const fileByTitle = new Map<string, string>();
  for (const ent of Object.values(wd.entities) as Array<Record<string, any>>) {
    const title: string | undefined = ent?.sitelinks?.enwiki?.title;
    const file: string | undefined = ent?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    if (title && file) fileByTitle.set(title.toLowerCase(), file);
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

/** Look up free photos for artists not checked in the last week (never touches uploaded photos) */
async function refreshStale(artists: Artist[], rows: Row[], ms: number): Promise<Row[]> {
  const db = admin();
  if (!db) return rows;
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  const now = Date.now();
  const stale = artists.filter((a) => {
    const r = bySlug.get(a.slug);
    if (r?.photo_source === 'upload') return false;
    return !r?.checked_at || now - new Date(r.checked_at).getTime() > WEEK;
  });
  if (!stale.length) return rows;

  const found = await lookupWikimedia(stale, ms);
  if (!found.size) return rows; // lookup failed or timed out: try again next visit
  const stamp = new Date().toISOString();
  const updates: Row[] = stale.filter((a) => found.has(a.slug)).map((a) => {
    const p = found.get(a.slug);
    return {
      slug: a.slug, photo_url: p?.url ?? null, photo_credit: p?.credit ?? null, photo_license: p?.license ?? null,
      photo_source_url: p?.sourceUrl ?? null, photo_source: p ? 'wikimedia' : null, checked_at: stamp,
    };
  });
  try { await db.from('artist_profiles').upsert(updates.map((u) => ({ ...u, updated_at: stamp }))); } catch { /* best effort */ }
  updates.forEach((u) => bySlug.set(u.slug, u));
  return Array.from(bySlug.values());
}

/** Photos for these artists, refreshing stale Wikimedia lookups first (bounded by `ms`) */
export async function getArtistPhotos(artists: Artist[], ms = 3500): Promise<Record<string, ArtistPhoto>> {
  let rows = await readRows();
  try {
    rows = await Promise.race([refreshStale(artists, rows, ms), new Promise<Row[]>((res) => setTimeout(() => res(rows), ms + 500))]);
  } catch { /* keep what we have */ }
  const out: Record<string, ArtistPhoto> = {};
  for (const r of rows) { const p = toPhoto(r); if (p) out[r.slug] = p; }
  return out;
}
