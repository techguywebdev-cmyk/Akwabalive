'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Volume2, VolumeX } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { C, G, R } from '@/lib/theme';
import MomentSlide, { type SlideHandle } from '@/components/moments/MomentSlide';
import { GlassIcon, mono, sans, serif } from '@/components/moments/parts';
import { type Moment } from '@/components/moments/types';
import { useMoments } from '@/hooks/useMoments';
import { T, FONT } from '@/lib/thiscene';

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

  const [muted, setMuted] = useState(true);
  const [toast, setToast] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const slides = useRef<Record<string, SlideHandle | null>>({});

  const setIdx = useCallback((i: number) => {
    if (tab === 'foryou') {
      feed.setActiveIdx(i);
      if (i >= feed.moments.length - 3) feed.loadMore();
    } else setFollowIdx(i);
  }, [tab, feed]);

  // Which slide is on screen (snap scrolling, like TikTok)
  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const i = Math.round(el.scrollTop / el.clientHeight);
    if (i !== idx && i >= 0 && i < list.length) setIdx(i);
  }, [idx, list.length, setIdx]);

  const scrollTo = useCallback((i: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ top: Math.max(0, Math.min(i, list.length - 1)) * el.clientHeight, behavior: 'smooth' });
  }, [list.length]);
  const goNext = useCallback(() => scrollTo(idx + 1), [scrollTo, idx]);
  const goPrev = useCallback(() => scrollTo(idx - 1), [scrollTo, idx]);

  // Opening a shared link lands on that moment
  const landed = useRef(false);
  useEffect(() => {
    if (landed.current || !list.length || !scroller.current) return;
    landed.current = true;
    scroller.current.scrollTop = idx * scroller.current.clientHeight;
  }, [list.length, idx]);

  useEffect(() => {
    if (!moment?.id) return;
    const qs = new URLSearchParams({ id: moment.id });
    if (fromPath && fromPath.startsWith('/events/')) qs.set('from', fromPath);
    window.history.replaceState(null, '', `/moments?${qs.toString()}`);
  }, [moment?.id, fromPath]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); goPrev(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  }, []);

  const requireSignIn = useCallback(() => {
    if (user) return false;
    router.push(`/auth?next=${encodeURIComponent(`/moments${moment ? `?id=${moment.id}` : ''}`)}`);
    return true;
  }, [user, router, moment]);

  const playerRef = { current: { toggleMute: () => { if (moment) slides.current[moment.id]?.toggleMute(); } } };
  const topBar = (
      <div style={{ position: 'absolute', zIndex: 40, top: 'calc(10px + env(safe-area-inset-top, 0px))', left: 12, right: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
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
                onClick={() => { setTab(k); setFollowIdx(0); landed.current = false; if (scroller.current) scroller.current.scrollTop = 0; }}
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

  /* ── Feed: one full-screen slide per moment; only neighbours load players ─────────── */
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#050606' }}>
      {topBar}
      <div ref={scroller} onScroll={onScroll} className="no-scrollbar"
        style={{ position: 'absolute', inset: 0, overflowY: 'scroll', scrollSnapType: 'y mandatory', overscrollBehavior: 'contain' }}>
        {list.map((m, i) => (
          <MomentSlide
            key={`${tab}-${m.id}`}
            ref={(h) => { slides.current[m.id] = h; }}
            moment={m}
            index={i}
            total={list.length}
            active={i === idx}
            mounted={Math.abs(i - idx) <= 1}
            user={user}
            profile={profile}
            onMuteChange={setMuted}
            onEnded={() => { if (i === idx) goNext(); }}
            initialSeek={m.id === initialId && initialT > 0 ? initialT : null}
            requireSignIn={requireSignIn}
            flash={flash}
          />
        ))}
      </div>

      {toast && (
        <div role="status" style={{ position: 'absolute', zIndex: 70, left: '50%', top: 'calc(70px + env(safe-area-inset-top, 0px))', transform: 'translateX(-50%)', background: 'rgba(14,17,16,0.92)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '10px 16px', fontFamily: FONT.sans, fontSize: 13, color: T.white, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
