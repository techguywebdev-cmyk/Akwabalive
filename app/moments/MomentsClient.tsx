'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '@/lib/supabase/AuthProvider';
import MomentSlide, { type SlideHandle } from '@/components/moments/MomentSlide';
import { GlassIcon } from '@/components/moments/parts';
import { useMoments } from '@/hooks/useMoments';
import { T, FONT } from '@/lib/thiscene';
import { BTN } from '@/components/events/CardParts';

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

  const list = feed.moments;
  const idx = feed.activeIdx;
  const moment = list[idx] ?? null;

  const [muted, setMuted] = useState(true);
  const [toast, setToast] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const slides = useRef<Record<string, SlideHandle | null>>({});

  // Keep the latest values for the scroll handler without re-binding it
  const live = useRef({ idx, len: list.length, feed });
  live.current = { idx, len: list.length, feed };

  /* Which slide is on screen. Only switch once the swipe has settled — switching mid-swipe
     mounts players and re-renders the page while the finger is still moving, which is what
     made the feed fight back. */
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commit = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const { idx: cur, len, feed: f } = live.current;
    const i = Math.round(el.scrollTop / el.clientHeight);
    if (i === cur || i < 0 || i >= len) return;
    f.setActiveIdx(i);
    if (i >= len - 3) f.loadMore();
  }, []);
  const onScroll = useCallback(() => {
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(commit, 120);
  }, [commit]);
  useEffect(() => {
    const el = scroller.current;
    if (!el || !('onscrollend' in window)) return;
    const end = () => { if (settle.current) clearTimeout(settle.current); commit(); };
    el.addEventListener('scrollend', end);
    return () => el.removeEventListener('scrollend', end);
  }, [commit, list.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Back and sound float over the top corners of the video
  const topBar = (
    <div style={{ position: 'absolute', zIndex: 40, top: 'calc(10px + env(safe-area-inset-top, 0px))', left: 10, right: 10, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
      <span style={{ pointerEvents: 'auto' }}>
        <GlassIcon label={fromPath ? 'Back to event' : 'Home'} href={backHref}><ChevronLeft size={20} /></GlassIcon>
      </span>
      {moment && (
        <span style={{ pointerEvents: 'auto' }}>
          <GlassIcon label={muted ? 'Turn sound on' : 'Mute'} onClick={() => slides.current[moment.id]?.toggleMute()}>
            {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </GlassIcon>
        </span>
      )}
    </div>
  );

  if (feed.loading || !moment) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#050606', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24, textAlign: 'center' }}>
        {topBar}
        {feed.loading ? (
          <p style={{ fontFamily: FONT.sans, fontSize: 14, color: T.text3 }}>Loading…</p>
        ) : (
          <>
            <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 24, fontWeight: 700, color: T.white }}>No moments yet</p>
            <Link href="/events" style={{ ...BTN.secondary, height: 46, padding: '0 22px', textDecoration: 'none' }}>Browse events</Link>
          </>
        )}
      </div>
    );
  }

  /* ── Feed: one full-screen slide per moment; only neighbours load players ─────────── */
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#050606' }}>
      {topBar}
      <div ref={scroller} onScroll={onScroll} className="no-scrollbar"
        style={{ position: 'absolute', inset: 0, overflowY: 'scroll', scrollSnapType: 'y mandatory', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
        {list.map((m, i) => (
          <MomentSlide
            key={m.id}
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
        <div role="status" style={{ position: 'absolute', zIndex: 70, left: '50%', bottom: 'calc(90px + env(safe-area-inset-bottom, 0px))', transform: 'translateX(-50%)', background: 'rgba(14,17,16,0.94)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '10px 16px', fontFamily: FONT.sans, fontSize: 13, color: T.white, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
