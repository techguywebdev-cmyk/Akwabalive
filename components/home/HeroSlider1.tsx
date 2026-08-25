'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowRight, MapPin, Calendar, Clock } from 'lucide-react';

interface Slide {
  eyebrow: string;
  live?: string;
  titleLine1: string;
  titleLine2: string;
  date: string;
  venue: string;
  time: string;
  cta: string;
  image: string;
  glow: 'green' | 'gold' | 'red';
  href: string;
}

const SLIDES: Slide[] = [
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
  {
    eyebrow: 'Annual',
    live: 'Dec 26',
    titleLine1: 'Detty',
    titleLine2: 'December',
    date: 'Dec 26, 2025',
    venue: 'Labadi Beach, Accra',
    time: '4:00 PM',
    cta: 'Book Early — from ₵350',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1800&q=88&auto=format&fit=crop',
    glow: 'green',
    href: '/events',
  },
  {
    eyebrow: 'Headline Concert',
    titleLine1: 'Sarkodie',
    titleLine2: 'Live',
    date: 'Jun 21, 2025',
    venue: 'Accra Sports Stadium',
    time: '7:00 PM',
    cta: 'Get Tickets — from ₵220',
    image: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1800&q=88&auto=format&fit=crop',
    glow: 'red',
    href: '/events',
  },
];

const DURATION = 6200;

const GLOWS = {
  green: 'radial-gradient(ellipse 65% 75% at 18% 68%, rgba(27,67,50,0.38) 0%, transparent 62%)',
  gold:  'radial-gradient(ellipse 60% 65% at 22% 62%, rgba(200,146,42,0.2) 0%, transparent 58%)',
  red:   'radial-gradient(ellipse 55% 60% at 15% 72%, rgba(206,17,38,0.16) 0%, transparent 55%)',
};

export default function HeroSlider() {
  const [cur,    setCur]    = useState(0);
  const [prog,   setProg]   = useState(0);
  const [paused, setPaused] = useState(false);
  const [touchX, setTouchX] = useState<number | null>(null);
  const rafRef   = useRef<number>();
  const startRef = useRef<number>();

  const goTo = useCallback((n: number) => {
    const next = ((n % SLIDES.length) + SLIDES.length) % SLIDES.length;
    setCur(next);
    setProg(0);
    startRef.current = undefined;
  }, []);

  useEffect(() => {
    const tick = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      if (!paused) {
        const pct = Math.min(((ts - startRef.current) / DURATION) * 100, 100);
        setProg(pct);
        if (pct >= 100) { goTo(cur + 1); return; }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [cur, paused, goTo]);

  const slide = SLIDES[cur];

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
        const dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 44) goTo(dx < 0 ? cur + 1 : cur - 1);
        setTouchX(null);
      }}
    >
      {/* Slides */}
      {SLIDES.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute', inset: 0,
            opacity: i === cur ? 1 : 0,
            transition: 'opacity 1100ms cubic-bezier(.4,0,.2,1)',
            pointerEvents: i === cur ? 'auto' : 'none',
          }}
        >
          {/* Background image via CSS — avoids Next Image fill issues */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${s.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.44) saturate(0.78)',
            transform: i === cur ? 'scale(1.08)' : 'scale(1.03)',
            transition: i === cur ? 'transform 14000ms cubic-bezier(.25,.46,.45,.94)' : 'none',
          }} />

          {/* Atmosphere */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0D0B08 0%, rgba(13,11,8,0.55) 38%, rgba(13,11,8,0.08) 65%, transparent 100%)', zIndex: 1 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(13,11,8,0.85) 0%, rgba(13,11,8,0.26) 42%, transparent 70%)', zIndex: 1 }} />
          <div style={{ position: 'absolute', inset: 0, background: GLOWS[s.glow], zIndex: 2, opacity: i === cur ? 1 : 0, transition: 'opacity 1600ms ease' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 100% 60% at 50% 100%, rgba(200,146,42,0.05) 0%, transparent 70%)', zIndex: 2 }} />
        </div>
      ))}

      {/* Content */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
        padding: '0 24px 72px',
      }}>
        <div style={{ maxWidth: 640 }}>

          {/* Eyebrow */}
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
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#CE1126', animation: 'blink 1s infinite', flexShrink: 0 }} />
                {slide.live}
              </span>
            )}
          </div>

          {/* Title */}
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

          {/* Meta */}
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

          {/* CTA */}
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
                transition: 'opacity 200ms',
              }}
            >
              {slide.cta}
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <div style={{
        position: 'absolute', zIndex: 10,
        bottom: 72, right: 24,
        display: 'flex', gap: 6, alignItems: 'center',
      }}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
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
