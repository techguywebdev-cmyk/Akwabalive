'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Instagram, Share2, Check, CalendarDays, Camera } from 'lucide-react';
import type { ArtistBio } from '@/lib/artists/bio';
import type { Artist, GhanaEvent } from '@/lib/types';
import type { Moment } from '@/components/moments/types';
import Nav from '@/components/layout/Nav';
import { BTN } from '@/components/events/CardParts';
import { useOpenInMoments } from '@/components/moments/useOpenInMoments';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { useFollow, compactCount } from '@/components/follow/useFollow';
import { parseDay } from '@/lib/dates';
import { hiRes } from '@/lib/events/image';
import { T, FONT, GROUND } from '@/lib/thiscene';
import type { ArtistPhoto } from '@/lib/artists/photos';
import { useRatingSummaries } from '@/lib/ratings';
import ArtistPhotoSheet from '@/components/artists/ArtistPhotoSheet';
import {
  today, roundBtn, SpotifyLogo, XLogo, SectionTitle, Portrait, NextShow, ShowRow, SeriesRow, MomentsStrip, PastRow,
  type SeriesSummary, type PastShow,
} from '@/components/artists/parts';

export { priceLine } from '@/components/artists/parts';

export type SimilarArtist = { slug: string; name: string; photo: string | null; touring: boolean };


export default function ArtistPageClient({ artist, events, moments = [], photo: initialPhoto = null, hosted = [], similar = [], bio = null }: {
  artist: Artist; events: GhanaEvent[]; moments?: Moment[]; photo?: ArtistPhoto | null; hosted?: SeriesSummary[]; similar?: SimilarArtist[]; bio?: ArtistBio | null;
}) {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const { following, count: followers, busy, toggle } = useFollow('artist', artist.slug);
  const [viewer, setViewer] = useState<{ list: Moment[]; start: number; title: string } | null>(null);
  useOpenInMoments(viewer ? viewer.list[viewer.start]?.id : null, () => setViewer(null));
  const [copied, setCopied] = useState(false);
  const [photo, setPhoto] = useState<ArtistPhoto | null>(initialPhoto);
  const [isAdmin, setIsAdmin] = useState(false);
  const [photoSheet, setPhotoSheet] = useState(false);
  const [allPast, setAllPast] = useState(false);
  const [bioOpen, setBioOpen] = useState(false);
  const spotifyId = photo?.spotifyUrl?.match(/artist\/([A-Za-z0-9]+)/)?.[1] ?? null;

  const t0 = today();
  const upcoming = events.filter((e) => { const d = parseDay(e.date); return !d || d >= t0; });
  const past = events.filter((e) => !upcoming.includes(e)).reverse();
  const [next, ...later] = upcoming;
  const backdrop = photo?.url ?? (next?.image ? hiRes(next.image, 800) ?? next.image : null);
  const reel = moments.slice(0, 12);
  const ratings = useRatingSummaries(past.map((e) => e.slug));

  // Every past night: the listed events, plus nights we only have clips from; each carries its own clips
  const pastShows = useMemo<PastShow[]>(() => {
    const norm = (t: string) => t.toLowerCase().replace(/\b(19|20)\d{2}\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    const yearOf = (e: GhanaEvent) => parseDay(e.date)?.getFullYear() ?? null;
    const used = new Set<string>();
    const rows: PastShow[] = past.map((e) => {
      const y = yearOf(e);
      const own = moments.filter((m) => !used.has(m.id) && (m.event_slug === e.slug || (m.year === y && !!m.event_name && (norm(e.title).includes(norm(m.event_name)) || norm(m.event_name).includes(norm(e.title))))));
      own.forEach((m) => used.add(m.id));
      return { key: e.slug, sortKey: e.date ?? '', title: e.title, year: y, event: e, moments: own };
    });
    const groups = new Map<string, PastShow>();
    for (const m of moments) {
      if (used.has(m.id) || !m.event_name) continue;
      const k = `${norm(m.event_name)}|${m.year ?? ''}`;
      const g = groups.get(k) ?? { key: k, sortKey: `${m.year ?? 0}-06-30`, title: m.year ? `${m.event_name} ${m.year}` : m.event_name, year: m.year, event: null, moments: [] };
      g.moments.push(m);
      groups.set(k, g);
    }
    return [...rows, ...Array.from(groups.values())].sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }, [past, moments]);

  useEffect(() => {
    if (user) supabase.rpc('is_akwaaba_admin').then(({ data }) => setIsAdmin(data === true));
  }, [supabase, user]);

  async function share() {
    const url = `${window.location.origin}/artists/${artist.slug}`;
    try {
      if (navigator.share) { await navigator.share({ title: `${artist.name} shows on Tsacoal`, url }); return; }
      await navigator.clipboard.writeText(url);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    } catch { /* dismissed */ }
  }

  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed' }}>
      <Nav back="/artists" tabs actions={
        <button type="button" onClick={share} aria-label="Share artist" style={{ ...roundBtn, width: 44, height: 44, borderRadius: 22 }}>{copied ? <Check size={18} /> : <Share2 size={18} />}</button>
      } />

      {/* Hero: the artist's photo full width, melting into the page; name and who they are sit on it, actions in one row beneath */}
      <header style={{ position: 'relative' }}>
        <div style={{ position: 'relative', height: 'min(64svh, 540px)', minHeight: 380, overflow: 'hidden' }}>
          {photo?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 18%' }} />
          ) : backdrop ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={backdrop} alt="" aria-hidden style={{ position: 'absolute', inset: -60, width: 'calc(100% + 120px)', height: 'calc(100% + 120px)', objectFit: 'cover', filter: 'blur(48px) saturate(1.2)', opacity: 0.55 }} />
          ) : null}
          <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,11,9,0.35) 0%, rgba(8,11,9,0) 22%, rgba(8,11,9,0) 45%, rgba(8,11,9,0.75) 78%, #0A0D0B 100%)' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
            <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 20px 4px' }}>
              <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.mintText }}>
                {[artist.genre ?? 'Artist', upcoming.length ? 'Playing soon' : null].filter(Boolean).join(' · ')}
              </p>
              <h1 style={{ margin: '6px 0 0', fontFamily: FONT.display, fontSize: artist.name.length > 12 ? 46 : 60, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 0.95, color: T.white, textShadow: '0 2px 30px rgba(0,0,0,0.45)' }}>{artist.name}</h1>
              {bio?.description && <p style={{ margin: '10px 0 0', maxWidth: 420, fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.45, color: 'rgba(255,255,255,0.78)' }}>{bio.description}</p>}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 640, margin: '0 auto', padding: '14px 20px 0' }}>
          <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>
            {[
              <a key="s" href="#shows" style={{ color: 'inherit', textDecoration: 'none' }}><b style={{ color: T.white, fontWeight: 700 }}>{events.length + pastShows.filter((x) => !x.event).length}</b> shows</a>,
              moments.length ? <a key="m" href="#moments" style={{ color: 'inherit', textDecoration: 'none' }}><b style={{ color: T.white, fontWeight: 700 }}>{moments.length}</b> moments</a> : null,
              followers ? <span key="f"><b style={{ color: T.white, fontWeight: 700 }}>{compactCount(followers)}</b> {followers === 1 ? 'follower' : 'followers'}</span> : null,
            ].filter(Boolean).flatMap((x, i) => (i ? [<span key={`d${i}`} aria-hidden style={{ margin: '0 8px', color: T.text3 }}>·</span>, x] : [x]))}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
            <button type="button" onClick={toggle} disabled={busy} style={{ ...(following ? BTN.secondary : BTN.primary), height: 46, padding: '0 26px', marginRight: 'auto' }}>
              {following ? <><Check size={17} /> Following</> : 'Follow'}
            </button>
            {photo?.spotifyUrl && (
              <a href={photo.spotifyUrl} target="_blank" rel="noopener noreferrer" aria-label={`Listen to ${artist.name} on Spotify`} title="Listen on Spotify" style={{ ...roundBtn, width: 44, height: 44, borderRadius: 22, color: '#1ED760' }}><SpotifyLogo size={19} /></a>
            )}
            {artist.instagram && (
              <a href={`https://instagram.com/${artist.instagram}`} target="_blank" rel="noopener noreferrer" aria-label={`${artist.name} on Instagram`} style={{ ...roundBtn, width: 44, height: 44, borderRadius: 22 }}><Instagram size={18} /></a>
            )}
            {artist.xHandle && (
              <a href={`https://x.com/${artist.xHandle}`} target="_blank" rel="noopener noreferrer" aria-label={`${artist.name} on X`} style={{ ...roundBtn, width: 44, height: 44, borderRadius: 22 }}><XLogo size={15} /></a>
            )}
            {isAdmin && (
              <button type="button" onClick={() => setPhotoSheet(true)} aria-label="Change photo" title="Change photo" style={{ ...roundBtn, width: 44, height: 44, borderRadius: 22 }}><Camera size={17} /></button>
            )}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '30px 20px 120px' }}>
        <section id="shows" style={{ scrollMarginTop: 90 }}>
          {next ? (
            <>
              <SectionTitle>Next show</SectionTitle>
              <NextShow event={next} />
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '4px 0' }}>
              <span style={{ display: 'inline-flex', width: 48, height: 48, borderRadius: 24, flexShrink: 0, alignItems: 'center', justifyContent: 'center', background: 'rgba(123,227,168,0.1)', color: T.mintText }}><CalendarDays size={22} /></span>
              <span>
                <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 17, fontWeight: 700, color: T.white }}>No dates announced</span>
                <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.45, color: T.text2 }}>New shows land here as soon as they’re announced.</span>
              </span>
            </div>
          )}
        </section>

        {hosted.length > 0 && (
          <section style={{ marginTop: 40 }}>
            <SectionTitle>{artist.name}’s own shows</SectionTitle>
            <p style={{ margin: '-6px 0 6px', fontFamily: FONT.sans, fontSize: 14, color: T.text3 }}>Follow a show to hear about every new edition.</p>
            {hosted.map((s) => <SeriesRow key={s.slug} s={s} />)}
          </section>
        )}

        {later.length > 0 && (
          <section style={{ marginTop: 40 }}>
            <SectionTitle>More dates</SectionTitle>
            {later.map((e) => <ShowRow key={e.slug} event={e} fallback={photo?.url} />)}
          </section>
        )}

        {bio && (
          <section style={{ marginTop: 40 }}>
            <SectionTitle>About</SectionTitle>
            <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 15.5, lineHeight: 1.65, color: 'rgba(255,255,255,0.82)', ...(bioOpen ? {} : { display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }) }}>{bio.text}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10 }}>
              {!bioOpen && bio.text.length > 260 && (
                <button type="button" onClick={() => setBioOpen(true)} style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: T.mintText }}>Read more</button>
              )}
              <a href={bio.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: FONT.sans, fontSize: 12.5, color: T.text3, textDecoration: 'none' }}>From Wikipedia</a>
            </div>
          </section>
        )}

        {reel.length > 0 && (
          <section id="moments" style={{ marginTop: 40, scrollMarginTop: 90 }}>
            <SectionTitle action={<Link href={`/moments?artist=${artist.slug}`} style={{ fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: T.mintText, textDecoration: 'none' }}>See all</Link>}>Moments</SectionTitle>
            <MomentsStrip list={reel} onOpen={(i) => setViewer({ list: reel, start: i, title: artist.name })} />
          </section>
        )}

        {pastShows.length > 0 && (
          <section style={{ marginTop: 40 }}>
            <SectionTitle>Recent shows</SectionTitle>
            {(allPast ? pastShows : pastShows.slice(0, 6)).map((s) => (
              <PastRow key={s.key} show={s} rating={s.event ? ratings[s.event.slug] : undefined} onPlay={() => setViewer({ list: s.moments, start: 0, title: s.title })} fallback={photo?.url} />
            ))}
            {pastShows.length > 6 && !allPast && (
              <button type="button" onClick={() => setAllPast(true)} style={{ marginTop: 6, padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: T.mintText }}>
                Show all {pastShows.length}
              </button>
            )}
          </section>
        )}

        {spotifyId && (
          <section style={{ marginTop: 40 }}>
            <SectionTitle>Listen</SectionTitle>
            <iframe title={`${artist.name} on Spotify`} src={`https://open.spotify.com/embed/artist/${spotifyId}?utm_source=generator&theme=0`} width="100%" height="352" loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" style={{ display: 'block', border: 'none', borderRadius: 16, background: 'rgba(255,255,255,0.04)' }} />
          </section>
        )}

        {similar.length > 0 && (
          <section style={{ marginTop: 44 }}>
            <SectionTitle>Fans also like</SectionTitle>
            <div className="no-scrollbar" style={{ display: 'flex', gap: 16, overflowX: 'auto', margin: '0 -20px', padding: '6px 20px 2px' }}>
              {similar.map((a) => (
                <Link key={a.slug} href={`/artists/${a.slug}`} style={{ width: 88, flexShrink: 0, textAlign: 'center', textDecoration: 'none' }}>
                  <Portrait name={a.name} url={a.photo} size={84} ring={a.touring} />
                  <span style={{ display: 'block', marginTop: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT.display, fontSize: 13, fontWeight: 700, color: T.white }}>{a.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Spotify photos are credited by the Spotify button up top; Creative Commons photos need their credit here */}
        {photo && photo.source !== 'spotify' && (photo.credit || photo.license) && (
          <p style={{ margin: '40px 0 0', fontFamily: FONT.sans, fontSize: 11, lineHeight: 1.4, color: T.text3, textAlign: 'center' }}>
            Photo{photo.credit ? `: ${photo.credit.length > 60 ? `${photo.credit.slice(0, 58)}…` : photo.credit}` : ''}
            {photo.license && <> · {photo.sourceUrl
              ? <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>{photo.license}, via Wikimedia Commons</a>
              : photo.license}</>}
          </p>
        )}
      </main>

      {photoSheet && (
        <ArtistPhotoSheet slug={artist.slug} name={artist.name} current={photo} onClose={() => setPhotoSheet(false)}
          onSaved={(p) => { setPhoto(p); setPhotoSheet(false); }} />
      )}
    </div>
  );
}
