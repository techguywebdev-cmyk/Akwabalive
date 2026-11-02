'use client';

import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, CalendarDays, Check, ChevronDown, MapPin, MessageCircle, Send, Ticket, UserCheck } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/lib/supabase/types';
import CustomPlayer, { type CustomPlayerHandle } from '@/components/moments/CustomPlayer';
import CommentsSheet from '@/components/moments/CommentsSheet';
import GiftSheet from '@/components/moments/GiftSheet';
import { formatCount, type Comment, type Moment } from '@/components/moments/types';
import { useMomentComments } from '@/hooks/useMomentComments';
import { useNextEdition } from '@/hooks/useNextEdition';
import { useMomentCrowd } from '@/hooks/useMomentCrowd';
import { SERIES, momentInSeries } from '@/lib/data/series';
import { countdown, priceLine, Portrait } from '@/components/artists/parts';
import { useMomentInfo } from '@/hooks/useMomentInfo';
import { longDay, parseDay, shortDay } from '@/lib/dates';
import { T, FONT } from '@/lib/thiscene';
import { useRatingSummaries } from '@/lib/ratings';
import { Stars } from '@/components/ratings/Stars';

export type SlideHandle = { toggleMute: () => void };

const still = (id: string) => `https://i.ytimg.com/vi/${id}/hq720.jpg`;
const glow = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

const iconBtn = (on: boolean, mint = false): React.CSSProperties => ({
  width: 38, height: 38, borderRadius: 19, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, textDecoration: 'none',
  ...(mint ? { background: T.mint, color: T.onMint, border: 'none' }
    : on ? { background: 'rgba(123,227,168,0.14)', color: T.mintText, border: '1px solid rgba(123,227,168,0.4)' }
      : { background: 'rgba(255,255,255,0.07)', color: T.white, border: '1px solid rgba(255,255,255,0.14)' }),
});

/**
 * One moment, filling the screen: the video sharp at its real shape over a soft glow of itself,
 * the story of the night, then what to do next — tickets for the next edition, or a reminder.
 * Only the slide on screen plays; its neighbours load in the background.
 */
const MomentSlide = forwardRef<SlideHandle, {
  moment: Moment; active: boolean; mounted: boolean; index: number; total: number;
  user: User | null; profile: Profile | null; onMuteChange: (m: boolean) => void; onEnded: () => void;
  initialSeek?: number | null; requireSignIn: () => boolean; flash: (m: string) => void;
  upNext?: Moment | null; onNext?: () => void;
}>(function MomentSlide({ moment, active, mounted, user, profile, onMuteChange, onEnded, initialSeek, requireSignIn, flash, upNext, onNext }, ref) {
  const playerRef = useRef<CustomPlayerHandle>(null);
  useImperativeHandle(ref, () => ({ toggleMute: () => playerRef.current?.toggleMute() }));

  // Data only for slides near the screen
  const { comments, send } = useMomentComments(mounted ? moment.id : undefined);
  const { next } = useNextEdition(mounted ? moment : null);
  const commenterIds = useMemo(() => comments.map((c) => c.user_id), [comments]);
  const crowd = useMomentCrowd(mounted ? moment.event_slug : undefined, next, commenterIds, user?.id);

  const [showComments, setShowComments] = useState(false);
  const [giftTarget, setGiftTarget] = useState<Comment | null>(null);
  const [more, setMore] = useState(false);
  const ratings = useRatingSummaries(mounted && moment.event_slug ? [moment.event_slug] : []);
  const rating = moment.event_slug ? ratings[moment.event_slug] : undefined;
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);

  const series = useMemo(() => SERIES.find((s) => momentInSeries(moment, s)), [moment]);
  const info = useMomentInfo(moment, series, mounted);
  const about = moment.description ?? series?.blurb ?? null;
  const canGift = Boolean(next?.tiers?.some((x) => x.price > 0 && x.quantity - x.sold > 0)) && !next?.ticketUrl;

  const share = useCallback(async () => {
    const url = `${window.location.origin}/moments?id=${moment.id}`;
    try { if (navigator.share) { await navigator.share({ title: moment.title, text: `${moment.title} — ${moment.event_name} on Akwaaba`, url }); return; } } catch { /* fall back */ }
    try { await navigator.clipboard.writeText(url); flash('Link copied'); } catch { /* ignore */ }
  }, [moment, flash]);

  const nextDay = next ? parseDay(next.date) : null;
  const soon = next ? countdown(next.date) : null;
  const pct = dur ? Math.min(100, (t / dur) * 100) : 0;

  const when = info.event?.date ? parseDay(info.event.date) : null;
  const where = [info.event?.venue, info.event?.city ? info.event.city.charAt(0).toUpperCase() + info.event.city.slice(1) : null].filter(Boolean).join(', ');

  return (
    <section aria-label={moment.title} style={{ position: 'relative', height: '100%', width: '100%', overflow: 'hidden', scrollSnapAlign: 'start', scrollSnapStop: 'always', background: '#050606' }}>
      {/* A soft glow of the video behind everything — only for slides near the screen (blur is costly on phones) */}
      {mounted && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={glow(moment.youtube_id)} alt="" aria-hidden
          style={{ position: 'absolute', top: 0, left: '-10%', width: '120%', height: '55%', objectFit: 'cover', filter: 'blur(30px) saturate(1.25)', opacity: 0.4 }} />
      )}
      <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,6,6,0.2) 0%, rgba(5,6,6,0.75) 38%, #050606 58%)' }} />

      <div style={{ position: 'relative', height: '100%', maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)', boxSizing: 'border-box' }}>
        {/* Video, right at the top */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#000', flexShrink: 0 }}>
          {mounted ? (
            <CustomPlayer ref={playerRef} youtubeId={moment.youtube_id} title={moment.title} fit="contain" hideMuteButton active={active}
              onMuteChange={active ? onMuteChange : undefined} onEnded={onEnded}
              initialSeekSeconds={initialSeek ?? null} onTimeUpdate={(a, b) => { if (active) { setT(a); setDur(b); } }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={still(moment.youtube_id)} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
          <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, zIndex: 9, background: 'rgba(255,255,255,0.16)', pointerEvents: 'none' }}>
            <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: T.mint, transition: 'width 250ms linear' }} />
          </span>
        </div>

        {/* About the night */}
        <div style={{ padding: '16px 20px 0', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.mintText }}>
                {series ? <Link href={`/shows/${series.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>{moment.event_name}</Link> : moment.event_name}
                {moment.year ? ` · ${moment.year}` : ''}
              </p>
              <h2 style={{ margin: '5px 0 0', fontFamily: FONT.display, fontSize: 'clamp(22px, 6vw, 30px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.1, color: T.white, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {moment.title}
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

          {/* How the night was rated by people who went */}
          <Link href={moment.event_slug ? `/events/${moment.event_slug}#ratings` : series ? `/shows/${series.slug}` : '#'} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 9, textDecoration: 'none' }}>
            <Stars value={rating?.overall ?? 0} size={15} />
            <span style={{ fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: rating ? T.white : T.text3 }}>
              {rating ? <>{rating.overall.toFixed(1)} <span style={{ fontWeight: 500, color: T.text3 }}>· {formatCount(rating.ratings)} rating{rating.ratings === 1 ? '' : 's'}</span></> : 'Not rated yet'}
            </span>
          </Link>
          {moment.channel_name && (
            <a href={moment.channel_url ?? `https://www.youtube.com/watch?v=${moment.youtube_id}`} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 12, textDecoration: 'none', fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, color: T.text3, verticalAlign: 'middle' }}>
              {moment.official ? <BadgeCheck size={13} color={T.mint} /> : null}{moment.official ? moment.channel_name : `via ${moment.channel_name}`}
            </a>
          )}

          {about && (
            <p onClick={() => setMore((x) => !x)} style={{
              margin: '10px 0 0', fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.5, color: T.text2, cursor: 'pointer',
              ...(more ? {} : { display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }),
            }}>{about}</p>
          )}

          {/* Who was on stage */}
          {info.onStage.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.text3 }}>On stage</p>
              <div className="no-scrollbar" style={{ display: 'flex', gap: 14, marginTop: 9, overflowX: 'auto', marginRight: -20, paddingRight: 20 }}>
                {info.onStage.map((a) => (
                  <Link key={a.slug} href={`/artists/${a.slug}`} style={{ width: 62, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                    <Portrait name={a.name} url={a.photo} size={54} ring={a.host} />
                    <span style={{ width: '100%', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, color: T.text }}>{a.name}</span>
                  </Link>
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
          <button type="button" onClick={onNext} style={{ margin: '0 16px 12px', padding: 10, borderRadius: 18, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <span style={{ position: 'relative', width: 104, aspectRatio: '16 / 9', borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: '#000' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {mounted && <img src={glow(upNext.youtube_id)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.text3 }}>Up next</span>
              <span style={{ marginTop: 3, fontFamily: FONT.display, fontSize: 15, fontWeight: 700, lineHeight: 1.25, color: T.white, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{upNext.title}</span>
              <span style={{ display: 'block', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT.sans, fontSize: 12, color: T.text3 }}>{upNext.event_name}{upNext.year ? ` · ${upNext.year}` : ''}</span>
            </span>
            <ChevronDown size={20} color={T.text3} style={{ flexShrink: 0 }} />
          </button>
        ) : (
          <Link href="/" style={{ margin: '0 16px 12px', height: 50, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: T.white, flexShrink: 0 }}>
            You’re all caught up · See what’s on
          </Link>
        )}
      </div>

      {showComments && (
        <CommentsSheet moment={moment} comments={comments} user={user} profile={profile} currentSeconds={t}
          wasThereIds={crowd.wasThereIds} goingIds={crowd.goingIds} nextLabel={next?.date?.slice(0, 4) ?? null} canGift={canGift}
          onClose={() => setShowComments(false)} onSend={(text) => { if (user) send(user.id, text); }}
          onSeek={(s) => { playerRef.current?.seekTo(s); setShowComments(false); }} onGift={(c) => setGiftTarget(c)} />
      )}
      {giftTarget && next && user && <GiftSheet comment={giftTarget} next={next} user={user} onClose={() => setGiftTarget(null)} />}
    </section>
  );
});

export default MomentSlide;
