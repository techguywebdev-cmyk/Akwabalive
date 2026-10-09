'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar, MapPin, Clock } from 'lucide-react';
import { C, G, R } from '@/lib/theme';

const mono = 'var(--font-dm-mono, monospace)';
const sans = 'var(--font-inter, sans-serif)';
import type { HeroSlide } from '@/lib/events/rank';
import { extractYoutubeId } from '@/lib/events/rank';

const FALLBACK: HeroSlide[] = [
  {
    eyebrow: 'Festival',
    live: 'Selling fast',
    titleLine1: 'Afrochella',
    titleLine2: 'Music & Arts',
    date: 'Dec 28–29, 2025',
    venue: 'El Wak Stadium, Accra',
    time: 'Gates open 4:00 PM',
    cta: 'Get Tickets — from ₵350',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1800&q=88&auto=format&fit=crop',
    glow: 'green',
    href: '/events',
  },
  {
    eyebrow: 'Annual Cultural Festival',
    titleLine1: 'Akwasidae',
    titleLine2: 'Festival',
    date: 'Apr 6, 2025',
    venue: 'Manhyia Palace, Kumasi',
    time: 'All Day',
    cta: 'RSVP Free',
    image: 'https://images.unsplash.com/photo-1604537466158-719b1972feb8?w=1800&q=88&auto=format&fit=crop',
    glow: 'gold',
    href: '/events',
  },
];

const IMAGE_DURATION = 6500;
const FLYER_INTRO_MS = 1400;
const FLYER_OUTRO_MS = 2800;
const VIDEO_MAX_MS = 120000;
/** Never treat ENDED as real if video played less than this */
const MIN_PLAY_MS = 8000;

type Phase = 'image' | 'flyer-in' | 'video' | 'flyer-out';

type YTWin = Window & {
  YT?: { Player: new (el: HTMLElement | string, opts: object) => any };
  onYouTubeIframeAPIReady?: () => void;
};

function loadYoutubeApi(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve();
    const w = window as YTWin;
    if (w.YT?.Player) return resolve();
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
    const id = window.setInterval(() => {
      if ((window as YTWin).YT?.Player) {
        window.clearInterval(id);
        resolve();
      }
    }, 50);
    window.setTimeout(() => {
      window.clearInterval(id);
      resolve();
    }, 8000);
  });
}

export default function HeroSlider({ initialSlides }: { initialSlides?: HeroSlide[] }) {
  const [slides, setSlides] = useState<HeroSlide[]>(
    initialSlides && initialSlides.length ? initialSlides : FALLBACK,
  );
  const [cur, setCur] = useState(0);
  const [prog, setProg] = useState(0);
  const [paused, setPaused] = useState(false);
  const [phase, setPhase] = useState<Phase>('image');
  const [playerVisible, setPlayerVisible] = useState(false);
  const [soundOn, setSoundOn] = useState(false);

  const rafRef = useRef<number>();
  const startRef = useRef<number>();
  const phaseTimer = useRef<ReturnType<typeof setTimeout>>();
  const videoMaxTimer = useRef<ReturnType<typeof setTimeout>>();
  const playerRef = useRef<any>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const soundOnRef = useRef(false);
  const playStartedAtRef = useRef<number>(0);
  const endedLockRef = useRef(false);
  const suppressNavClickRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const onVideoEndedRef = useRef<() => void>(() => {});
  const curRef = useRef(0);

  curRef.current = cur;

  useEffect(() => {
    if (initialSlides && initialSlides.length) return;
    let cancelled = false;
    fetch('/api/events/hero')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.slides) && data.slides.length > 0) {
          setSlides(data.slides);
          setCur(0);
          setProg(0);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [initialSlides]);

  const slide = slides[cur] || FALLBACK[0];
  const ytId = slide.promoVideoUrl ? extractYoutubeId(slide.promoVideoUrl) : null;
  const isMp4 = !!slide.promoVideoUrl && /\.(mp4|webm)(\?|$)/i.test(slide.promoVideoUrl);
  const hasPromo = !!(ytId || isMp4);

  const clearTimers = () => {
    if (phaseTimer.current) clearTimeout(phaseTimer.current);
    if (videoMaxTimer.current) clearTimeout(videoMaxTimer.current);
    phaseTimer.current = undefined;
    videoMaxTimer.current = undefined;
  };

  const destroyPlayer = () => {
    try { playerRef.current?.destroy?.(); } catch { /* ignore */ }
    playerRef.current = null;
    setPlayerVisible(false);
  };

  const goTo = useCallback((n: number) => {
    const len = slides.length || 1;
    const next = ((n % len) + len) % len;
    setCur(next);
    setProg(0);
    startRef.current = undefined;
  }, [slides.length]);

  /** Block the synthetic click that follows touch (was opening /events) */
  function armClickSuppress() {
    suppressNavClickRef.current = true;
    window.setTimeout(() => { suppressNavClickRef.current = false; }, 900);
  }

  function navPrev() {
    armClickSuppress();
    goTo(curRef.current - 1);
  }
  function navNext() {
    armClickSuppress();
    goTo(curRef.current + 1);
  }

  useEffect(() => {
    const unlock = () => {
      soundOnRef.current = true;
      setSoundOn(true);
      try {
        playerRef.current?.unMute?.();
        playerRef.current?.setVolume?.(100);
      } catch { /* ignore */ }
    };
    const opts: AddEventListenerOptions = { capture: true, passive: true };
    window.addEventListener('pointerdown', unlock, opts);
    window.addEventListener('touchstart', unlock, opts);
    window.addEventListener('keydown', unlock, opts);
    return () => {
      window.removeEventListener('pointerdown', unlock, opts);
      window.removeEventListener('touchstart', unlock, opts);
      window.removeEventListener('keydown', unlock, opts);
    };
  }, []);

  // Global capture: kill ghost clicks after swipe/zone nav
  useEffect(() => {
    const block = (e: Event) => {
      if (!suppressNavClickRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      // @ts-ignore
      e.stopImmediatePropagation?.();
    };
    document.addEventListener('click', block, true);
    document.addEventListener('pointerup', block, true);
    return () => {
      document.removeEventListener('click', block, true);
      document.removeEventListener('pointerup', block, true);
    };
  }, []);

  const beginFlyerOut = useCallback(() => {
    if (endedLockRef.current) return;
    if (playStartedAtRef.current) {
      const elapsed = Date.now() - playStartedAtRef.current;
      if (elapsed < MIN_PLAY_MS) return; // bogus early ENDED
    }
    endedLockRef.current = true;
    clearTimers();
    destroyPlayer();
    setPhase('flyer-out');
    setProg(90);
    const slideAtEnd = curRef.current;
    phaseTimer.current = setTimeout(() => {
      // only advance if still on same slide
      if (curRef.current === slideAtEnd) goTo(slideAtEnd + 1);
    }, FLYER_OUTRO_MS);
  }, [goTo]);

  onVideoEndedRef.current = beginFlyerOut;

  // Phase machine
  useEffect(() => {
    clearTimers();
    destroyPlayer();
    setProg(0);
    startRef.current = undefined;
    playStartedAtRef.current = 0;
    endedLockRef.current = false;

    if (!hasPromo) {
      setPhase('image');
      return;
    }

    setPhase('flyer-in');
    setProg(5);
    phaseTimer.current = setTimeout(() => {
      setPhase('video');
      setProg(40);
    }, FLYER_INTRO_MS);

    return () => {
      clearTimers();
      destroyPlayer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur, hasPromo, ytId]);

  // YT player
  useEffect(() => {
    if (phase !== 'video' || !ytId) return;
    let cancelled = false;
    endedLockRef.current = false;
    playStartedAtRef.current = 0;

    (async () => {
      await loadYoutubeApi();
      const w = window as YTWin;
      if (cancelled || !mountRef.current || !w.YT?.Player) return;

      mountRef.current.innerHTML = '';
      const host = document.createElement('div');
      host.id = `yt-hero-${cur}-${ytId}`;
      mountRef.current.appendChild(host);

      playerRef.current = new w.YT.Player(host, {
        videoId: ytId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          mute: soundOnRef.current ? 0 : 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          cc_load_policy: 0,
          loop: 0,
        },
        events: {
          onReady: (e: any) => {
            try {
              if (soundOnRef.current) {
                e.target.unMute?.();
                e.target.setVolume?.(100);
              } else {
                e.target.mute?.();
              }
              e.target.playVideo?.();
            } catch { /* ignore */ }
          },
          onStateChange: (e: any) => {
            // PLAYING
            if (e.data === 1) {
              setPlayerVisible(true);
              setProg(55);
              if (!playStartedAtRef.current) playStartedAtRef.current = Date.now();
              if (soundOnRef.current) {
                try {
                  e.target.unMute?.();
                  e.target.setVolume?.(100);
                } catch { /* ignore */ }
              }
              // Fallback timer only — primary advance is ENDED
              try {
                const dur = Number(e.target.getDuration?.()) || 0;
                if (videoMaxTimer.current) clearTimeout(videoMaxTimer.current);
                // wait full duration + buffer; never less than MIN_PLAY_MS
                const hold =
                  dur > 3
                    ? Math.min(Math.max(dur * 1000 + 1200, MIN_PLAY_MS + 500), VIDEO_MAX_MS)
                    : VIDEO_MAX_MS;
                videoMaxTimer.current = setTimeout(() => onVideoEndedRef.current(), hold);
              } catch {
                if (videoMaxTimer.current) clearTimeout(videoMaxTimer.current);
                videoMaxTimer.current = setTimeout(() => onVideoEndedRef.current(), VIDEO_MAX_MS);
              }
            }
            // ENDED
            if (e.data === 0) {
              onVideoEndedRef.current();
            }
          },
          onError: () => {
            setTimeout(() => onVideoEndedRef.current(), 4000);
          },
        },
      });
    })();

    return () => {
      cancelled = true;
      if (videoMaxTimer.current) clearTimeout(videoMaxTimer.current);
    };
  }, [phase, ytId, cur]);

  useEffect(() => {
    if (!soundOn) return;
    try {
      playerRef.current?.unMute?.();
      playerRef.current?.setVolume?.(100);
    } catch { /* ignore */ }
  }, [soundOn]);

  // Image-only auto-advance
  useEffect(() => {
    if (hasPromo) return;
    const tick = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      if (!paused) {
        const pct = Math.min(((ts - startRef.current) / IMAGE_DURATION) * 100, 100);
        setProg(pct);
        if (pct >= 100) {
          goTo(cur + 1);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [cur, paused, goTo, hasPromo]);

  return (
    <section
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        minHeight: 600,
        overflow: 'hidden',
        background: '#0D0B08',
        touchAction: 'pan-y',
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        const t = e.touches[0];
        touchStartRef.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        const start = touchStartRef.current;
        touchStartRef.current = null;
        if (!start) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.3) {
          if (dx < 0) navNext();
          else navPrev();
        }
      }}
    >
      {slides.map((s, i) => {
        const active = i === cur;
        return (
          <div
            key={`${s.href}-${i}`}
            style={{
              position: 'absolute', inset: 0,
              opacity: active ? 1 : 0,
              transition: 'opacity 900ms cubic-bezier(.4,0,.2,1)',
              pointerEvents: active ? 'auto' : 'none',
            }}
          >
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${s.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat',
              opacity: active && phase === 'video' && playerVisible ? 0 : 1,
              transition: 'opacity 500ms ease',
            }} />
            {/* flat tint — no gradients */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'rgba(13,11,8,0.22)' }} />
          </div>
        );
      })}

      {hasPromo && phase === 'video' && ytId && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            zIndex: 0,
            opacity: playerVisible ? 1 : 0,
            transition: 'opacity 400ms ease',
            pointerEvents: 'none',
          }}
        >
          <div
            ref={mountRef}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '100%',
              height: '100%',
              transform: 'translate(-50%, -50%) scale(2.2)',
              transformOrigin: 'center center',
            }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,11,8,0.22)', pointerEvents: 'none' }} />
        </div>
      )}

      {hasPromo && phase === 'video' && isMp4 && slide.promoVideoUrl && !ytId && (
        <video
          key={slide.promoVideoUrl + cur}
          src={slide.promoVideoUrl}
          autoPlay
          playsInline
          muted={!soundOn}
          onPlaying={() => {
            setPlayerVisible(true);
            if (!playStartedAtRef.current) playStartedAtRef.current = Date.now();
          }}
          onEnded={() => beginFlyerOut()}
          style={{
            position: 'absolute', inset: 0, zIndex: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: playerVisible ? 1 : 0,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Side zones — only upper/mid area so the panel is never under them */}
      <button
        type="button"
        aria-label="Previous slide"
        onPointerUp={(e) => {
          e.preventDefault();
          e.stopPropagation();
          navPrev();
        }}
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 320, width: '26%', zIndex: 8,
          border: 'none', background: 'transparent', cursor: 'w-resize', padding: 0,
          WebkitTapHighlightColor: 'transparent',
        }}
      />
      <button
        type="button"
        aria-label="Next slide"
        onPointerUp={(e) => {
          e.preventDefault();
          e.stopPropagation();
          navNext();
        }}
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 320, width: '26%', zIndex: 8,
          border: 'none', background: 'transparent', cursor: 'e-resize', padding: 0,
          WebkitTapHighlightColor: 'transparent',
        }}
      />

      {/* Frosted glass info panel */}
      <div style={{
        position: 'absolute', zIndex: 15,
        left: 'clamp(12px, 4vw, 48px)', right: 'clamp(12px, 4vw, 48px)', bottom: 'clamp(16px, 4vw, 48px)',
        pointerEvents: 'none',
      }}>
        <div style={{
          maxWidth: 600, pointerEvents: 'auto',
          ...G.panel, border: `1px solid ${C.bd2}`, borderRadius: R.sheet,
          padding: 'clamp(18px, 4vw, 28px)',
        }}>
          <div
            key={`ey-${cur}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14,
              animation: 'fadeSlideUp 0.55s 0.1s ease both',
            }}
          >
            <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: C.goldText }}>
              {slide.eyebrow}
            </span>
            {slide.live && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(206,17,38,0.16)', border: '1px solid rgba(206,17,38,0.45)',
                color: '#FCA5A5', borderRadius: R.chip,
                fontFamily: mono, fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase',
                padding: '4px 10px',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.red, animation: 'blink 1s infinite', flexShrink: 0 }} />
                {slide.live}
              </span>
            )}
          </div>

          <h1
            key={`t-${cur}`}
            style={{
              fontFamily: 'var(--font-cormorant, serif)',
              fontSize: 'clamp(40px, 9vw, 76px)',
              fontWeight: 500, lineHeight: 0.95,
              letterSpacing: '-1px', color: '#FFFDF6',
              marginBottom: 16,
              animation: 'fadeSlideUp 0.7s 0.22s ease both',
            }}
          >
            {slide.titleLine1}{' '}
            <em style={{ fontStyle: 'italic', fontWeight: 400, color: C.c2 }}>{slide.titleLine2}</em>
          </h1>

          <div
            key={`m-${cur}`}
            style={{
              display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px',
              marginBottom: 20,
              animation: 'fadeSlideUp 0.62s 0.36s ease both',
            }}
          >
            {[
              { Icon: Calendar, text: slide.date },
              { Icon: MapPin, text: slide.venue },
              { Icon: Clock, text: slide.time },
            ].filter(m => m.text).map(({ Icon, text }, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: mono, fontSize: 12, color: C.c2, minWidth: 0 }}>
                <Icon size={13} style={{ color: C.goldText, flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{text}</span>
              </span>
            ))}
          </div>

          <div key={`cta-${cur}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', animation: 'fadeSlideUp 0.6s 0.5s ease both' }}>
            <Link
              href={slide.href}
              onClick={(e) => {
                if (suppressNavClickRef.current) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                fontFamily: sans, fontSize: 15, fontWeight: 700,
                color: C.onAccent, background: C.gold,
                padding: '14px 22px', borderRadius: R.btn,
                textDecoration: 'none', position: 'relative', zIndex: 16,
              }}
            >
              {slide.cta}
              <ArrowRight size={16} />
            </Link>

            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    armClickSuppress();
                    goTo(i);
                  }}
                  aria-label={`Slide ${i + 1}`}
                  style={{
                    position: 'relative', width: 28, height: 24,
                    cursor: 'pointer', border: 'none', padding: 0, background: 'transparent',
                  }}
                >
                  <span style={{ position: 'absolute', left: 0, right: 0, top: 11, height: 3, borderRadius: 2, overflow: 'hidden', background: i === cur ? 'rgba(245,236,215,0.3)' : 'rgba(245,236,215,0.14)' }}>
                    <span style={{
                      position: 'absolute', inset: 0,
                      background: C.gold,
                      transformOrigin: 'left center',
                      transform: `scaleX(${i === cur ? prog / 100 : i < cur ? 1 : 0})`,
                      transition: i === cur ? 'none' : 'transform 200ms',
                    }} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
