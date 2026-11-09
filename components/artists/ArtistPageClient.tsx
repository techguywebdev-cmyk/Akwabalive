'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Instagram, Share2, Check, CalendarDays, Camera } from 'lucide-react';
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

function Stat({ value, label, href }: { value: string; label: string; href?: string }) {
  const body = (
    <>
      <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>{value}</span>
      <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, color: T.text3 }}>{label}</span>
    </>
  );
  const style: React.CSSProperties = { flex: 1, minWidth: 0, textAlign: 'center', textDecoration: 'none' };
  return href ? <a href={href} style={style}>{body}</a> : <span style={style}>{body}</span>;
}

export default function ArtistPageClient({ artist, events, moments = [], photo: initialPhoto = null, hosted = [], similar = [] }: {
  artist: Artist; events: GhanaEvent[]; moments?: Moment[]; photo?: ArtistPhoto | null; hosted?: SeriesSummary[]; similar?: SimilarArtist[];
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
      if (navigator.share) { await navigator.share({ title: `${artist.name} shows on Akwaaba`, url }); return; }
      await navigator.clipboard.writeText(url);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    } catch { /* dismissed */ }
  }

  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed' }}>
      <Nav back="/artists" tabs actions={
        <button type="button" onClick={share} aria-label="Share artist" style={{ ...roundBtn, width: 44, height: 44, borderRadius: 22 }}>{copied ? <Check size={18} /> : <Share2 size={18} />}</button>
      } />

      {/* Hero: round portrait over a soft blur of the same photo */}
      <header style={{ position: 'relative', overflow: 'hidden', padding: 'calc(80px + env(safe-area-inset-top, 0px)) 20px 6px', textAlign: 'center' }}>
        {backdrop && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={backdrop} alt="" aria-hidden style={{ position: 'absolute', inset: -60, width: 'calc(100% + 120px)', height: 'calc(100% + 120px)', objectFit: 'cover', filter: 'blur(48px) saturate(1.25)', opacity: 0.5 }} />
        )}
        <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,12,11,0.25) 0%, rgba(10,12,11,0.5) 50%, rgba(9,11,10,0.98) 100%)' }} />
        <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto' }}>
          <span style={{ display: 'block', width: 168, margin: '0 auto 20px', borderRadius: '50%', boxShadow: '0 18px 50px rgba(0,0,0,0.45)' }}>
            <Portrait name={artist.name} url={photo?.url} size={168} ring={upcoming.length > 0} />
          </span>
          <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.mintText }}>
            Artist{artist.genre ? ` · ${artist.genre}` : ''}
          </p>
          <h1 style={{ margin: '6px 0 0', fontFamily: FONT.display, fontSize: artist.name.length > 12 ? 42 : 52, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1, color: T.white, textShadow: '0 2px 24px rgba(0,0,0,0.3)' }}>{artist.name}</h1>

          <div style={{ display: 'flex', alignItems: 'stretch', maxWidth: 340, margin: '20px auto 0' }}>
            <Stat value={followers === null ? '–' : compactCount(followers)} label={followers === 1 ? 'Follower' : 'Followers'} />
            <span aria-hidden style={{ width: 1, background: T.hairlineStrong }} />
            <Stat value={String(upcoming.length)} label="Upcoming" href={upcoming.length ? '#shows' : undefined} />
            <span aria-hidden style={{ width: 1, background: T.hairlineStrong }} />
            <Stat value={String(moments.length)} label="Moments" href={moments.length ? '#moments' : undefined} />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'center' }}>
            <button type="button" onClick={toggle} disabled={busy} style={{ ...(following ? BTN.secondary : BTN.primary), flex: 1, maxWidth: 240, height: 46 }}>
              {following ? <><Check size={17} /> Following</> : 'Follow'}
            </button>
            {photo?.spotifyUrl && (
              <a href={photo.spotifyUrl} target="_blank" rel="noopener noreferrer" aria-label={`Listen to ${artist.name} on Spotify`} title="Listen on Spotify" style={{ ...roundBtn, color: '#1ED760' }}><SpotifyLogo size={20} /></a>
            )}
            {artist.instagram && (
              <a href={`https://instagram.com/${artist.instagram}`} target="_blank" rel="noopener noreferrer" aria-label={`${artist.name} on Instagram`} style={roundBtn}><Instagram size={19} /></a>
            )}
            {artist.xHandle && (
              <a href={`https://x.com/${artist.xHandle}`} target="_blank" rel="noopener noreferrer" aria-label={`${artist.name} on X`} style={roundBtn}><XLogo size={16} /></a>
            )}
            {isAdmin && (
              <button type="button" onClick={() => setPhotoSheet(true)} aria-label="Change photo" title="Change photo" style={roundBtn}><Camera size={18} /></button>
            )}
          </div>
          {!following && (
            <p style={{ margin: '12px 0 0', fontFamily: FONT.sans, fontSize: 13, color: T.text3 }}>Follow to see new {artist.name} dates first.</p>
          )}
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
            {later.map((e) => <ShowRow key={e.slug} event={e} />)}
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
            <SectionTitle>Past shows</SectionTitle>
            {(allPast ? pastShows : pastShows.slice(0, 6)).map((s) => (
              <PastRow key={s.key} show={s} rating={s.event ? ratings[s.event.slug] : undefined} onPlay={() => setViewer({ list: s.moments, start: 0, title: s.title })} />
            ))}
            {pastShows.length > 6 && !allPast && (
              <button type="button" onClick={() => setAllPast(true)} style={{ marginTop: 6, padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: T.mintText }}>
                Show all {pastShows.length}
              </button>
            )}
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
