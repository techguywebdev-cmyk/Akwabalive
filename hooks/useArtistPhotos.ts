'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Row = { slug: string; photo_url: string | null; photo_source: string | null; spotify_image: string | null };
const cache = new Map<string, string | null>();

/** Same choice as the artist pages: an upload, else Spotify (unless it's album art and we have a real photo), else Wikimedia */
function pick(r: Row | undefined): string | null {
  if (!r) return null;
  if (r.photo_source === 'upload' && r.photo_url) return r.photo_url;
  const albumArt = !!r.spotify_image && r.spotify_image.includes('/ab67616d');
  if (r.spotify_image && !(albumArt && r.photo_source === 'wikimedia' && r.photo_url)) return r.spotify_image;
  return r.photo_source === 'wikimedia' ? r.photo_url : null;
}

/** Photos for a set of artist slugs: { slug: url | null } */
export function useArtistPhotos(slugs: string[]): Record<string, string | null> {
  const key = slugs.join(',');
  const [photos, setPhotos] = useState<Record<string, string | null>>(() => Object.fromEntries(slugs.map((s) => [s, cache.get(s) ?? null])));
  useEffect(() => {
    const list = key ? key.split(',') : [];
    if (!list.length) return;
    const fill = () => setPhotos(Object.fromEntries(list.map((s) => [s, cache.get(s) ?? null])));
    const missing = list.filter((s) => !cache.has(s));
    if (!missing.length) { fill(); return; }
    let live = true;
    createClient().from('artist_profiles').select('slug, photo_url, photo_source, spotify_image').in('slug', missing).then(({ data }) => {
      const rows = new Map(((data ?? []) as Row[]).map((r) => [r.slug, r]));
      missing.forEach((s) => cache.set(s, pick(rows.get(s))));
      if (live) fill();
    });
    return () => { live = false; };
  }, [key]);
  return photos;
}
