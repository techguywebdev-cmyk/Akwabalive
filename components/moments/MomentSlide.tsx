'use client';

import { useIsAdmin } from '@/hooks/useIsAdmin';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Bell, BellRing, CalendarDays, CalendarPlus, MapPin, MessageSquareText, Share2, Ticket } from 'lucide-react';
import AddToCalendar from '@/components/calendars/AddToCalendar';
import { useFollow } from '@/components/follow/useFollow';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/lib/supabase/types';
import CustomPlayer, { type CustomPlayerHandle } from '@/components/moments/CustomPlayer';
import CommentsSheet from '@/components/moments/CommentsSheet';
import GiftSheet from '@/components/moments/GiftSheet';
import ArtistQuickSheet from '@/components/moments/ArtistQuickSheet';
import { formatCount, type Comment, type Moment } from '@/components/moments/types';
import { useMomentComments } from '@/hooks/useMomentComments';
import { useNextEdition } from '@/hooks/useNextEdition';
import { useMomentCrowd } from '@/hooks/useMomentCrowd';
import { justHappened } from '@/hooks/useMoments';
import { useVideoColour } from '@/hooks/useVideoColour';
import { SERIES, momentInSeries } from '@/lib/data/series';
import { countdown, priceLine, Portrait } from '@/components/artists/parts';
import { useMomentInfo, type OnStage } from '@/hooks/useMomentInfo';
import { CATEGORIES } from '@/lib/moments/categorize';
import { parseDay, shortDay } from '@/lib/dates';
import { T, FONT, GRAD } from '@/lib/thiscene';
import { useRatingSummaries } from '@/lib/ratings';
import { Stars } from '@/components/ratings/Stars';
import { RateSheet, type RateStatus } from '@/components/ratings/RatingSection';
import { createClient } from '@/lib/supabase/client';

export type SlideHandle = { toggleMute: () => void };

const still = (id: string) => `https://i.ytimg.com/vi/${id}/hq720.jpg`;
const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

const iconBtn = (on: boolean, mint = false): React.CSSProperties => ({
  width: 38, height: 38, borderRadius: 12, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, textDecoration: 'none',
  ...(mint ? { background: GRAD.mint, color: T.onMint, border: 'none' }
    : on ? { background: 'rgba(123,227,168,0.14)', color: T.mintText, border: 'none'}
      : { background: 'rgba(255,255,255,0.07)', color: T.white, border: 'none' }),
});

const pill: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 10px', borderRadius: 999,
  fontFamily: FONT.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
};

/** Placeholder for a post on X (no thumbnail to show) */
function XTile({ small = false }: { small?: boolean }) {
  return (
    <span aria-hidden style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0b0b', color: '#fff', fontFamily: FONT.display, fontWeight: 800, fontSize: small ? 16 : 44 }}>𝕏</span>
  );
}

/** No next edition on sale yet: follow the show (or the headline act) to hear when it's back.
 *  Same shape as the ticket card: label, name, one short line, one button. */
function ShowFollowCard({ slug, name, artist, photo, tint, flash }: { slug: string; name: string; usually?: string; artist?: boolean; photo?: string | null; tint: string; flash: (m: string) => void }) {
  const { following, busy, toggle } = useFollow(artist ? 'artist' : 'series', slug);
  const one: React.CSSProperties = { display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 12, borderRadius: 20, background: `linear-gradient(120deg, rgba(${tint}, 0.32) 0%, rgba(255,255,255,0.05) 70%)`, border: 'none' }}>
      {artist ? <Portrait name={name} url={photo ?? null} size={46} /> : (
        <span aria-hidden style={{ width: 46, height: 46, borderRadius: 23, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)', color: T.mintText }}><Bell size={19} /></span>
      )}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ ...one, fontFamily: FONT.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.mintText }}>{artist ? 'Next show' : 'Next edition'}</span>
        <span style={{ ...one, marginTop: 3, fontFamily: FONT.display, fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>{name}</span>
        <span style={{ ...one, marginTop: 2, fontFamily: FONT.sans, fontSize: 13, color: T.text2 }}>{following ? 'You’ll hear first' : 'Not announced yet'}</span>
      </span>
      <button type="button" disabled={busy} aria-pressed={following} onClick={() => { toggle(); flash(following ? 'Reminder removed' : 'We’ll let you know'); }} style={{
        height: 38, padding: '0 14px', borderRadius: 999, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: FONT.sans, fontSize: 13, fontWeight: 700,
        ...(following ? { background: 'rgba(255,255,255,0.08)', color: T.white, border: 'none' } : { background: GRAD.mint, color: T.onMint, border: 'none' }),
      }}>
        {following ? <BellRing size={15} /> : <Bell size={15} />}{following ? 'On' : 'Remind me'}
      </button>
    </div>
  );
}

/**
 * One night, filling the screen. The video sits sharp at the top (swipe it sideways for the night's other clips),
 * tinted in its own colours; below it, the story of the night, who was on stage, and what to do next.
 * Only the slide on screen plays; its neighbours load in the background.
 */
const MomentSlide = forwardRef<SlideHandle, {
  moment: Moment; active: boolean; mounted: boolean; index: number; total: number;
  user: User | null; profile: Profile | null; onMuteChange: (m: boolean) => void; onEnded: () => void;
  initialSeek?: number | null; requireSignIn: () => boolean; flash: (m: string) => void;
  upNext?: Moment | null; onNext?: () => void; onCategory?: (c: string) => void; // upNext/onNext kept for the feed's API
}>(function MomentSlide({ moment: night, active, mounted, user, profile, onMuteChange, onEnded, initialSeek, requireSignIn, flash, onCategory }, ref) {
  const playerRef = useRef<CustomPlayerHandle>(null);
  useImperativeHandle(ref, () => ({ toggleMute: () => playerRef.current?.toggleMute() }));

  // ── The night's clips ─────────────────────────────────────────────
  const clips = useMemo(() => night._clips ?? [night], [night]);
  const [ci, setCi] = useState(0);
  const clip = clips[Math.min(ci, clips.length - 1)];
  const goClip = useCallback((i: number) => { if (i >= 0 && i < clips.length) { setCi(i); setT(0); setDur(0); } }, [clips.length]);
  // Everyone confirmed across all of the night's clips
  const nightMoment = useMemo<Moment>(() => {
    const all = clips.flatMap((c) => c.performers ?? []);
    const any = clips.some((c) => c.performers);
    return { ...night, performers: any ? Array.from(new Set(all)) : night.performers };
  }, [night, clips]);

  // Data only for slides near the screen
  const { comments, send, edit, remove, report } = useMomentComments(mounted ? clip.id : undefined);
  const isAdmin = useIsAdmin();
  const { next } = useNextEdition(mounted ? night : null);
  const commenterIds = useMemo(() => comments.map((c) => c.user_id), [comments]);
  const crowd = useMomentCrowd(mounted ? night.event_slug : undefined, next, commenterIds, user?.id);

  const [showComments, setShowComments] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [giftTarget, setGiftTarget] = useState<Comment | null>(null);
  const [more, setMore] = useState(false);
  const [artistOpen, setArtistOpen] = useState<OnStage | null>(null);
  const [rate, setRate] = useState<RateStatus | null>(null);
  const ratings = useRatingSummaries(mounted && night.event_slug ? [night.event_slug] : []);
  const rating = night.event_slug ? ratings[night.event_slug] : undefined;
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);

  const series = useMemo(() => SERIES.find((s) => momentInSeries(night, s)), [night]);
  const info = useMomentInfo(nightMoment, series, mounted);
  // The best words about the night: this clip's description, else the fullest from the night's other clips,
  // else a line built from what we've confirmed (who was on stage, where), else the show's blurb
  const recapClip = clips.find((c) => c.recap);
  const about = useMemo(() => {
    if (recapClip?.recap) return recapClip.recap;
    const best = [clip, ...clips].map((c) => c.description?.trim()).filter((x): x is string => !!x && x.length >= 40)
      .sort((a, b) => b.length - a.length)[0];
    if (clip.description && clip.description.length >= 100) return clip.description;
    if (best) return best;
    const acts = info.onStage.map((a) => a.name);
    if (acts.length) {
      const where = info.event?.venue ? ` at ${info.event.venue}` : '';
      const lead = acts[0], rest = acts.slice(1, 4);
      const guests = rest.length ? `, joined by ${rest.length > 1 ? `${rest.slice(0, -1).join(', ')} and ${rest[rest.length - 1]}` : rest[0]}` : '';
      const catchAll = / live( in .+)?$/i.test(night.event_name); // "Kelvyn Boy Live" is a stand-in, not a show name
      const what = catchAll ? `${lead} live${night.year ? ` in ${night.year}` : ''}` : `${lead} on stage at ${night.event_name}${night.year ? ` ${night.year}` : ''}`;
      return `${what}${where}${guests}.${series?.blurb ? ` ${series.blurb}` : ''}`;
    }
    return series?.blurb ?? null;
  }, [recapClip, clip, clips, info.onStage, info.event, night.event_name, night.year, series]);
  const tag = CATEGORIES.find((c) => c.key === night.category);
  const fresh = justHappened(night);
  const canGift = Boolean(next?.tiers?.some((x) => x.price > 0 && x.quantity - x.sold > 0)) && !next?.ticketUrl;
  const isX = clip.source === 'x';
  const tweetId = isX ? clip.source_url?.match(/status\/(\d+)/)?.[1] ?? null : null;
  const colour = useVideoColour(isX ? undefined : clip.youtube_id, mounted);

  const share = useCallback(async () => {
    const url = `${window.location.origin}/moments?id=${clip.id}`;
    try { if (navigator.share) { await navigator.share({ title: clip.title, text: `${clip.title} — ${night.event_name} on Akwaaba`, url }); return; } } catch { /* fall back */ }
    try { await navigator.clipboard.writeText(url); flash('Link copied'); } catch { /* ignore */ }
  }, [clip, night.event_name, flash]);

  // ── Rate the night here (ticket holders) ──────────────────────────
  const openRate = useCallback(async () => {
    if (!night.event_slug) return;
    if (requireSignIn()) return;
    const { data } = await createClient().rpc('my_rating_status', { p_slug: night.event_slug });
    const st = data as RateStatus | null;
    if (st?.can_rate) setRate(st);
    else flash(st?.reason === 'not_yet' ? 'You can rate it once the show has happened' : 'Couldn’t open ratings — try again');
  }, [night.event_slug, requireSignIn, flash]);

  const swallowClick = useRef(false);

  // ── Swipe the video sideways for the night's other clips ──────────
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { const p = e.touches[0]; swipe.current = { x: p.clientX, y: p.clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = swipe.current; swipe.current = null;
    if (!s || clips.length < 2) return;
    const p = e.changedTouches[0];
    const dx = p.clientX - s.x, dy = p.clientY - s.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { goClip(ci + (dx < 0 ? 1 : -1)); swallowClick.current = true; }
  };

  const nextDay = next ? parseDay(next.date) : null;
  const soon = next ? countdown(next.date) : null;
  const pct = dur ? Math.min(100, (t / dur) * 100) : 0;
  const when = info.event?.date ? parseDay(info.event.date) : null;
  const where = [info.event?.venue, info.event?.city ? info.event.city.charAt(0).toUpperCase() + info.event.city.slice(1) : null].filter(Boolean).join(', ');
  const tint = colour ?? '34, 96, 66';

  return (
    <section aria-label={clip.title}
      onClickCapture={(e) => { if (swallowClick.current) { swallowClick.current = false; e.stopPropagation(); e.preventDefault(); } }}
      style={{ position: 'relative', height: '100%', width: '100%', overflow: 'hidden', scrollSnapAlign: 'start', scrollSnapStop: 'always', background: '#050606' }}>
      {/* The whole screen washed in the video's own colours, fading to black at the bottom */}
      <span aria-hidden style={{
        position: 'absolute', inset: 0, transition: 'background 900ms ease',
        background: `linear-gradient(180deg, rgba(${tint}, 0.62) 0%, rgba(${tint}, 0.36) 30%, rgba(${tint}, 0.18) 62%, rgba(${tint}, 0.06) 85%, rgba(5,6,6,0) 100%)`,
      }} />
      <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 70% at 50% 110%, rgba(5,6,6,0.85) 0%, rgba(5,6,6,0) 60%)' }} />

      <div style={{ position: 'relative', height: '100%', maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)', boxSizing: 'border-box' }}>
        {/* Video, right at the top */}
        <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{
          position: 'relative', zIndex: 2, width: '100%', background: '#000', flexShrink: 0,
          ...(isX ? { height: 'min(62svh, 620px)' } : { aspectRatio: '16 / 9' }),
        }}>
          {isX ? (
            mounted && tweetId ? (
              <iframe key={tweetId} title={clip.title} src={`https://platform.twitter.com/embed/Tweet.html?id=${tweetId}&theme=dark&dnt=true&hideThread=true&lang=en`}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, background: '#000' }} allow="autoplay; encrypted-media; fullscreen" />
            ) : <XTile />
          ) : mounted ? (
            <CustomPlayer key={clip.youtube_id} ref={playerRef} youtubeId={clip.youtube_id} title={clip.title} fit="contain" hideMuteButton active={active}
              onMuteChange={active ? onMuteChange : undefined}
              onEnded={() => { if (ci < clips.length - 1) goClip(ci + 1); else onEnded(); }}
              initialSeekSeconds={ci === 0 ? initialSeek ?? null : null}
              onTimeUpdate={(a, b) => {
                if (!active) return;
                setT(a); setDur(b);
              }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={still(clip.youtube_id)} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
          {clips.length > 1 && (
            <span style={{ position: 'absolute', left: '50%', bottom: 10, transform: 'translateX(-50%)', zIndex: 9, display: 'flex', gap: 5, pointerEvents: 'none' }}>
              {clips.map((c, i) => <span key={c.id} style={{ width: i === ci ? 16 : 6, height: 6, borderRadius: 3, background: i === ci ? T.white : 'rgba(255,255,255,0.45)', transition: 'width 250ms ease' }} />)}
            </span>
          )}
          <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, zIndex: 9, background: 'rgba(255,255,255,0.16)', pointerEvents: 'none' }}>
            <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: T.mint, transition: 'width 250ms linear' }} />
          </span>
        </div>

        {/* Clips from this night */}
        {clips.length > 1 && (
          <div className="no-scrollbar" style={{ display: 'flex', gap: 8, padding: '10px 20px 0', overflowX: 'auto' }}>
            {clips.map((c, i) => (
              <button key={c.id} type="button" onClick={() => goClip(i)} aria-label={`Play ${c.title}`} aria-current={i === ci} style={{
                position: 'relative', width: 64, aspectRatio: '16 / 9', flexShrink: 0, padding: 0, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: '#000',
                border: 'none', outline: i === ci ? `2px solid ${T.mint}` : '1px solid rgba(255,255,255,0.12)', outlineOffset: i === ci ? 1 : 0, opacity: i === ci ? 1 : 0.7,
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {c.source === 'x' ? <XTile small /> : mounted && <img src={thumb(c.youtube_id)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
              </button>
            ))}
          </div>
        )}

        {/* About the night */}
        <div style={{ padding: '14px 20px 0', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {(fresh || tag) && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  {fresh && (
                    <span style={{ ...pill, background: GRAD.mint, color: T.onMint }}>
                      <span aria-hidden style={{ width: 6, height: 6, borderRadius: 3, background: T.onMint }} />Just happened
                    </span>
                  )}
                  {tag && (
                    <button type="button" onClick={() => onCategory?.(tag.key)} aria-label={`More ${tag.label.toLowerCase()}`} style={{
                      ...pill, cursor: 'pointer', background: 'rgba(255,255,255,0.07)', border: 'none', color: T.text,
                    }}>{tag.key === 'awards' ? 'Awards' : tag.label.replace(/s$/, '')}</button>
                  )}
                </div>
              )}
              <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.mintText }}>
                {series ? <Link href={`/shows/${series.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>{night.event_name}</Link> : night.event_name}
                {night.year ? ` · ${night.year}` : ''}
              </p>
              <h2 style={{ margin: '5px 0 0', fontFamily: FONT.display, fontSize: 'clamp(22px, 6vw, 30px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.1, color: T.white, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {clip.title}
              </h2>
              {/* Who posted the clip: right under the title, like a byline */}
              {clip.posted_by ? (
                <Link href={clip.channel_url ?? '#'} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 7, textDecoration: 'none', fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: T.text2 }}>
                  <BadgeCheck size={14} color={T.mint} />From the organiser{clip.channel_name ? ` · ${clip.channel_name}` : ''}
                </Link>
              ) : clip.channel_name && (
                <a href={isX ? clip.source_url ?? '#' : clip.channel_url ?? `https://www.youtube.com/watch?v=${clip.youtube_id}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 7, textDecoration: 'none', fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: T.text2 }}>
                  {clip.official ? <BadgeCheck size={14} color={T.mint} /> : null}{clip.official ? clip.channel_name : `via ${clip.channel_name}`}{isX ? ' on X' : ''}
                </a>
              )}
            </div>
            {/* Comments, share and tickets, kept small */}
            <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
              <button type="button" aria-label={`Comments (${comments.length})`} onClick={() => setShowComments(true)} style={{ ...iconBtn(false), position: 'relative' }}>
                <MessageSquareText size={17} />
                {comments.length > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 17, height: 17, padding: '0 4px', boxSizing: 'border-box', borderRadius: 9, background: T.white, color: '#050606', fontFamily: FONT.sans, fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    {formatCount(comments.length)}
                  </span>
                )}
              </button>
              <button type="button" aria-label="Share" onClick={share} style={iconBtn(false)}><Share2 size={16} /></button>
              {next && (
                <button type="button" aria-label={`Add ${next.title} to a calendar`} onClick={() => setCalOpen(true)} style={iconBtn(false)}><CalendarPlus size={17} /></button>
              )}
              {next && (
                <a href={next.ticketUrl ?? `/events/${next.slug}?tickets=1`} aria-label="Get tickets for the next edition" {...(next.ticketUrl ? { target: '_blank', rel: 'noopener noreferrer' } : {})} style={iconBtn(false, true)}>
                  <Ticket size={17} />
                </a>
              )}
            </div>
          </div>

          {(when || where) && (
            <p style={{ margin: '9px 0 0', display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT.sans, fontSize: 13, color: T.text2, minWidth: 0 }}>
              {when && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', flexShrink: 0 }}><CalendarDays size={14} />{shortDay(when)} {when.getFullYear()}</span>}
              {where && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0 }}><MapPin size={14} /><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{where}</span></span>}
            </p>
          )}

          {/* How the night was rated — tap to rate it (ticket holders) */}
          {night.event_slug ? (
            <button type="button" onClick={openRate} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 9, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}>
              <Stars value={rating?.overall ?? series?.stars ?? 0} size={15} />
              <span style={{ fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: rating || series?.stars ? T.white : T.text3 }}>
                {rating ? <>{rating.overall.toFixed(1)} <span style={{ fontWeight: 500, color: T.text3 }}>· {formatCount(rating.ratings)} rating{rating.ratings === 1 ? '' : 's'}</span></>
                  : series?.stars ? <>{series.stars % 1 ? series.stars.toFixed(1) : series.stars}/5 <span style={{ fontWeight: 500, color: T.text3 }}>· every year · Rate this night</span></>
                  : 'Rate this night'}
              </span>
            </button>
          ) : (
            <Link href={series ? `/shows/${series.slug}` : '#'} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 9, textDecoration: 'none' }}>
              <Stars value={series?.stars ?? 0} size={15} />
              <span style={{ fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: series?.stars ? T.white : T.text3 }}>
                {series?.stars ? <>{series.stars % 1 ? series.stars.toFixed(1) : series.stars}/5 <span style={{ fontWeight: 500, color: T.text3 }}>· every year</span></> : 'Not rated yet'}
              </span>
            </Link>
          )}

          {recapClip?.recap && (
            <p style={{ margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.mintText }}>
              <span aria-hidden style={{ width: 6, height: 6, borderRadius: 3, background: T.mint }} />The night, by Akwaaba
            </p>
          )}
          {about && (
            <p onClick={() => setMore((x) => !x)} style={{
              margin: recapClip?.recap ? '5px 0 0' : '10px 0 0', fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.5, color: recapClip?.recap ? T.text : T.text2, cursor: 'pointer',
              ...(more ? {} : { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }),
            }}>{about}</p>
          )}


          {/* Who was on stage — tap a face for a quick look */}
          {info.onStage.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.text3 }}>On stage</p>
              <div className="no-scrollbar" style={{ display: 'flex', gap: 14, marginTop: 9, overflowX: 'auto', marginRight: -20, paddingRight: 20 }}>
                {info.onStage.map((a) => (
                  <button key={a.slug} type="button" onClick={() => setArtistOpen(a)} style={{ width: 62, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}>
                    <Portrait name={a.name} url={a.photo} size={54} ring={a.host} />
                    <span style={{ width: '100%', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, color: T.text }}>{a.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        <div style={{ flex: 1, minHeight: 16 }} />

        {/* What's next for this show, full width: tickets for the next edition, or a reminder */}
        <div style={{ margin: '0 16px 14px', flexShrink: 0 }}>
          {next ? (
            <Link href={`/events/${next.slug}`} style={{
              position: 'relative', display: 'flex', alignItems: 'center', gap: 14, padding: 12, borderRadius: 20, overflow: 'hidden', textDecoration: 'none',
              background: `linear-gradient(120deg, rgba(${tint}, 0.32) 0%, rgba(255,255,255,0.05) 70%)`, border: 'none',
            }}>
              <span style={{ width: 46, height: 58, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.08)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {next.image && <img src={next.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.mintText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Next edition</span>
                <span style={{ display: 'block', marginTop: 3, fontFamily: FONT.display, fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: T.white, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{next.title}</span>
                <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 13, color: T.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {[nextDay ? shortDay(nextDay) : null, soon, crowd.goingCount ? `${formatCount(crowd.goingCount)} going` : priceLine(next)].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span style={{ height: 38, padding: '0 14px', borderRadius: 999, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, background: GRAD.mint, color: T.onMint, fontFamily: FONT.sans, fontSize: 13, fontWeight: 700 }}>
                <Ticket size={16} /> Tickets
              </span>
            </Link>
          ) : series ? (
            <ShowFollowCard slug={series.slug} name={series.name} usually={series.usually} tint={tint} flash={flash} />
          ) : info.onStage[0] ? (
            <ShowFollowCard slug={info.onStage[0].slug} name={info.onStage[0].name} artist photo={info.onStage[0].photo} tint={tint} flash={flash} />
          ) : null}
        </div>
      </div>

      {showComments && (
        <CommentsSheet moment={clip} comments={comments} user={user} profile={profile} currentSeconds={t}
          wasThereIds={crowd.wasThereIds} goingIds={crowd.goingIds} nextLabel={next?.date?.slice(0, 4) ?? null} canGift={canGift} tint={tint}
          onClose={() => setShowComments(false)} onSend={(text, parentId) => { if (user) send(user.id, text, profile ? { username: profile.username, full_name: profile.full_name ?? null, avatar_url: profile.avatar_url ?? null } : undefined, parentId); }}
          onEdit={(c, text) => edit(c.id, text)}
          onSeek={(s) => { playerRef.current?.seekTo(s); setShowComments(false); }} onGift={(c) => setGiftTarget(c)}
          onDelete={(c) => remove(c.id)} onReport={(c) => report(c.id)} isAdmin={isAdmin} />
      )}
      {giftTarget && next && user && <GiftSheet comment={giftTarget} next={next} user={user} onClose={() => setGiftTarget(null)} />}
      {artistOpen && <ArtistQuickSheet slug={artistOpen.slug} name={artistOpen.name} photo={artistOpen.photo} currentId={clip.id} onClose={() => setArtistOpen(null)} />}
      {calOpen && next && <AddToCalendar eventSlug={next.slug} eventTitle={next.title} onClose={() => setCalOpen(false)} />}

      {rate && night.event_slug && (
        <RateSheet slug={night.event_slug} title={night.event_name} status={rate} onClose={() => setRate(null)} onSaved={() => { setRate(null); flash('Thanks — your rating is live'); }} />
      )}
    </section>
  );
});

export default MomentSlide;
