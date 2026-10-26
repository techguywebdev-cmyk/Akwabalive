'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Instagram, Share2, Check, Play, CalendarDays, Camera } from 'lucide-react';
import type { Artist, GhanaEvent } from '@/lib/types';
import type { Moment } from '@/components/moments/types';
import Nav from '@/components/layout/Nav';
import { BTN } from '@/components/events/CardParts';
import { MomentsViewer } from '@/components/moments/EventMoments';
import { ytThumb } from '@/lib/moments/match';
import { getTiers } from '@/lib/events/tiers';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { parseDay, longDay } from '@/lib/dates';
import { hiRes } from '@/lib/events/image';
import { cityLabel } from '@/lib/utils';
import { T, FONT, GROUND } from '@/lib/thiscene';
import type { ArtistPhoto } from '@/lib/artists/photos';
import ArtistPhotoSheet from '@/components/artists/ArtistPhotoSheet';

const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

export function priceLine(e: GhanaEvent): string {
  if (e.priceUnknown || (e.listingType === 'listed' && !(e.price > 0))) return 'See prices';
  const prices = getTiers(e).map((t) => t.price).filter((p) => p > 0);
  const min = prices.length ? Math.min(...prices) : e.price;
  return min > 0 ? `From GH₵ ${min.toLocaleString()}` : 'Free entry';
}

/** "Venue, City", without repeating the city when the venue already names it */
const place = (e: GhanaEvent) => {
  const city = e.city ? cityLabel(e.city) : '';
  return city && !e.venue?.toLowerCase().includes(city.toLowerCase()) ? [e.venue, city].filter(Boolean).join(', ') : e.venue;
};

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k` : String(n));

const roundBtn: React.CSSProperties = {
  width: 46, height: 46, borderRadius: 23, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: T.white, cursor: 'pointer', textDecoration: 'none',
};

function SpotifyLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 1.5a10.5 10.5 0 1 0 0 21 10.5 10.5 0 0 0 0-21zm4.82 15.15a.66.66 0 0 1-.9.22c-2.48-1.51-5.6-1.85-9.27-1.01a.65.65 0 1 1-.29-1.28c4.02-.92 7.47-.52 10.24 1.17.31.19.41.59.22.9zm1.29-2.86a.82.82 0 0 1-1.13.27c-2.83-1.74-7.15-2.25-10.5-1.23a.82.82 0 0 1-.48-1.57c3.83-1.16 8.59-.6 11.84 1.4.39.24.51.75.27 1.13zm.11-2.98C14.82 8.79 9.2 8.6 5.95 9.59a.98.98 0 1 1-.57-1.88c3.73-1.13 9.94-.91 13.85 1.41a.98.98 0 0 1-1.01 1.69z" />
    </svg>
  );
}

function XLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3zm-1.08 16.2h1.7L7.4 4.7H5.57l11.1 14.5z" />
    </svg>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <h2 style={{ margin: '0 0 12px', fontFamily: FONT.display, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: T.white }}>{children}</h2>;
}

/** The next show: the flyer at full width, whole thing tappable */
function NextShow({ event }: { event: GhanaEvent }) {
  const d = parseDay(event.date);
  return (
    <Link href={`/events/${event.slug}`} style={{ display: 'block', textDecoration: 'none' }}>
      <span style={{ display: 'block', borderRadius: 24, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={hiRes(event.image, 1200) ?? event.image} alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
      </span>
      <span style={{ display: 'block', marginTop: 16, fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: T.mintText }}>
        {[d ? longDay(d) : event.dateLabel, event.time].filter(Boolean).join(' · ')}
      </span>
      <span style={{ display: 'block', marginTop: 4, fontFamily: FONT.display, fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, color: T.white }}>{event.title}</span>
      <span style={{ display: 'block', marginTop: 4, fontFamily: FONT.sans, fontSize: 15, color: T.text2 }}>{place(event)}</span>
      <span style={{ ...BTN.primary, width: '100%', marginTop: 16, boxSizing: 'border-box' }}>
        {event.price === 0 && !event.priceUnknown && event.listingType !== 'listed' ? 'Reserve a free spot' : 'Get tickets'}
        <span style={{ opacity: 0.65, fontWeight: 600 }}>· {priceLine(event)}</span>
      </span>
    </Link>
  );
}

function ShowRow({ event, past }: { event: GhanaEvent; past?: boolean }) {
  const d = parseDay(event.date);
  return (
    <Link href={`/events/${event.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', textDecoration: 'none', opacity: past ? 0.7 : 1 }}>
      <span style={{ width: 52, flexShrink: 0, textAlign: 'center' }}>
        <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: past ? T.text3 : T.mintText }}>
          {d ? d.toLocaleDateString('en-GB', { month: 'short' }) : '—'}
        </span>
        <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 26, fontWeight: 800, lineHeight: 1.05, color: T.white }}>{d ? d.getDate() : ''}</span>
      </span>
      <span style={{ width: 52, height: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.06)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {event.image && <img src={hiRes(event.image, 240) ?? event.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontFamily: FONT.display, fontSize: 16, fontWeight: 700, lineHeight: 1.25, color: T.white }}>{event.title}</span>
        <span style={{ display: 'block', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT.sans, fontSize: 13, color: T.text3 }}>
          {place(event)}{!past && ` · ${priceLine(event)}`}
        </span>
      </span>
    </Link>
  );
}

export default function ArtistPageClient({ artist, events, moments = [], photo: initialPhoto = null }: { artist: Artist; events: GhanaEvent[]; moments?: Moment[]; photo?: ArtistPhoto | null }) {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [followers, setFollowers] = useState<number | null>(null);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [photo, setPhoto] = useState<ArtistPhoto | null>(initialPhoto);
  const [isAdmin, setIsAdmin] = useState(false);
  const [photoSheet, setPhotoSheet] = useState(false);

  const t0 = today();
  const upcoming = events.filter((e) => { const d = parseDay(e.date); return !d || d >= t0; });
  const past = events.filter((e) => !upcoming.includes(e)).reverse();
  const [next, ...later] = upcoming;
  const backdrop = next?.image ?? past[0]?.image;

  useEffect(() => {
    supabase.from('artist_follows').select('*', { count: 'exact', head: true }).eq('artist_slug', artist.slug)
      .then(({ count }) => setFollowers(count ?? 0));
    if (user) {
      supabase.rpc('is_akwaaba_admin').then(({ data }) => setIsAdmin(data === true));
      supabase.from('artist_follows').select('artist_slug').eq('user_id', user.id).eq('artist_slug', artist.slug).maybeSingle()
        .then(({ data }) => setFollowing(!!data));
    }
  }, [artist.slug, supabase, user]);

  async function toggleFollow() {
    if (!user) { window.location.href = `/auth?next=${encodeURIComponent(`/artists/${artist.slug}`)}`; return; }
    setBusy(true);
    const was = following;
    setFollowing(!was);
    setFollowers((n) => (n ?? 0) + (was ? -1 : 1));
    const { error } = was
      ? await supabase.from('artist_follows').delete().eq('user_id', user.id).eq('artist_slug', artist.slug)
      : await supabase.from('artist_follows').insert({ user_id: user.id, artist_slug: artist.slug });
    if (error) { setFollowing(was); setFollowers((n) => (n ?? 0) + (was ? 1 : -1)); }
    setBusy(false);
  }

  async function share() {
    const url = `${window.location.origin}/artists/${artist.slug}`;
    try {
      if (navigator.share) { await navigator.share({ title: `${artist.name} shows on Akwaaba`, url }); return; }
      await navigator.clipboard.writeText(url);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    } catch { /* dismissed */ }
  }

  const stats = [
    upcoming.length ? `${upcoming.length} upcoming show${upcoming.length === 1 ? '' : 's'}` : 'No dates yet',
    followers ? `${compact(followers)} follower${followers === 1 ? '' : 's'}` : null,
    moments.length ? `${moments.length} moment${moments.length === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed' }}>
      <Nav back="/artists" tabs actions={
        <button type="button" onClick={share} aria-label="Share artist" style={{ ...roundBtn, width: 44, height: 44, borderRadius: 22 }}>{copied ? <Check size={18} /> : <Share2 size={18} />}</button>
      } />

      {/* Hero: a round portrait over a soft blur of the same photo (or the latest flyer) */}
      <header style={{ position: 'relative', overflow: 'hidden', padding: 'calc(84px + env(safe-area-inset-top, 0px)) 20px 8px', textAlign: 'center' }}>
        {(photo?.url || backdrop) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo?.url ?? hiRes(backdrop!, 800) ?? backdrop!} alt="" aria-hidden style={{ position: 'absolute', inset: -60, width: 'calc(100% + 120px)', height: 'calc(100% + 120px)', objectFit: 'cover', filter: 'blur(48px) saturate(1.25)', opacity: 0.5 }} />
        )}
        <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,32,21,0.25) 0%, rgba(8,32,21,0.5) 55%, rgba(8,30,20,0.98) 100%)' }} />
        <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto' }}>
          <span style={{
            display: 'block', width: 176, height: 176, margin: '0 auto 20px', borderRadius: '50%', overflow: 'hidden',
            background: 'linear-gradient(150deg, #1E6E48 0%, #0B2A1C 75%)', boxShadow: '0 18px 50px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.1)',
          }}>
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.url} alt={artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 22%', display: 'block' }} />
            ) : (
              <span aria-hidden style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.display, fontSize: 58, fontWeight: 800, color: 'rgba(214,251,230,0.6)' }}>
                {artist.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            )}
          </span>
          <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.mintText }}>Artist</p>
          <h1 style={{ margin: '6px 0 0', fontFamily: FONT.display, fontSize: artist.name.length > 12 ? 46 : 56, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 0.98, color: T.white, textShadow: '0 2px 24px rgba(0,0,0,0.3)' }}>{artist.name}</h1>
          <p style={{ margin: '12px 0 0', fontFamily: FONT.sans, fontSize: 15, color: T.text2 }}>{stats}</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center' }}>
            <button type="button" onClick={toggleFollow} disabled={busy} style={{ ...(following ? BTN.secondary : BTN.primary), flex: 1, maxWidth: 260, height: 46 }}>
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
          {photo && (photo.source === 'spotify' ? (
            <p style={{ margin: '12px 0 0', fontFamily: FONT.sans, fontSize: 11, lineHeight: 1.4, color: T.text3 }}>
              Photo: <a href={photo.sourceUrl ?? '#'} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>Spotify</a>
            </p>
          ) : (photo.credit || photo.license) && (
            <p style={{ margin: '12px 0 0', fontFamily: FONT.sans, fontSize: 11, lineHeight: 1.4, color: T.text3 }}>
              Photo{photo.credit ? `: ${photo.credit.length > 60 ? `${photo.credit.slice(0, 58)}…` : photo.credit}` : ''}
              {photo.license && <> · {photo.sourceUrl
                ? <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>{photo.license}, via Wikimedia Commons</a>
                : photo.license}</>}
            </p>
          ))}
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px 120px' }}>
        {next ? (
          <section>
            <Eyebrow>Next show</Eyebrow>
            <NextShow event={next} />
          </section>
        ) : (
          <section style={{ padding: '24px 0 8px', textAlign: 'center' }}>
            <span style={{ display: 'inline-flex', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', background: 'rgba(123,227,168,0.1)', color: T.mintText }}><CalendarDays size={24} /></span>
            <p style={{ margin: '14px 0 0', fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: T.white }}>No dates announced</p>
            <p style={{ margin: '6px auto 0', maxWidth: 300, fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.5, color: T.text2 }}>
              New {artist.name} shows land here as soon as they’re announced. Follow to keep them on your radar.
            </p>
          </section>
        )}

        {later.length > 0 && (
          <section style={{ marginTop: 40 }}>
            <Eyebrow>More dates</Eyebrow>
            {later.map((e) => <ShowRow key={e.slug} event={e} />)}
          </section>
        )}

        {moments.length > 0 && (
          <section style={{ marginTop: 40 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Eyebrow>Moments</Eyebrow>
              <Link href={`/moments?artist=${artist.slug}`} style={{ fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: T.mintText, textDecoration: 'none' }}>See all</Link>
            </div>
            <div className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', margin: '0 -20px', padding: '0 20px', scrollSnapType: 'x mandatory' }}>
              {moments.slice(0, 12).map((m, i) => (
                <button key={m.id} type="button" onClick={() => setViewer(i)} style={{ flexShrink: 0, width: 220, padding: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', scrollSnapAlign: 'start' }}>
                  <span style={{ position: 'relative', display: 'block', aspectRatio: '16 / 10', borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ytThumb(m.youtube_id, 'hq')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ width: 40, height: 40, borderRadius: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(3,10,6,0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', color: T.white }}>
                        <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />
                      </span>
                    </span>
                    {m.year && <span style={{ position: 'absolute', left: 8, top: 8, padding: '3px 8px', borderRadius: 999, background: 'rgba(3,10,6,0.6)', fontFamily: FONT.sans, fontSize: 11, fontWeight: 600, color: T.white }}>{m.year}</span>}
                  </span>
                  <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: 9, fontFamily: FONT.display, fontSize: 14, fontWeight: 700, lineHeight: 1.3, color: T.white }}>{m.title}</span>
                  <span style={{ display: 'block', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT.sans, fontSize: 12, color: T.text3 }}>{m.event_name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section style={{ marginTop: 40 }}>
            <Eyebrow>Past shows</Eyebrow>
            {past.slice(0, 12).map((e) => <ShowRow key={e.slug} event={e} past />)}
          </section>
        )}
      </main>

      {photoSheet && (
        <ArtistPhotoSheet slug={artist.slug} name={artist.name} current={photo} onClose={() => setPhotoSheet(false)}
          onSaved={(p) => { setPhoto(p); setPhotoSheet(false); }} />
      )}
      {viewer !== null && (
        <MomentsViewer list={moments.slice(0, 12)} start={viewer} eventTitle={artist.name} onClose={() => setViewer(null)} />
      )}
    </div>
  );
}

