'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BadgeCheck, Bookmark, ChevronLeft, Heart, MessageCircle, Share2, Volume2, VolumeX } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { C, G, R } from '@/lib/theme';
import CustomPlayer, { type CustomPlayerHandle } from '@/components/moments/CustomPlayer';
import CommentsSheet from '@/components/moments/CommentsSheet';
import GiftSheet from '@/components/moments/GiftSheet';
import EndCard from '@/components/moments/EndCard';
import { ChapterBar, CrowdLine, GlassIcon, mono, sans, serif } from '@/components/moments/parts';
import { formatCount, getChapters, type Comment, type Moment } from '@/components/moments/types';
import { useMoments } from '@/hooks/useMoments';
import { useMomentComments } from '@/hooks/useMomentComments';
import { useMomentLikes } from '@/hooks/useMomentLikes';
import { useNextEdition } from '@/hooks/useNextEdition';
import { useMomentCrowd } from '@/hooks/useMomentCrowd';
import { events as staticEvents } from '@/lib/data/events';
import { T, FONT, GROUND } from '@/lib/thiscene';
import { BTN } from '@/components/events/CardParts';
import { countdown, priceLine } from '@/components/artists/parts';
import { parseDay, shortDay } from '@/lib/dates';
import { hiRes } from '@/lib/events/image';

type Tab = 'foryou' | 'following';

function ActionChip({ label, on = false, onClick, children }: { label: string; on?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} aria-pressed={on} onClick={onClick} style={{
      height: 40, padding: '0 14px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer',
      background: on ? 'rgba(123,227,168,0.12)' : 'rgba(255,255,255,0.07)', border: `1px solid ${on ? 'rgba(123,227,168,0.35)' : 'rgba(255,255,255,0.1)'}`,
      color: on ? T.mintText : T.white, fontFamily: FONT.sans, fontSize: 13, fontWeight: 600,
    }}>{children}</button>
  );
}

/** Event slugs that people the viewer follows attended or are going to. */
function useFollowingSlugs(userId: string | undefined, enabled: boolean) {
  const [slugs, setSlugs] = useState<Set<string> | null>(null);
  useEffect(() => {
    if (!enabled || !userId) return;
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
      const ids = (follows ?? []).map((f: { following_id: string }) => f.following_id);
      if (!ids.length) { if (!cancelled) setSlugs(new Set()); return; }
      const { data: att } = await supabase.from('event_attendance').select('event_slug').in('user_id', ids).eq('is_public', true);
      if (!cancelled) setSlugs(new Set((att ?? []).map((a: { event_slug: string }) => a.event_slug)));
    })();
    return () => { cancelled = true; };
  }, [userId, enabled]);
  return slugs;
}

export default function MomentsClient() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id');
  const initialT = Number(searchParams.get('t') || 0);
  const fromPath = searchParams.get('from');
  const backHref = fromPath && fromPath.startsWith('/events/') ? fromPath : '/';

  const feed = useMoments(initialId);
  // Quietly check new videos' YouTube channels (official or not, still playing)
  useEffect(() => { fetch('/api/moments/verify').catch(() => {}); }, []);
  const [tab, setTab] = useState<Tab>('foryou');
  const [followIdx, setFollowIdx] = useState(0);
  const followingSlugs = useFollowingSlugs(user?.id, tab === 'following');

  const followingList = useMemo(
    () => (followingSlugs ? feed.moments.filter((m) => m.event_slug && followingSlugs.has(m.event_slug)) : []),
    [feed.moments, followingSlugs],
  );
  const list: Moment[] = tab === 'foryou' ? feed.moments : followingList;
  const idx = tab === 'foryou' ? feed.activeIdx : Math.min(followIdx, Math.max(0, followingList.length - 1));
  const moment = list[idx] ?? null;
  const upNext = list[idx + 1] ?? null;

  const goNext = useCallback(() => {
    if (tab === 'foryou') feed.goNext();
    else setFollowIdx((i) => Math.min(i + 1, Math.max(0, followingList.length - 1)));
  }, [tab, feed, followingList.length]);
  const goPrev = useCallback(() => {
    if (tab === 'foryou') feed.goPrev();
    else setFollowIdx((i) => Math.max(0, i - 1));
  }, [tab, feed]);

  const { comments, send } = useMomentComments(moment?.id);
  const { liked, likeCount, toggle: toggleLike } = useMomentLikes(moment?.id, user?.id);
  const { next } = useNextEdition(moment);
  const commenterIds = useMemo(() => comments.map((c) => c.user_id), [comments]);
  const crowd = useMomentCrowd(moment?.event_slug, next, commenterIds, user?.id);

  const [showComments, setShowComments] = useState(false);
  const [giftTarget, setGiftTarget] = useState<Comment | null>(null);
  const [heartBurst, setHeartBurst] = useState(false);
  const [toast, setToast] = useState('');
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [muted, setMuted] = useState(true);
  const [ended, setEnded] = useState(false);

  const touch = useRef<{ x: number; y: number } | null>(null);
  const playerRef = useRef<CustomPlayerHandle>(null);
  const chapters = useMemo(() => getChapters(moment), [moment]);
  const staticMeta = staticEvents.find((e) => e.slug === moment?.event_slug);
  const sheetOpen = showComments || !!giftTarget;
  const canGift = Boolean(next?.tiers?.some((t) => t.price > 0 && t.quantity - t.sold > 0)) && !next?.ticketUrl;
  const nextLabel = next ? (next.date?.slice(0, 4) || null) : null;

  useEffect(() => {
    setCurrentSeconds(0);
    setDurationSeconds(0);
    setEnded(false);
  }, [moment?.id]);

  useEffect(() => {
    if (!moment?.id) return;
    const qs = new URLSearchParams({ id: moment.id });
    if (fromPath && fromPath.startsWith('/events/')) qs.set('from', fromPath);
    window.history.replaceState(null, '', `/moments?${qs.toString()}`);
  }, [moment?.id, fromPath]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (sheetOpen) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); goPrev(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, sheetOpen]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  }, []);

  const requireSignIn = useCallback(() => {
    if (user) return false;
    router.push('/auth');
    return true;
  }, [user, router]);

  const handleShare = useCallback(async () => {
    if (!moment) return;
    const t = Math.floor(currentSeconds);
    const url = `${window.location.origin}/moments?id=${moment.id}${t > 0 && !ended ? `&t=${t}` : ''}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: moment.title, text: `${moment.title} — ${moment.event_name} on Akwaaba`, url });
        return;
      }
    } catch { /* fall back to copy */ }
    try {
      await navigator.clipboard.writeText(url);
      flash('Link copied');
    } catch { /* ignore */ }
  }, [moment, currentSeconds, ended, flash]);

  const handleDoubleTap = useCallback(() => {
    if (requireSignIn()) return;
    if (!liked) toggleLike();
    setHeartBurst(true);
    setTimeout(() => setHeartBurst(false), 700);
  }, [requireSignIn, liked, toggleLike]);

  const handleSeek = useCallback((seconds: number) => {
    setEnded(false);
    playerRef.current?.seekTo(seconds);
    setCurrentSeconds(seconds);
  }, []);

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touch.current;
    touch.current = null;
    if (!start || sheetOpen) return;
    const t = e.changedTouches[0];
    const dy = start.y - t.clientY;
    const dx = start.x - t.clientX;
    if (Math.abs(dy) < 40 || Math.abs(dy) < Math.abs(dx)) return;
    if (dy > 0) goNext(); else goPrev();
  }

  const topBar = (
      <div style={{ position: 'absolute', zIndex: 25, top: 'calc(10px + env(safe-area-inset-top, 0px))', left: 12, right: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <GlassIcon label={fromPath ? 'Back to event' : 'Home'} href={backHref}><ChevronLeft size={20} /></GlassIcon>
        <div role="tablist" aria-label="Feed" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: R.chip, ...G.overlay, border: '1px solid rgba(255,255,255,0.16)' }}>
          {([['foryou', 'For you'], ['following', 'Following']] as const).map(([k, label]) => {
            const on = tab === k;
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => { setTab(k); setFollowIdx(0); setShowComments(false); }}
                style={{
                  height: 36, padding: '0 14px', borderRadius: R.chip, border: 'none', cursor: 'pointer',
                  fontFamily: FONT.sans, fontSize: 13, fontWeight: on ? 700 : 600,
                  background: on ? T.mint : 'transparent', color: on ? T.onMint : 'rgba(255,255,255,0.75)',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        {moment ? (
          <GlassIcon label={muted ? 'Turn sound on' : 'Mute'} onClick={() => playerRef.current?.toggleMute()}>
            {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </GlassIcon>
        ) : <span style={{ width: 44 }} />}
      </div>
  );

  /* ── States without a moment ─────────────────────────────────────── */
  const shell = (children: React.ReactNode) => (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24, textAlign: 'center' }}>
      {topBar}
      {children}
    </div>
  );

  if (feed.loading) {
    return shell(<p style={{ fontFamily: mono, fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: C.c3 }}>Loading…</p>);
  }

  if (tab === 'following' && !user) {
    return shell(
      <>
        <p style={{ fontFamily: serif, fontSize: 28, color: C.cream }}>Moments from your people</p>
        <p style={{ fontFamily: sans, fontSize: 14, color: C.c2, maxWidth: 300 }}>Sign in and follow friends to see moments from the events they went to.</p>
        <Link href="/auth" style={{ height: 48, padding: '0 22px', borderRadius: R.btn, background: C.gold, color: C.onAccent, fontFamily: sans, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', textDecoration: 'none' }}>Sign in</Link>
      </>,
    );
  }

  if (!moment) {
    const following = tab === 'following';
    return shell(
      <>
        <p style={{ fontFamily: serif, fontSize: 28, color: C.cream }}>{following && followingSlugs ? 'Nothing here yet' : following ? 'Loading…' : 'No moments yet'}</p>
        {following && followingSlugs && (
          <p style={{ fontFamily: sans, fontSize: 14, color: C.c2, maxWidth: 300 }}>When people you follow go to events, their moments show up here.</p>
        )}
        <Link href="/events" style={{ height: 48, padding: '0 22px', borderRadius: R.btn, ...G.raised, border: `1px solid ${C.bd2}`, color: C.cream, fontFamily: sans, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', textDecoration: 'none' }}>Browse events</Link>
      </>,
    );
  }

  /* ── Feed ─────────────────────────────────────────────────────────── */
  const meta = [
    staticMeta?.dateLabel ?? null,
    staticMeta?.venue ?? null,
    moment.duration_label ?? null,
  ].filter(Boolean).join(' · ');

  const nextDay = next ? parseDay(next.date) : null;
  const nextSoon = next ? countdown(next.date) : null;
  const nextPrice = next ? priceLine(next) : '';

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: GROUND, overflow: 'hidden' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {topBar}

      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', paddingTop: 'calc(68px + env(safe-area-inset-top, 0px))', paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))', maxWidth: 720, margin: '0 auto' }}>
        {/* The video at its real shape: sharp, nothing cropped */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#000', flexShrink: 0 }}>
          <CustomPlayer
            key={moment.id}
            ref={playerRef}
            youtubeId={moment.youtube_id}
            title={moment.title}
            fit="contain"
            hideMuteButton
            onMuteChange={setMuted}
            onEnded={() => setEnded(true)}
            onDoubleTap={handleDoubleTap}
            initialSeekSeconds={moment.id === initialId && initialT > 0 ? initialT : null}
            onTimeUpdate={(t, d) => { setCurrentSeconds(t); setDurationSeconds(d); }}
          />
          {heartBurst && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Heart size={72} fill="#F87171" color="#F87171" />
            </div>
          )}
          <span style={{ position: 'absolute', zIndex: 8, top: 10, right: 12, padding: '3px 8px', borderRadius: 999, background: 'rgba(0,0,0,0.55)', fontFamily: FONT.sans, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.85)', pointerEvents: 'none' }}>
            {idx + 1} / {list.length}
          </span>
        </div>
        <div style={{ padding: '0 16px' }}>
          <ChapterBar chapters={chapters} current={currentSeconds} duration={durationSeconds} onSeek={handleSeek} />
        </div>

        <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
          {moment.channel_name && (
            <a href={moment.channel_url ?? `https://www.youtube.com/watch?v=${moment.youtube_id}`} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 11px 5px 7px', borderRadius: 999, background: 'rgba(255,255,255,0.07)', textDecoration: 'none', fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, color: T.text }}>
              <span aria-hidden style={{ width: 18, height: 13, borderRadius: 4, background: '#FF0033', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ width: 0, height: 0, borderLeft: '5px solid #fff', borderTop: '3.5px solid transparent', borderBottom: '3.5px solid transparent', marginLeft: 1 }} />
              </span>
              {moment.official ? <><BadgeCheck size={13} color={T.mint} /> Official · {moment.channel_name}</> : <>via {moment.channel_name}</>}
            </a>
          )}
          <p style={{ margin: moment.channel_name ? '12px 0 0' : 0, fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.mintText }}>
            {moment.event_name}{moment.year ? ` · ${moment.year} edition` : ''}
          </p>
          <h1 style={{ margin: '4px 0 0', fontFamily: FONT.display, fontSize: 25, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.12, color: T.white, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {moment.title}
          </h1>
          {meta && <p style={{ margin: '4px 0 0', fontFamily: FONT.sans, fontSize: 13, color: T.text3 }}>{meta}</p>}
          <div style={{ marginTop: 8 }}><CrowdLine faces={crowd.faces} count={crowd.thereCount} iWasThere={crowd.iWasThere} /></div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <ActionChip label={liked ? 'Unlike' : 'Like'} on={liked} onClick={() => { if (!requireSignIn()) toggleLike(); }}>
              <Heart size={18} fill={liked ? '#F87171' : 'none'} color={liked ? '#F87171' : T.white} /> {formatCount(likeCount)}
            </ActionChip>
            <ActionChip label="Comments" onClick={() => setShowComments(true)}><MessageCircle size={18} /> {formatCount(comments.length)}</ActionChip>
            <ActionChip label="Share this moment" onClick={handleShare}><Share2 size={17} /> Share</ActionChip>
            {next && (
              <ActionChip label={crowd.reminded ? 'Saved' : 'Save next edition'} on={crowd.reminded} onClick={() => {
                if (requireSignIn()) return;
                crowd.toggleReminder();
                flash(crowd.reminded ? 'Removed from saved' : `${next.title} saved`);
              }}><Bookmark size={17} fill={crowd.reminded ? T.mintText : 'none'} /></ActionChip>
            )}
          </div>
        </div>

        {/* The flyer of the next edition, with the button */}
        {next ? (
          <Link href={`/events/${next.slug}`} style={{ position: 'relative', flex: 1, minHeight: 150, margin: '16px 20px 0', borderRadius: 22, overflow: 'hidden', textDecoration: 'none', background: 'rgba(255,255,255,0.05)', display: 'block' }}>
            {next.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hiRes(next.image, 900) ?? next.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 20%' }} />
            )}
            <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(6,8,7,0.1) 0%, rgba(6,8,7,0.15) 35%, rgba(6,8,7,0.9) 100%)' }} />
            <span style={{ position: 'absolute', left: 16, right: 16, bottom: 14 }}>
              <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.mintText }}>Next edition{nextSoon ? ` · ${nextSoon}` : ''}</span>
              <span style={{ display: 'block', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT.display, fontSize: 19, fontWeight: 800, color: T.white }}>
                {next.title}{nextDay ? ` · ${shortDay(nextDay)}` : ''}
              </span>
              <span style={{ ...BTN.primary, width: '100%', height: 46, marginTop: 10, boxSizing: 'border-box' }}>
                {next.price === 0 && !next.priceUnknown && next.listingType !== 'listed' ? 'Reserve a spot' : 'Get tickets'}
                <span style={{ opacity: 0.65, fontWeight: 600 }}>· {nextPrice}</span>
              </span>
            </span>
          </Link>
        ) : (
          <Link href="/events" style={{ ...BTN.secondary, margin: '18px 20px 0', boxSizing: 'border-box', flexShrink: 0 }}>Find what’s on next</Link>
        )}
      </div>

      {ended && (
        <EndCard
          moment={moment}
          next={next}
          goingCount={crowd.goingCount}
          iWasThere={crowd.iWasThere}
          reminded={crowd.reminded}
          signedIn={!!user}
          upNext={upNext}
          onReplay={() => { setEnded(false); playerRef.current?.seekTo(0); }}
          onShare={handleShare}
          onToggleThere={crowd.toggleWasThere}
          onToggleRemind={crowd.toggleReminder}
          onNext={goNext}
        />
      )}

      {showComments && (
        <CommentsSheet
          moment={moment}
          comments={comments}
          user={user}
          profile={profile}
          currentSeconds={currentSeconds}
          wasThereIds={crowd.wasThereIds}
          goingIds={crowd.goingIds}
          nextLabel={nextLabel}
          canGift={canGift}
          onClose={() => setShowComments(false)}
          onSend={(text) => { if (user) send(user.id, text); }}
          onSeek={(s) => { handleSeek(s); setShowComments(false); }}
          onGift={(c) => setGiftTarget(c)}
        />
      )}

      {giftTarget && next && user && (
        <GiftSheet comment={giftTarget} next={next} user={user} onClose={() => setGiftTarget(null)} />
      )}

      {toast && (
        <div role="status" style={{ position: 'absolute', zIndex: 70, left: '50%', top: 'calc(70px + env(safe-area-inset-top, 0px))', transform: 'translateX(-50%)', ...G.sheet, border: `1px solid ${C.bd2}`, borderRadius: R.chip, padding: '10px 16px', fontFamily: sans, fontSize: 13, color: C.cream, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
