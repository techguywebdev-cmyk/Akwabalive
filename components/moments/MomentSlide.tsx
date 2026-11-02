'use client';

import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Bell, BellRing, Heart, MessageCircle, Send, Ticket, UserCheck, Users } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/lib/supabase/types';
import CustomPlayer, { type CustomPlayerHandle } from '@/components/moments/CustomPlayer';
import CommentsSheet from '@/components/moments/CommentsSheet';
import GiftSheet from '@/components/moments/GiftSheet';
import { formatCount, type Comment, type Moment } from '@/components/moments/types';
import { useMomentComments } from '@/hooks/useMomentComments';
import { useMomentLikes } from '@/hooks/useMomentLikes';
import { useNextEdition } from '@/hooks/useNextEdition';
import { useMomentCrowd } from '@/hooks/useMomentCrowd';
import { useFollow } from '@/components/follow/useFollow';
import { SERIES, momentInSeries } from '@/lib/data/series';
import { detectArtistsFromText, getArtistBySlug } from '@/lib/data/artists';
import { countdown, priceLine } from '@/components/artists/parts';
import { parseDay, shortDay } from '@/lib/dates';
import { hiRes } from '@/lib/events/image';
import { T, FONT } from '@/lib/thiscene';
import { useRatingSummaries } from '@/lib/ratings';
import { Stars } from '@/components/ratings/Stars';

export type SlideHandle = { toggleMute: () => void };

const still = (id: string) => `https://i.ytimg.com/vi/${id}/hq720.jpg`;

/** Round action with its count under it */
function Action({ label, on, onClick, children, count, color = T.white }: { label: string; on?: boolean; onClick: () => void; children: React.ReactNode; count?: string; color?: string }) {
  return (
    <button type="button" aria-label={label} aria-pressed={on} onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: 0, border: 'none', background: 'none', cursor: 'pointer', minWidth: 56 }}>
      <span style={{
        width: 48, height: 48, borderRadius: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: on ? 'rgba(123,227,168,0.16)' : 'rgba(255,255,255,0.08)', border: `1px solid ${on ? 'rgba(123,227,168,0.4)' : 'rgba(255,255,255,0.12)'}`,
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', color,
      }}>{children}</span>
      <span style={{ fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, color: on ? T.mintText : T.text2 }}>{count ?? label}</span>
    </button>
  );
}

/** "Remind me" for a show or artist when there's no next edition on sale yet */
function FollowReminder({ kind, slug, label }: { kind: 'series' | 'artist'; slug: string; label: string }) {
  const { following, busy, toggle } = useFollow(kind, slug);
  return (
    <button type="button" onClick={toggle} disabled={busy} style={{
      width: '100%', height: 50, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
      fontFamily: FONT.display, fontSize: 15, fontWeight: 700,
      ...(following ? { background: 'rgba(255,255,255,0.08)', color: T.white, border: '1px solid rgba(255,255,255,0.14)' } : { background: T.mint, color: T.onMint, border: 'none' }),
    }}>
      {following ? <BellRing size={18} /> : <Bell size={18} />}{following ? `You’ll hear about ${label}` : `Remind me about ${label}`}
    </button>
  );
}

/**
 * One moment, filling the screen: the video sharp at its real shape over a soft glow of itself,
 * the story of the night, then what to do next — tickets for the next edition, or a reminder.
 * Only the slide on screen plays; its neighbours load in the background.
 */
const MomentSlide = forwardRef<SlideHandle, {
  moment: Moment; active: boolean; mounted: boolean; index: number; total: number;
  user: User | null; profile: Profile | null; onMuteChange: (m: boolean) => void; onEnded: () => void;
  initialSeek?: number | null; requireSignIn: () => boolean; flash: (m: string) => void;
}>(function MomentSlide({ moment, active, mounted, index, total, user, profile, onMuteChange, onEnded, initialSeek, requireSignIn, flash }, ref) {
  const playerRef = useRef<CustomPlayerHandle>(null);
  useImperativeHandle(ref, () => ({ toggleMute: () => playerRef.current?.toggleMute() }));

  // Data only for slides near the screen
  const { comments, send } = useMomentComments(mounted ? moment.id : undefined);
  const { liked, likeCount, toggle: toggleLike } = useMomentLikes(mounted ? moment.id : undefined, user?.id);
  const { next } = useNextEdition(mounted ? moment : null);
  const commenterIds = useMemo(() => comments.map((c) => c.user_id), [comments]);
  const crowd = useMomentCrowd(mounted ? moment.event_slug : undefined, next, commenterIds, user?.id);

  const [showComments, setShowComments] = useState(false);
  const [giftTarget, setGiftTarget] = useState<Comment | null>(null);
  const [burst, setBurst] = useState(false);
  const [more, setMore] = useState(false);
  const ratings = useRatingSummaries(mounted && moment.event_slug ? [moment.event_slug] : []);
  const rating = moment.event_slug ? ratings[moment.event_slug] : undefined;
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);

  const series = useMemo(() => SERIES.find((s) => momentInSeries(moment, s)), [moment]);
  const artist = useMemo(() => {
    const slug = detectArtistsFromText(moment.title, moment.event_name, moment.description).artistSlugs[0];
    return slug ? getArtistBySlug(slug) : undefined;
  }, [moment]);
  const canGift = Boolean(next?.tiers?.some((x) => x.price > 0 && x.quantity - x.sold > 0)) && !next?.ticketUrl;

  const share = useCallback(async () => {
    const url = `${window.location.origin}/moments?id=${moment.id}`;
    try { if (navigator.share) { await navigator.share({ title: moment.title, text: `${moment.title} — ${moment.event_name} on Akwaaba`, url }); return; } } catch { /* fall back */ }
    try { await navigator.clipboard.writeText(url); flash('Link copied'); } catch { /* ignore */ }
  }, [moment, flash]);

  const doubleTap = useCallback(() => {
    if (requireSignIn()) return;
    if (!liked) toggleLike();
    setBurst(true); setTimeout(() => setBurst(false), 700);
  }, [requireSignIn, liked, toggleLike]);

  const nextDay = next ? parseDay(next.date) : null;
  const soon = next ? countdown(next.date) : null;
  const pct = dur ? Math.min(100, (t / dur) * 100) : 0;

  return (
    <section aria-label={moment.title} style={{ position: 'relative', height: '100svh', width: '100%', overflow: 'hidden', scrollSnapAlign: 'start', scrollSnapStop: 'always', background: '#050606' }}>
      {/* Ambient glow from the video itself, so the screen is never empty */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={still(moment.youtube_id)} alt="" aria-hidden loading="lazy"
        onError={(e) => { const i = e.currentTarget; if (i.src.includes('hq720')) i.src = i.src.replace('hq720', 'hqdefault'); }}
        style={{ position: 'absolute', inset: '-10%', width: '120%', height: '120%', objectFit: 'cover', filter: 'blur(42px) saturate(1.3)', opacity: 0.55, transform: 'scale(1.1)' }} />
      <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,6,6,0.55) 0%, rgba(5,6,6,0.25) 30%, rgba(5,6,6,0.6) 60%, rgba(5,6,6,0.94) 100%)' }} />

      <div style={{ position: 'relative', height: '100%', maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', paddingTop: 'calc(72px + env(safe-area-inset-top, 0px))', paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))', boxSizing: 'border-box' }}>
        {/* Video */}
        <div style={{ position: 'relative', margin: '8px 0 0', width: '100%', aspectRatio: '16 / 9', background: '#000', boxShadow: '0 20px 60px rgba(0,0,0,0.55)' }}>
          {mounted ? (
            <CustomPlayer ref={playerRef} youtubeId={moment.youtube_id} title={moment.title} fit="contain" hideMuteButton active={active}
              onMuteChange={active ? onMuteChange : undefined} onEnded={onEnded} onDoubleTap={doubleTap}
              initialSeekSeconds={initialSeek ?? null} onTimeUpdate={(a, b) => { if (active) { setT(a); setDur(b); } }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={still(moment.youtube_id)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
          {burst && <span style={{ position: 'absolute', inset: 0, zIndex: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}><Heart size={76} fill="#F87171" color="#F87171" /></span>}
          <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, zIndex: 9, background: 'rgba(255,255,255,0.18)', pointerEvents: 'none' }}>
            <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: T.mint, transition: 'width 250ms linear' }} />
          </span>
        </div>

        {/* The story */}
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {moment.channel_name && (
              <a href={moment.channel_url ?? `https://www.youtube.com/watch?v=${moment.youtube_id}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px 5px 7px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', textDecoration: 'none', fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, color: T.text }}>
                <span aria-hidden style={{ width: 17, height: 12, borderRadius: 3.5, background: '#FF0033', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ width: 0, height: 0, borderLeft: '4.5px solid #fff', borderTop: '3px solid transparent', borderBottom: '3px solid transparent', marginLeft: 1 }} />
                </span>
                {moment.official ? <><BadgeCheck size={13} color={T.mint} />{moment.channel_name}</> : <>via {moment.channel_name}</>}
              </a>
            )}
            <span style={{ fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, color: T.text3 }}>{index + 1} of {total}</span>
          </div>
          <p style={{ margin: '14px 0 0', fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.mintText }}>
            {series ? <Link href={`/shows/${series.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>{moment.event_name}</Link> : moment.event_name}
            {moment.year ? ` · ${moment.year}` : ''}
          </p>
          <h2 style={{ margin: '5px 0 0', fontFamily: FONT.display, fontSize: 'clamp(24px, 6.6vw, 32px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.08, color: T.white, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {moment.title}
          </h2>
          {/* How the night was rated by people who went */}
          <Link href={moment.event_slug ? `/events/${moment.event_slug}#ratings` : '#'} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 8, textDecoration: 'none' }}>
            <Stars value={rating?.overall ?? 0} size={15} />
            <span style={{ fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: rating ? T.white : T.text3 }}>
              {rating ? <>{rating.overall.toFixed(1)} <span style={{ fontWeight: 500, color: T.text3 }}>· {formatCount(rating.ratings)} rating{rating.ratings === 1 ? '' : 's'}</span></> : 'Not rated yet'}
            </span>
          </Link>
          {moment.description && (
            <p onClick={() => setMore((x) => !x)} style={{
              margin: '8px 0 0', fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.5, color: T.text2, cursor: 'pointer',
              ...(more ? {} : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }),
            }}>{moment.description}</p>
          )}
          {crowd.thereCount > 0 && (
            <p style={{ margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT.sans, fontSize: 13, color: T.text2 }}>
              <Users size={14} /> {formatCount(crowd.thereCount)} {crowd.thereCount === 1 ? 'person was' : 'people were'} there
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px 0', maxWidth: 380 }}>
          <Action label={liked ? 'Unlike' : 'Like'} on={liked} count={formatCount(likeCount)} onClick={() => { if (!requireSignIn()) toggleLike(); }} color={liked ? '#F87171' : T.white}>
            <Heart size={21} fill={liked ? '#F87171' : 'none'} />
          </Action>
          <Action label="Comments" count={formatCount(comments.length)} onClick={() => setShowComments(true)}><MessageCircle size={21} /></Action>
          <Action label="I was there" on={crowd.iWasThere} count={crowd.iWasThere ? 'You were there' : 'I was there'} onClick={() => { if (!requireSignIn()) crowd.toggleWasThere(); }}>
            <UserCheck size={21} />
          </Action>
          <Action label="Share" onClick={share}><Send size={20} /></Action>
        </div>

        <div style={{ flex: 1, minHeight: 12 }} />

        {/* What next: tickets, or a reminder */}
        <div style={{ margin: '0 16px', padding: 14, borderRadius: 24, background: 'rgba(14,17,16,0.72)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
          {next ? (
            <>
              <Link href={`/events/${next.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                <span style={{ width: 52, height: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.06)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {next.image && <img src={hiRes(next.image, 240) ?? next.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.mintText }}>Next edition{soon ? ` · ${soon}` : ''}</span>
                  <span style={{ display: 'block', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT.display, fontSize: 17, fontWeight: 800, color: T.white }}>{next.title}</span>
                  <span style={{ display: 'block', marginTop: 1, fontFamily: FONT.sans, fontSize: 13, color: T.text2 }}>{[nextDay ? shortDay(nextDay) : null, priceLine(next), crowd.goingCount ? `${formatCount(crowd.goingCount)} going` : null].filter(Boolean).join(' · ')}</span>
                </span>
              </Link>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <a href={next.ticketUrl ?? `/events/${next.slug}?tickets=1`} {...(next.ticketUrl ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  style={{ flex: 1, height: 50, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: T.mint, color: T.onMint, textDecoration: 'none', fontFamily: FONT.display, fontSize: 15, fontWeight: 700 }}>
                  <Ticket size={18} /> Get tickets
                </a>
                <button type="button" aria-pressed={crowd.reminded} onClick={() => { if (requireSignIn()) return; crowd.toggleReminder(); flash(crowd.reminded ? 'Reminder removed' : 'We’ll remind you'); }}
                  style={{ height: 50, padding: '0 16px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontFamily: FONT.sans, fontSize: 14, fontWeight: 700,
                    ...(crowd.reminded ? { background: 'rgba(123,227,168,0.14)', color: T.mintText, border: '1px solid rgba(123,227,168,0.4)' } : { background: 'rgba(255,255,255,0.08)', color: T.white, border: '1px solid rgba(255,255,255,0.14)' }) }}>
                  {crowd.reminded ? <BellRing size={17} /> : <Bell size={17} />}{crowd.reminded ? 'Reminder on' : 'Remind me'}
                </button>
              </div>
            </>
          ) : series ? (
            <>
              <p style={{ margin: '0 0 10px', fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.45, color: T.text2 }}>
                <b style={{ color: T.white }}>{series.name}</b> comes back {series.usually.toLowerCase().startsWith('every') ? series.usually.split(' · ')[0].toLowerCase() : 'again'}. The next edition isn’t announced yet.
              </p>
              <FollowReminder kind="series" slug={series.slug} label={series.name} />
            </>
          ) : artist ? (
            <>
              <p style={{ margin: '0 0 10px', fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.45, color: T.text2 }}>Catch <b style={{ color: T.white }}>{artist.name}</b> live next time.</p>
              <FollowReminder kind="artist" slug={artist.slug} label={artist.name} />
            </>
          ) : (
            <Link href="/" style={{ width: '100%', height: 50, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: T.mint, color: T.onMint, textDecoration: 'none', fontFamily: FONT.display, fontSize: 15, fontWeight: 700 }}>
              Find what’s on next
            </Link>
          )}
        </div>
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
