'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { events as staticEvents } from '@/lib/data/events';
import { artistForName, detectArtistsFromText, getArtistBySlug } from '@/lib/data/artists';
import type { Artist } from '@/lib/types';
import type { EventSeries as Series } from '@/lib/data/series';
import type { Moment } from '@/components/moments/types';

export type MomentEvent = { date: string | null; venue: string | null; city: string | null; lineup: string[]; artistSlugs: string[] };
export type OnStage = { slug: string; name: string; photo: string | null; host: boolean };

type ProfileRow = { slug: string; photo_url: string | null; photo_source: string | null; spotify_image: string | null };

/** Same choice as the artist pages: an upload, else Spotify (unless it's album art and we have a real photo), else Wikimedia */
function pickPhoto(r: ProfileRow | undefined): string | null {
  if (!r) return null;
  if (r.photo_source === 'upload' && r.photo_url) return r.photo_url;
  const albumArt = !!r.spotify_image && r.spotify_image.includes('/ab67616d');
  if (r.spotify_image && !(albumArt && r.photo_source === 'wikimedia' && r.photo_url)) return r.spotify_image;
  return r.photo_source === 'wikimedia' ? r.photo_url : null;
}

const photoCache = new Map<string, string | null>();
const eventCache = new Map<string, MomentEvent | null>();

/**
 * What the event behind a moment was: when and where, and who was on stage
 * (artists named in the video, billed on the event, or hosting the show), with their photos.
 */
export function useMomentInfo(moment: Moment, series: Series | undefined, enabled: boolean) {
  const slug = moment.event_slug;
  const [event, setEvent] = useState<MomentEvent | null>(() => (slug ? eventCache.get(slug) ?? null : null));
  const [photos, setPhotos] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!enabled || !slug) return;
    if (eventCache.has(slug)) { setEvent(eventCache.get(slug) ?? null); return; }
    const local = staticEvents.find((e) => e.slug === slug);
    if (local) {
      const ev = { date: local.date, venue: local.venue, city: local.city, lineup: local.lineup ?? [], artistSlugs: local.artistSlugs ?? [] };
      eventCache.set(slug, ev); setEvent(ev); return;
    }
    let cancelled = false;
    createClient().from('events').select('date, venue, city, lineup, artist_slugs').eq('slug', slug).maybeSingle()
      .then(({ data }) => {
        const ev = data ? { date: data.date ?? null, venue: data.venue ?? null, city: data.city ?? null, lineup: data.lineup ?? [], artistSlugs: data.artist_slugs ?? [] } : null;
        eventCache.set(slug, ev);
        if (!cancelled) setEvent(ev);
      });
    return () => { cancelled = true; };
  }, [enabled, slug]);

  const acts = useMemo(() => {
    const out: { artist: Artist; host: boolean }[] = [];
    const add = (a: Artist | undefined, host = false) => {
      if (!a) return;
      const have = out.find((x) => x.artist.slug === a.slug);
      if (have) { have.host ||= host; return; }
      out.push({ artist: a, host });
    };
    series?.hosts.forEach((s) => add(getArtistBySlug(s), true));
    detectArtistsFromText(moment.title, moment.event_name, moment.description).artistSlugs.forEach((s) => add(getArtistBySlug(s)));
    event?.artistSlugs.forEach((s) => add(getArtistBySlug(s)));
    event?.lineup.forEach((n) => add(artistForName(n)));
    return out.slice(0, 10);
  }, [moment, series, event]);

  const key = acts.map((a) => a.artist.slug).join(',');
  useEffect(() => {
    if (!enabled || !key) return;
    const slugs = key.split(',');
    const missing = slugs.filter((s) => !photoCache.has(s));
    const fill = () => setPhotos(Object.fromEntries(slugs.map((s) => [s, photoCache.get(s) ?? null])));
    if (!missing.length) { fill(); return; }
    let cancelled = false;
    createClient().from('artist_profiles').select('slug, photo_url, photo_source, spotify_image').in('slug', missing)
      .then(({ data }) => {
        const rows = new Map(((data ?? []) as ProfileRow[]).map((r) => [r.slug, r]));
        missing.forEach((s) => photoCache.set(s, pickPhoto(rows.get(s))));
        if (!cancelled) fill();
      });
    return () => { cancelled = true; };
  }, [enabled, key]);

  const onStage: OnStage[] = acts.map(({ artist, host }) => ({ slug: artist.slug, name: artist.name, photo: photos[artist.slug] ?? null, host }));
  return { event, onStage };
}
