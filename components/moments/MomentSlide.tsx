'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, CalendarDays, Check, ChevronDown, MapPin, MessageCircle, Send, Ticket, UserCheck } from 'lucide-react';
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
import { longDay, parseDay, shortDay } from '@/lib/dates';
import { T, FONT } from '@/lib/thiscene';
import { useRatingSummaries } from '@/lib/ratings';
import { Stars } from '@/components/ratings/Stars';
import { RateSheet, type RateStatus } from '@/components/ratings/RatingSection';
import { createClient } from '@/lib/supabase/client';

export type SlideHandle = { toggleMute: () => void };

const still = (id: string) => `https://i.ytimg.com/vi/${id}/hq720.jpg`;
const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
const LEAN_AFTER = 4000; // ms of untouched playback before the info steps back

const iconBtn = (on: boolean, mint = false): React.CSSProperties => ({
  width: 38, height: 38, borderRadius: 19, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, textDecoration: 'none',
  ...(mint ? { background: T.mint, color: T.onMint, border: 'none' }
    : on ? { background: 'rgba(123,227,168,0.14)', color: T.mintText, border: '1px solid rgba(123,227,168,0.4)' }
      : { background: 'rgba(255,255,255,0.07)', color: T.white, border: '1px solid rgba(255,255,255,0.14)' }),
});

const pill: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 10px', borderRadius: 999,
  fontFamily: FONT.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
};

/**
 * One night, filling the screen. The video sits sharp at the top (swipe it sideways for the night's other clips),
 * tinted in its own colours; below it, the story of the night, who was on stage, and what to do next.
 * While it plays untouched, everything else steps back so the video has the screen (lean-back).
 * Only the slide on screen plays; its neighbours load in the background.
 */
const MomentSlide = forwardRef<SlideHandle, {
  moment: Moment; active: boolean; mounted: boolean; index: number; total: number;
  user: User | null; profile: Profile | null; onMuteChange: (m: boolean) => void; onEnded: () => void;
  initialSeek?: number | null; requireSignIn: () => boolean; flash: (m: string) => void;
  upNext?: Moment | null; onNext?: () => void; onCategory?: (c: string) => void;
}>(function MomentSlide({ moment: night, active, mounted, user, profile, onMuteChange, onEnded, initialSeek, requireSignIn, flash, upNext, onNext, onCategory }, ref) {
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
  const { comments, send } = useMomentComments(mounted ? clip.id : undefined);
  const { next } = useNextEdition(mounted ? night : null);
  const commenterIds = useMemo(() => comments.map((c) => c.user_id), [comments]);
  const crowd = useMomentCrowd(mounted ? night.event_slug : undefined, next, commenterIds, user?.id);

  const [showComments, setShowComments] = useState(false);
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
  const about = clip.description ?? night.description ?? series?.blurb ?? null;
  const tag = CATEGORIES.find((c) => c.key === night.category);
  const fresh = justHappened(night);
  const canGift = Boolean(next?.tiers?.some((x) => x.price > 0 && x.quantity - x.sold > 0)) && !next?.ticketUrl;
  const colour = useVideoColour(clip.youtube_id, mounted);

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
    else flash(st?.reason === 'not_yet' ? 'You can rate it once the show has happened' : 'Only people with an Akwaaba ticket can rate this night');
  }, [night.event_slug, requireSignIn, flash]);

  // ── Lean-back: untouched playback lets the video have the screen ──
  const [lean, setLean] = useState(false);
  const touchedAt = useRef(Date.now());
  const playingAt = useRef(0);
  const lastT = useRef(0);
  const swallowClick = useRef(false);
  useEffect(() => {
    if (!active) { setLean(false); return; }
    touchedAt.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      if (now - touchedAt.current > LEAN_AFTER && now - playingAt.current < 1500) setLean(true);
    }, 600);
    return () => clearInterval(id);
  }, [active]);
  useEffect(() => { if (showComments || artistOpen || rate) setLean(false); }, [showComments, artistOpen, rate]);
  const wake = useCallback(() => {
    touchedAt.current = Date.now();
    if (lean) { setLean(false); swallowClick.current = true; }
  }, [lean]);

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
  const tint = colour ?? '40, 130, 85';
  const fade: React.CSSProperties = { opacity: lean ? 0 : 1, pointerEvents: lean ? 'none' : 'auto', transition: 'opacity 600ms ease' };

  return (
    <section aria-label={clip.title}
      onPointerDownCapture={wake}
      onClickCapture={(e) => { if (swallowClick.current) { swallowClick.current = false; e.stopPropagation(); e.preventDefault(); } }}
      style={{ position: 'relative', height: '100%', width: '100%', overflow: 'hidden', scrollSnapAlign: 'start', scrollSnapStop: 'always', background: '#050606' }}>
      {/* The video's own colour, glowing behind everything */}
      <span aria-hidden style={{
        position: 'absolute', inset: 0, transition: 'background 800ms ease',
        background: `radial-gradient(130% 55% at 50% ${lean ? '50%' : '8%'}, rgba(${tint}, ${colour ? 0.42 : 0.2}) 0%, rgba(${tint}, 0.1) 45%, rgba(5,6,6,0) 72%)`,
      }} />

      <div style={{ position: 'relative', height: '100%', maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)', boxSizing: 'border-box' }}>
        {/* Video, right at the top — centred on the screen in lean-back */}
        <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{
          position: 'relative', zIndex: 2, width: '100%', aspectRatio: '16 / 9', background: '#000', flexShrink: 0,
          transform: lean ? 'translateY(calc(50svh - 50% - env(safe-area-inset-top, 0px)))' : 'none', transition: 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
          boxShadow: lean ? `0 30px 120px rgba(${tint}, 0.35)` : 'none',
        }}>
          {mounted ? (
            <CustomPlayer key={clip.youtube_id} ref={playerRef} youtubeId={clip.youtube_id} title={clip.title} fit="contain" hideMuteButton active={active}
              onMuteChange={active ? onMuteChange : undefined}
              onEnded={() => { if (ci < clips.length - 1) goClip(ci + 1); else onEnded(); }}
              initialSeekSeconds={ci === 0 ? initialSeek ?? null : null}
              onTimeUpdate={(a, b) => {
                if (!active) return;
                if (a !== lastT.current) { lastT.current = a; playingAt.current = Date.now(); }
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
          <div className="no-scrollbar" style={{ ...fade, display: 'flex', gap: 8, padding: '10px 20px 0', overflowX: 'auto' }}>
            {clips.map((c, i) => (
              <button key={c.id} type="button" onClick={() => goClip(i)} aria-label={`Play ${c.title}`} aria-current={i === ci} style={{
                position: 'relative', width: 64, aspectRatio: '16 / 9', flexShrink: 0, padding: 0, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: '#000',
                border: 'none', outline: i === ci ? `2px solid ${T.mint}` : '1px solid rgba(255,255,255,0.12)', outlineOffset: i === ci ? 1 : 0, opacity: i === ci ? 1 : 0.7,
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {mounted && <img src={thumb(c.youtube_id)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
              </button>
            ))}
          </div>
        )}

        {/* About the night */}
        <div style={{ ...fade, padding: '14px 20px 0', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {(fresh || tag) && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  {fresh && (
                    <span style={{ ...pill, background: T.mint, color: T.onMint }}>
                      <span aria-hidden style={{ width: 6, height: 6, borderRadius: 3, background: T.onMint }} />Just happened
                    </span>
                  )}
                  {tag && (
                    <button type="button" onClick={() => onCategory?.(tag.key)} aria-label={`More ${tag.label.toLowerCase()}`} style={{
                      ...pill, cursor: 'pointer', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', color: T.text,
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
            </div>
            {/* Comments, share and tickets, kept small */}
            <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
              <button type="button" aria-label={`Comments (${comments.length})`} onClick={() => setShowComments(true)} style={{ ...iconBtn(false), position: 'relative' }}>
                <MessageCircle size={17} />
                {comments.length > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 17, height: 17, padding: '0 4px', boxSizing: 'border-box', borderRadius: 9, background: T.white, color: '#050606', fontFamily: FONT.sans, fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    {formatCount(comments.length)}
                  </span>
                )}
              </button>
              <button type="button" aria-label="Share" onClick={share} style={iconBtn(false)}><Send size={16} /></button>
              {next && (
                <a href={next.ticketUrl ?? `/events/${next.slug}?tickets=1`} aria-label="Get tickets for the next edition" {...(next.ticketUrl ? { target: '_blank', rel: 'noopener noreferrer' } : {})} style={iconBtn(false, true)}>
                  <Ticket size={17} />
                </a>
              )}
            </div>
          </div>

          {(when || where) && (
            <p style={{ margin: '9px 0 0', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontFamily: FONT.sans, fontSize: 13, color: T.text2 }}>
              {when && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><CalendarDays size={14} />{longDay(when)}</span>}
              {where && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0 }}><MapPin size={14} /><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{where}</span></span>}
            </p>
          )}

          {next && (
            <Link href={`/events/${next.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 9, textDecoration: 'none', fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: T.mintText }}>
              <Ticket size={14} style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Next edition {[nextDay ? shortDay(nextDay) : null, soon, priceLine(next), crowd.goingCount ? `${formatCount(crowd.goingCount)} going` : null].filter(Boolean).join(' · ')}
              </span>
            </Link>
          )}

          {/* How the night was rated — tap to rate it (ticket holders) */}
          {night.event_slug ? (
            <button type="button" onClick={openRate} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 9, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}>
              <Stars value={rating?.overall ?? 0} size={15} />
              <span style={{ fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: rating ? T.white : T.text3 }}>
                {rating ? <>{rating.overall.toFixed(1)} <span style={{ fontWeight: 500, color: T.text3 }}>· {formatCount(rating.ratings)} rating{rating.ratings === 1 ? '' : 's'}</span></> : 'Rate this night'}
              </span>
            </button>
          ) : (
            <Link href={series ? `/shows/${series.slug}` : '#'} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 9, textDecoration: 'none' }}>
              <Stars value={0} size={15} />
              <span style={{ fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: T.text3 }}>Not rated yet</span>
            </Link>
          )}
          {clip.channel_name && (
            <a href={clip.channel_url ?? `https://www.youtube.com/watch?v=${clip.youtube_id}`} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 12, textDecoration: 'none', fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, color: T.text3, verticalAlign: 'middle' }}>
              {clip.official ? <BadgeCheck size={13} color={T.mint} /> : null}{clip.official ? clip.channel_name : `via ${clip.channel_name}`}
            </a>
          )}

          {about && (
            <p onClick={() => setMore((x) => !x)} style={{
              margin: '10px 0 0', fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.5, color: T.text2, cursor: 'pointer',
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

          {/* Were you there? */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <button type="button" aria-pressed={crowd.iWasThere} onClick={() => { if (!requireSignIn()) crowd.toggleWasThere(); }} style={{
              height: 34, padding: '0 13px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: FONT.sans, fontSize: 13, fontWeight: 600,
              ...(crowd.iWasThere ? { background: 'rgba(123,227,168,0.14)', color: T.mintText, border: '1px solid rgba(123,227,168,0.4)' } : { background: 'rgba(255,255,255,0.06)', color: T.white, border: '1px solid rgba(255,255,255,0.12)' }),
            }}>
              {crowd.iWasThere ? <Check size={15} /> : <UserCheck size={15} />}{crowd.iWasThere ? 'You were there' : 'I was there'}
            </button>
            {crowd.thereCount > 0 && <span style={{ fontFamily: FONT.sans, fontSize: 13, color: T.text3 }}>{formatCount(crowd.thereCount)} {crowd.thereCount === 1 ? 'person was' : 'people were'} there</span>}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 16 }} />

        {/* Up next — fills the bottom and invites the swipe */}
        {upNext ? (
          <button type="button" onClick={onNext} style={{ ...fade, margin: '0 16px 12px', padding: 10, borderRadius: 18, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <span style={{ position: 'relative', width: 104, aspectRatio: '16 / 9', borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: '#000' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {mounted && <img src={thumb(upNext.youtube_id)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.text3 }}>Up next</span>
              <span style={{ marginTop: 3, fontFamily: FONT.display, fontSize: 15, fontWeight: 700, lineHeight: 1.25, color: T.white, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{upNext.title}</span>
              <span style={{ display: 'block', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT.sans, fontSize: 12, color: T.text3 }}>{upNext.event_name}{upNext.year ? ` · ${upNext.year}` : ''}</span>
            </span>
            <ChevronDown size={20} color={T.text3} style={{ flexShrink: 0 }} />
          </button>
        ) : (
          <Link href="/" style={{ ...fade, margin: '0 16px 12px', height: 50, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: T.white, flexShrink: 0 }}>
            You’re all caught up · See what’s on
          </Link>
        )}

        {/* In lean-back, a quiet hint at the bottom */}
        <span aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))', textAlign: 'center', fontFamily: FONT.sans, fontSize: 12, color: T.text3, opacity: lean ? 0.8 : 0, transition: 'opacity 600ms ease', pointerEvents: 'none' }}>
          Tap for details{clips.length > 1 ? ' · swipe the video for more clips' : ''}
        </span>
      </div>

      {showComments && (
        <CommentsSheet moment={clip} comments={comments} user={user} profile={profile} currentSeconds={t}
          wasThereIds={crowd.wasThereIds} goingIds={crowd.goingIds} nextLabel={next?.date?.slice(0, 4) ?? null} canGift={canGift}
          onClose={() => setShowComments(false)} onSend={(text) => { if (user) send(user.id, text); }}
          onSeek={(s) => { playerRef.current?.seekTo(s); setShowComments(false); }} onGift={(c) => setGiftTarget(c)} />
      )}
      {giftTarget && next && user && <GiftSheet comment={giftTarget} next={next} user={user} onClose={() => setGiftTarget(null)} />}
      {artistOpen && <ArtistQuickSheet slug={artistOpen.slug} name={artistOpen.name} photo={artistOpen.photo} currentId={clip.id} onClose={() => setArtistOpen(null)} />}
      {rate && night.event_slug && (
        <RateSheet slug={night.event_slug} title={night.event_name} status={rate} onClose={() => setRate(null)} onSaved={() => { setRate(null); flash('Thanks — your rating is live'); }} />
      )}
    </section>
  );
});

export default MomentSlide;
