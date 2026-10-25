'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bookmark, ChevronLeft, Heart, MessageCircle, Share2, Volume2, VolumeX } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { C, G, R } from '@/lib/theme';
import CustomPlayer, { type CustomPlayerHandle } from '@/components/moments/CustomPlayer';
import CommentsSheet from '@/components/moments/CommentsSheet';
import GiftSheet from '@/components/moments/GiftSheet';
import EndCard from '@/components/moments/EndCard';
import { ChapterBar, CrowdLine, GlassIcon, NextEditionCard, RailItem, mono, sans, serif } from '@/components/moments/parts';
import { formatCount, getChapters, type Comment, type Moment } from '@/components/moments/types';
import { useMoments } from '@/hooks/useMoments';
import { useMomentComments } from '@/hooks/useMomentComments';
import { useMomentLikes } from '@/hooks/useMomentLikes';
import { useNextEdition } from '@/hooks/useNextEdition';
import { useMomentCrowd } from '@/hooks/useMomentCrowd';
import { events as staticEvents } from '@/lib/data/events';

type Tab = 'foryou' | 'following';

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
                  fontFamily: sans, fontSize: 13, fontWeight: on ? 700 : 600,
                  background: on ? C.cream : 'transparent', color: on ? C.onAccent : 'rgba(245,236,215,0.8)',
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
    staticMeta?.dateLabel ?? (moment.year ? String(moment.year) : null),
    staticMeta?.venue ?? null,
    moment.duration_label ?? null,
  ].filter(Boolean).join(' · ');

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <CustomPlayer
        key={moment.id}
        ref={playerRef}
        youtubeId={moment.youtube_id}
        title={moment.title}
        hideMuteButton
        onMuteChange={setMuted}
        onEnded={() => setEnded(true)}
        onDoubleTap={handleDoubleTap}
        initialSeekSeconds={moment.id === initialId && initialT > 0 ? initialT : null}
        onTimeUpdate={(t, d) => { setCurrentSeconds(t); setDurationSeconds(d); }}
      />

      {topBar}
      <span style={{ position: 'absolute', zIndex: 25, top: 'calc(64px + env(safe-area-inset-top, 0px))', right: 18, fontFamily: mono, fontSize: 10, letterSpacing: '1.5px', color: 'rgba(245,236,215,0.85)', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
        {String(idx + 1).padStart(2, '0')} / {String(list.length).padStart(2, '0')}
      </span>

      {heartBurst && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <Heart size={84} fill={C.red} color={C.red} />
        </div>
      )}

      {ended ? (
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
      ) : (
        <div
          style={{
            position: 'absolute', zIndex: 20, left: 12, right: 12,
            bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
            display: 'flex', flexDirection: 'column', gap: 12, pointerEvents: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0, maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'auto' }}>
              <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: C.goldText, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                {moment.event_name}{moment.year ? ` · ${moment.year} edition` : ''}
              </span>
              <h1 style={{ fontFamily: serif, fontSize: 'clamp(28px, 7vw, 40px)', fontWeight: 500, lineHeight: 1.05, color: '#FFFDF6', textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}>
                {moment.title}
              </h1>
              {meta && <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: 'rgba(245,236,215,0.88)', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{meta}</span>}
              <CrowdLine faces={crowd.faces} count={crowd.thereCount} iWasThere={crowd.iWasThere} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, pointerEvents: 'auto', marginLeft: 'auto' }}>
              <RailItem
                label={liked ? 'Unlike' : 'Like'}
                caption={formatCount(likeCount)}
                onClick={() => { if (!requireSignIn()) toggleLike(); }}
                active={liked}
                activeColor="#F87171"
              >
                <Heart size={22} fill={liked ? C.red : 'none'} color={liked ? C.red : C.cream} />
              </RailItem>
              <RailItem label="Comments" caption={formatCount(comments.length)} onClick={() => setShowComments(true)}>
                <MessageCircle size={22} />
              </RailItem>
              <RailItem label="Share this moment" caption="Share" onClick={handleShare}>
                <Share2 size={21} />
              </RailItem>
              {next && (
                <RailItem
                  label={crowd.reminded ? 'Saved' : 'Save next edition'}
                  caption={crowd.reminded ? 'Saved' : 'Save'}
                  onClick={() => {
                    if (requireSignIn()) return;
                    crowd.toggleReminder();
                    flash(crowd.reminded ? 'Removed from dream events' : `${next.title} saved to dream events`);
                  }}
                  active={crowd.reminded}
                  activeColor={C.goldText}
                >
                  <Bookmark size={20} fill={crowd.reminded ? C.goldText : 'none'} />
                </RailItem>
              )}
            </div>
          </div>

          <div style={{ pointerEvents: 'auto', maxWidth: 600 }}>
            <ChapterBar chapters={chapters} current={currentSeconds} duration={durationSeconds} onSeek={handleSeek} />
          </div>

          {next && (
            <div style={{ pointerEvents: 'auto', maxWidth: 600 }}>
              <NextEditionCard next={next} goingCount={crowd.goingCount} />
            </div>
          )}
        </div>
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
