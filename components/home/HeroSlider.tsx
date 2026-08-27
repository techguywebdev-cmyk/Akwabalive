'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
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

/** Image-only slides */
const IMAGE_DURATION = 6500;
/** Give promo video time to play before advancing */
const VIDEO_DURATION = 18000;

const GLOWS = {
  green: 'radial-gradient(ellipse 65% 75% at 18% 68%, rgba(27,67,50,0.38) 0%, transparent 62%)',
  gold:  'radial-gradient(ellipse 60% 65% at 22% 62%, rgba(200,146,42,0.2) 0%, transparent 58%)',
  red:   'radial-gradient(ellipse 55% 60% at 15% 72%, rgba(206,17,38,0.16) 0%, transparent 55%)',
};

function ytSrc(id: string, withSound: boolean) {
  // controls=0 + chrome params; mute until user gesture when needed
  return (
    `https://www.youtube.com/embed/${id}` +
    `?autoplay=1&mute=${withSound ? 0 : 1}` +
    `&controls=0&loop=1&playlist=${id}` +
    `&playsinline=1&rel=0&modestbranding=1` +
    `&iv_load_policy=3&fs=0&disablekb=1&cc_load_policy=0` +
    `&showinfo=0&color=white`
  );
}

export default function HeroSlider({ initialSlides }: { initialSlides?: HeroSlide[] }) {
  const [slides, setSlides] = useState<HeroSlide[]>(
    initialSlides && initialSlides.length ? initialSlides : FALLBACK,
  );
  const [cur, setCur] = useState(0);
  const [prog, setProg] = useState(0);
  const [paused, setPaused] = useState(false);
  const [touchX, setTouchX] = useState<number | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [wantSound, setWantSound] = useState(false);
  const rafRef = useRef<number>();
  const startRef = useRef<number>();

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
  const duration = hasPromo ? VIDEO_DURATION : IMAGE_DURATION;

  // Mount video shortly after slide change; hold image until then
  useEffect(() => {
    setShowVideo(false);
    setVideoReady(false);
    setWantSound(false);
    if (!hasPromo) return;
    const t = window.setTimeout(() => setShowVideo(true), 400);
    return () => window.clearTimeout(t);
  }, [cur, hasPromo, ytId, isMp4]);

  // After iframe is in DOM, briefly wait then reveal (hides YouTube seek flash)
  useEffect(() => {
    if (!showVideo) return;
    const t = window.setTimeout(() => setVideoReady(true), 600);
    return () => window.clearTimeout(t);
  }, [showVideo, cur]);

  // Unlock sound on first real interaction (browsers block unmuted autoplay)
  useEffect(() => {
    const unlock = () => setWantSound(true);
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const goTo = useCallback((n: number) => {
    const len = slides.length || 1;
    const next = ((n % len) + len) % len;
    setCur(next);
    setProg(0);
    startRef.current = undefined;
  }, [slides.length]);

  // Progress / auto-advance — longer window when promo video is on the slide
  useEffect(() => {
    const tick = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      if (!paused) {
        const pct = Math.min(((ts - startRef.current) / duration) * 100, 100);
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
  }, [cur, paused, goTo, duration]);

  function onScreenTap(clientX: number, width: number) {
    setWantSound(true); // unlock audio with the same tap
    // Left third = previous, right third = next (middle reserved for CTA)
    if (clientX < width * 0.33) goTo(cur - 1);
    else if (clientX > width * 0.67) goTo(cur + 1);
  }

  return (
    <section
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        minHeight: 600,
        overflow: 'hidden',
        background: '#0D0B08',
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={e => setTouchX(e.touches[0].clientX)}
      onTouchEnd={e => {
        if (touchX === null) return;
        const x = e.changedTouches[0].clientX;
        const dx = x - touchX;
        const w = (e.currentTarget as HTMLElement).clientWidth || window.innerWidth;
        if (Math.abs(dx) > 44) {
          setWantSound(true);
          goTo(dx < 0 ? cur + 1 : cur - 1);
        } else {
          // Tap (not swipe): left / right zones
          onScreenTap(x, w);
        }
        setTouchX(null);
      }}
      onClick={e => {
        // Desktop click left/right (ignore real links/buttons)
        const t = e.target as HTMLElement;
        if (t.closest('a,button')) return;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        onScreenTap(e.clientX - rect.left, rect.width);
      }}
    >
      {slides.map((s, i) => {
        const active = i === cur;
        const sYt = s.promoVideoUrl ? extractYoutubeId(s.promoVideoUrl) : null;
        const sMp4 = !!s.promoVideoUrl && /\.(mp4|webm)(\?|$)/i.test(s.promoVideoUrl);
        const playThis = active && showVideo && (sYt || sMp4);

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
            {/* Still image always under video */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${s.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat',
              filter: 'brightness(0.48) saturate(0.82)',
              opacity: playThis && videoReady ? 0 : 1,
              transition: 'opacity 700ms ease',
            }} />

            {playThis && sYt && (
              <div style={{
                position: 'absolute', inset: 0, overflow: 'hidden',
                opacity: videoReady ? 1 : 0,
                transition: 'opacity 500ms ease',
              }}>
                <iframe
                  key={`${sYt}-${wantSound ? 's' : 'm'}-${i}`}
                  title="Promo"
                  src={ytSrc(sYt, wantSound)}
                  allow="autoplay; encrypted-media"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    pointerEvents: 'none',
                    filter: 'brightness(0.5) saturate(0.85)',
                    transform: 'translate(-50%, -50%) scale(2.2)',
                    transformOrigin: 'center center',
                  }}
                />
                {/* Mask YouTube chrome / seek */}
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 80, background: 'linear-gradient(to top, #0D0B08 20%, transparent)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 64, background: 'linear-gradient(to bottom, rgba(13,11,8,0.65), transparent)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 24, background: 'linear-gradient(to right, rgba(13,11,8,0.4), transparent)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 24, background: 'linear-gradient(to left, rgba(13,11,8,0.4), transparent)', pointerEvents: 'none' }} />
              </div>
            )}
            {playThis && sMp4 && s.promoVideoUrl && (
              <video
                key={`${s.promoVideoUrl}-${wantSound}`}
                src={s.promoVideoUrl}
                autoPlay
                muted={!wantSound}
                loop
                playsInline
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  filter: 'brightness(0.5) saturate(0.85)',
                  opacity: videoReady ? 1 : 0,
                  transition: 'opacity 500ms ease',
                }}
              />
            )}

            <div style={{
              position: 'absolute', inset: 0, zIndex: 1,
              background: 'linear-gradient(to top, #0D0B08 0%, rgba(13,11,8,0.55) 38%, rgba(13,11,8,0.08) 65%, transparent 100%)',
            }} />
            <div style={{
              position: 'absolute', inset: 0, zIndex: 1,
              background: 'linear-gradient(to right, rgba(13,11,8,0.85) 0%, rgba(13,11,8,0.26) 42%, transparent 70%)',
            }} />
            <div style={{
              position: 'absolute', inset: 0, zIndex: 2,
              background: GLOWS[s.glow],
              opacity: active ? 1 : 0,
              transition: 'opacity 1600ms ease',
            }} />
          </div>
        );
      })}

      {/* Invisible tap zones hint layer — content sits above for CTA */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
        padding: '0 24px 72px',
        pointerEvents: 'none',
      }}>
        <div style={{ maxWidth: 640, pointerEvents: 'auto' }}>
          <div
            key={`ey-${cur}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              fontFamily: 'var(--font-dm-mono, monospace)',
              fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase',
              color: '#C8922A', marginBottom: 16,
              animation: 'fadeSlideUp 0.55s 0.1s ease both',
            }}
          >
            <span style={{ display: 'block', width: 24, height: 1, background: '#C8922A', flexShrink: 0 }} />
            {slide.eyebrow}
            {slide.live && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(206,17,38,0.18)', border: '1px solid rgba(206,17,38,0.38)',
                color: 'rgba(255,110,110,0.9)',
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: 7, letterSpacing: '2px', textTransform: 'uppercase',
                padding: '3px 9px',
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%', background: '#CE1126',
                  animation: 'blink 1s infinite', flexShrink: 0,
                }} />
                {slide.live}
              </span>
            )}
          </div>

          <h1
            key={`t-${cur}`}
            style={{
              fontFamily: 'var(--font-cormorant, serif)',
              fontSize: 'clamp(48px, 12vw, 100px)',
              fontWeight: 300, lineHeight: 0.9,
              letterSpacing: '-2px', color: '#fff',
              marginBottom: 18,
              animation: 'fadeSlideUp 0.7s 0.22s ease both',
            }}
          >
            {slide.titleLine1}<br />
            <em style={{ fontStyle: 'italic', fontWeight: 300 }}>{slide.titleLine2}</em>
          </h1>

          <div
            key={`m-${cur}`}
            style={{
              display: 'flex', flexWrap: 'wrap', alignItems: 'center',
              gap: 0, marginBottom: 24,
              animation: 'fadeSlideUp 0.62s 0.36s ease both',
            }}
          >
            {[
              { icon: '📅', text: slide.date  },
              { icon: '📍', text: slide.venue },
              { icon: '🕐', text: slide.time  },
            ].map(({ icon, text }, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: 10, letterSpacing: '0.5px',
                color: 'rgba(245,236,215,0.55)',
                paddingRight: i < 2 ? 14 : 0,
                marginRight: i < 2 ? 14 : 0,
                borderRight: i < 2 ? '1px solid rgba(245,236,215,0.1)' : 'none',
              }}>
                <span style={{ color: '#C8922A', fontSize: 10 }}>{icon}</span>
                {i === 1
                  ? <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{text}</span>
                  : <span>{text}</span>
                }
              </div>
            ))}
          </div>

          <div key={`cta-${cur}`} style={{ animation: 'fadeSlideUp 0.6s 0.5s ease both' }}>
            <Link
              href={slide.href}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 12,
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase',
                color: '#0D0B08',
                padding: '14px 28px',
                background: '#C8922A',
                borderRadius: 6,
                textDecoration: 'none',
                fontWeight: 700,
              }}
            >
              {slide.cta}
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      <div style={{
        position: 'absolute', zIndex: 10,
        bottom: 72, right: 24,
        display: 'flex', gap: 6, alignItems: 'center',
      }}>
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); goTo(i); }}
            aria-label={`Slide ${i + 1}`}
            style={{
              position: 'relative', width: 28, height: 2,
              borderRadius: 1, overflow: 'hidden',
              background: i === cur ? 'rgba(245,236,215,0.3)' : 'rgba(245,236,215,0.12)',
              cursor: 'pointer', border: 'none', padding: 0,
            }}
          >
            <span style={{
              position: 'absolute', inset: 0,
              background: '#C8922A',
              transformOrigin: 'left center',
              transform: `scaleX(${i === cur ? prog / 100 : i < cur ? 1 : 0})`,
              transition: i === cur ? 'none' : 'transform 200ms',
            }} />
          </button>
        ))}
      </div>
    </section>
  );
}
