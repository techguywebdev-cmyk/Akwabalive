'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, MapPin, Calendar, Clock } from 'lucide-react';
import clsx from 'clsx';

interface Slide {
  eyebrow: string;
  live?: string;
  titleLine1: string;
  titleLine2: string;
  titleItalic: boolean;
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
    titleItalic: true,
    date: 'Dec 28–29, 2025',
    venue: 'El Wak Stadium, Accra',
    time: 'Gates open 4:00 PM',
    cta: 'Get Tickets — from ₵350',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1800&q=88',
    glow: 'green',
    href: '/events/afrochella-music-arts-2025',
  },
  {
    eyebrow: 'Annual Cultural Festival',
    titleLine1: 'Akwasidae',
    titleLine2: 'Festival',
    titleItalic: true,
    date: 'Apr 6, 2025',
    venue: 'Manhyia Palace, Kumasi',
    time: 'All Day',
    cta: 'RSVP Free',
    image: 'https://images.unsplash.com/photo-1604537466158-719b1972feb8?w=1800&q=88',
    glow: 'gold',
    href: '/events/akwasidae-festival',
  },
  {
    eyebrow: 'Annual',
    live: 'Dec 26',
    titleLine1: 'Detty',
    titleLine2: 'December',
    titleItalic: true,
    date: 'Dec 26, 2025',
    venue: 'Labadi Beach, Accra',
    time: '4:00 PM',
    cta: 'Book Early — from ₵350',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1800&q=88',
    glow: 'green',
    href: '/events/detty-december-beach-rave',
  },
  {
    eyebrow: 'Headline Concert',
    titleLine1: 'Sarkodie',
    titleLine2: 'Live',
    titleItalic: true,
    date: 'Jun 21, 2025',
    venue: 'Accra Sports Stadium',
    time: '7:00 PM',
    cta: 'Get Tickets — from ₵220',
    image: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1800&q=88',
    glow: 'red',
    href: '/events/sarkodie-live-in-concert',
  },
];

const DURATION = 6200;

const GLOWS = {
  green: 'radial-gradient(ellipse 65% 75% at 18% 68%, rgba(27,67,50,0.35) 0%, transparent 62%)',
  gold:  'radial-gradient(ellipse 60% 65% at 22% 62%, rgba(200,146,42,0.18) 0%, transparent 58%)',
  red:   'radial-gradient(ellipse 55% 60% at 15% 72%, rgba(206,17,38,0.14) 0%, transparent 55%)',
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
      className="relative overflow-hidden"
      style={{ height: '100svh', minHeight: 600 }}
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
      {SLIDES.map((s, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-[1100ms] ease-[cubic-bezier(.4,0,.2,1)]"
          style={{ opacity: i === cur ? 1 : 0, pointerEvents: i === cur ? 'auto' : 'none' }}
        >
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src={s.image}
              alt={s.titleLine2}
              fill
              priority={i === 0}
              sizes="100vw"
              className={clsx(
                'object-cover transition-transform ease-[cubic-bezier(.25,.46,.45,.94)]',
                i === cur ? 'scale-[1.13] duration-[14000ms]' : 'scale-[1.06] duration-0',
              )}
              style={{ filter: 'brightness(0.44) saturate(0.78)' }}
            />
          </div>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0D0B08 0%, rgba(13,11,8,0.52) 35%, rgba(13,11,8,0.06) 65%, transparent 100%)', zIndex: 1 }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(13,11,8,0.82) 0%, rgba(13,11,8,0.24) 40%, transparent 68%)', zIndex: 1 }} />
          <div
            className="absolute inset-0 transition-opacity duration-[1600ms]"
            style={{ background: GLOWS[s.glow], zIndex: 2, opacity: i === cur ? 1 : 0 }}
          />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 100% 100% at 50% 100%, rgba(200,146,42,0.04) 0%, transparent 70%)', zIndex: 2 }} />
          <div className="grain" />
        </div>
      ))}

      <div
        className="absolute bottom-0 left-0 right-0 z-10"
        style={{ padding: '0 clamp(20px,5vw,56px) clamp(56px,8vh,80px)' }}
      >
        <div style={{ maxWidth: 680 }}>

          <div
            key={`ey-${cur}`}
            className="flex items-center gap-2.5 mb-[18px]"
            style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#C8922A', animation: 'fadeSlideUp 0.55s 0.1s ease both' }}
          >
            <span style={{ display: 'block', width: 24, height: 1, background: '#C8922A', flexShrink: 0 }} />
            {slide.eyebrow}
            {slide.live && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(206,17,38,0.18)', border: '1px solid rgba(206,17,38,0.38)', color: 'rgba(255,110,110,0.9)', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '2px', textTransform: 'uppercase', padding: '3px 9px' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#CE1126', animation: 'blink 1s infinite', flexShrink: 0 }} />
                {slide.live}
              </span>
            )}
          </div>

          <h1
            key={`t-${cur}`}
            style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 'clamp(52px,7.5vw,100px)', fontWeight: 300, lineHeight: 0.88, letterSpacing: '-3px', color: '#fff', marginBottom: 20, animation: 'fadeSlideUp 0.7s 0.22s ease both' }}
          >
            {slide.titleLine1}<br />
            {slide.titleItalic
              ? <em style={{ fontStyle: 'italic', fontWeight: 300 }}>{slide.titleLine2}</em>
              : slide.titleLine2
            }
          </h1>

          <div
            key={`m-${cur}`}
            className="flex flex-wrap items-center gap-0 mb-7"
            style={{ animation: 'fadeSlideUp 0.62s 0.36s ease both' }}
          >
            {[
              { Icon: Calendar, text: slide.date  },
              { Icon: MapPin,   text: slide.venue },
              { Icon: Clock,    text: slide.time  },
            ].map(({ Icon, text }, i) => (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 'clamp(9px,1.2vw,11px)', letterSpacing: '0.5px', color: 'rgba(245,236,215,0.55)', paddingRight: i < 2 ? 18 : 0, marginRight: i < 2 ? 18 : 0, borderRight: i < 2 ? '1px solid rgba(245,236,215,0.1)' : 'none' }}
              >
                <Icon size={11} style={{ color: '#C8922A', opacity: 0.8, flexShrink: 0 }} />
                <span className={i === 1 ? 'hidden sm:inline' : ''}>{text}</span>
              </div>
            ))}
          </div>

          <div key={`cta-${cur}`} style={{ animation: 'fadeSlideUp 0.6s 0.5s ease both' }}>
            <Link
              href={slide.href}
              className="group"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 14, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#fff', padding: '15px 28px', borderTop: '1.5px solid #C8922A', borderBottom: '1.5px solid rgba(245,236,215,0.1)', background: 'transparent', position: 'relative', overflow: 'hidden', textDecoration: 'none' }}
            >
              <span style={{ position: 'relative', zIndex: 1 }}>{slide.cta}</span>
              <ArrowRight size={13} style={{ position: 'relative', zIndex: 1 }} className="transition-transform duration-300 group-hover:translate-x-1" />
              <span
                style={{ position: 'absolute', inset: 0, background: '#C8922A', transformOrigin: 'left center', zIndex: 0 }}
                className="scale-x-0 group-hover:scale-x-100 transition-transform duration-[420ms] ease-[cubic-bezier(.22,1,.36,1)]"
              />
            </Link>
          </div>
        </div>
      </div>

      <div
        className="absolute z-10 flex gap-1.5 items-center"
        style={{ bottom: 'clamp(56px,8vh,80px)', right: 'clamp(20px,5vw,56px)' }}
      >
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
            style={{ position: 'relative', width: 28, height: 2, borderRadius: 1, overflow: 'hidden', background: 'rgba(245,236,215,0.14)', cursor: 'pointer', border: 'none', padding: 0 }}
          >
            <span
              style={{ position: 'absolute', inset: 0, background: '#C8922A', transformOrigin: 'left center', transform: `scaleX(${i === cur ? prog / 100 : i < cur ? 1 : 0})` }}
            />
          </button>
        ))}
      </div>
    </section>
  );
            }
