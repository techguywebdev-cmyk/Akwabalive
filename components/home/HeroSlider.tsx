'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, MapPin, Calendar, Clock } from 'lucide-react';
import clsx from 'clsx';

interface Slide {
  eyebrow: string;
  live?: string;
  title: string;
  titleItalic: string;
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
    title: 'Afrochella\nMusic & ',
    titleItalic: 'Arts',
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
    title: 'Akwasidae\n',
    titleItalic: 'Festival',
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
    title: 'Detty\n',
    titleItalic: 'December',
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
    title: 'Sarkodie\n',
    titleItalic: 'Live',
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

export default function HeroSlider() {
  const [cur, setCur] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [touchX, setTouchX] = useState<number | null>(null);
  const rafRef = useRef<number>();
  const startRef = useRef<number>();

  const goTo = useCallback((n: number) => {
    setCur(((n % SLIDES.length) + SLIDES.length) % SLIDES.length);
    setProgress(0);
    startRef.current = undefined;
  }, []);

  useEffect(() => {
    const tick = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      if (!paused) {
        const pct = Math.min(((ts - startRef.current) / DURATION) * 100, 100);
        setProgress(pct);
        if (pct >= 100) {
          goTo(cur + 1);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [cur, paused, goTo]);

  const slide = SLIDES[cur];

  return (
    <section
      className="relative h-svh min-h-[600px] overflow-hidden"
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
          className={clsx(
            'absolute inset-0 transition-opacity duration-[1100ms] ease-[cubic-bezier(.4,0,.2,1)]',
            i === cur ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          )}
        >
          {/* Background image with Ken Burns */}
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src={s.image}
              alt={s.titleItalic}
              fill
              priority={i === 0}
              sizes="100vw"
              className={clsx(
                'object-cover brightness-[0.48] saturate-[0.82] transition-transform ease-[cubic-bezier(.25,.46,.45,.94)]',
                i === cur ? 'scale-[1.13] duration-[14000ms]' : 'scale-[1.06] duration-0'
              )}
            />
          </div>

          {/* Atmosphere layers */}
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/45 to-bg/5 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-r from-bg/78 via-bg/22 to-transparent z-[1]" />
          <div
            className={clsx(
              'absolute inset-0 z-[2] transition-opacity duration-[1600ms]',
              i === cur ? 'opacity-100' : 'opacity-0'
            )}
            style={{
              background:
                s.glow === 'green'
                  ? 'radial-gradient(ellipse 65% 75% at 18% 68%, rgba(0,107,63,0.2) 0%, transparent 62%)'
                  : s.glow === 'gold'
                  ? 'radial-gradient(ellipse 60% 65% at 22% 62%, rgba(212,175,55,0.14) 0%, transparent 58%)'
                  : 'radial-gradient(ellipse 55% 60% at 15% 72%, rgba(206,17,38,0.1) 0%, transparent 55%)',
            }}
          />
          <div className="grain-overlay" />
        </div>
      ))}

      {/* Content — always visible, animates per slide change */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-8 md:px-14 pb-16 max-w-[680px]">
        {/* Eyebrow */}
        <div
          key={`eyebrow-${cur}`}
          className="flex items-center gap-2.5 font-mono text-[8px] tracking-[2.5px] uppercase text-green-light mb-[18px] animate-[fadeSlideUp_0.55s_0.1s_ease_both]"
        >
          <span className="block w-6 h-px bg-green-light flex-shrink-0" />
          {slide.eyebrow}
          {slide.live && (
            <span className="inline-flex items-center gap-1.5 bg-red/18 border border-red/35 text-[rgba(255,100,100,0.9)] font-mono text-[7px] tracking-[2px] uppercase px-2.5 py-1">
              <span className="w-[5px] h-[5px] rounded-full bg-red animate-blink flex-shrink-0" />
              {slide.live}
            </span>
          )}
        </div>

        {/* Title */}
        <h1
          key={`title-${cur}`}
          className="font-serif font-light text-[clamp(52px,7.5vw,100px)] leading-[0.88] tracking-[-3px] text-white mb-5 animate-[fadeSlideUp_0.7s_0.22s_ease_both]"
        >
          {slide.title.split('\n').map((line, i) => (
            <span key={i} className="block">
              {line}
              {i === slide.title.split('\n').length - 1 && (
                <em className="italic font-light">{slide.titleItalic}</em>
              )}
            </span>
          ))}
        </h1>

        {/* Meta */}
        <div
          key={`meta-${cur}`}
          className="flex items-center flex-wrap gap-0 mb-7 animate-[fadeSlideUp_0.62s_0.36s_ease_both]"
        >
          {[
            { icon: Calendar, text: slide.date },
            { icon: MapPin, text: slide.venue },
            { icon: Clock, text: slide.time },
          ].map(({ icon: Icon, text }, i) => (
            <div
              key={i}
              className={clsx(
                'flex items-center gap-[7px] font-mono text-[10px] tracking-[0.5px] text-white/65',
                i < 2 && 'pr-[18px] mr-[18px] border-r border-white/10'
              )}
            >
              <Icon size={11} className="text-green-light opacity-80 flex-shrink-0" />
              {text}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          key={`cta-${cur}`}
          className="animate-[fadeSlideUp_0.6s_0.5s_ease_both]"
        >
          <Link
            href={slide.href}
            className="group inline-flex items-center gap-4 font-mono text-[8px] tracking-[2.5px] uppercase text-white px-7 py-[15px] border-t-[1.5px] border-b-[1.5px] border-t-green-light border-b-white/10 bg-transparent relative overflow-hidden transition-colors duration-300"
          >
            <span className="absolute inset-0 bg-green-light scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-[420ms] ease-[cubic-bezier(.22,1,.36,1)] z-0" />
            <span className="relative z-10">{slide.cta}</span>
            <ArrowRight
              size={13}
              className="relative z-10 transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>
        </div>
      </div>

      {/* Progress dots */}
      <div className="absolute bottom-16 right-8 md:right-14 z-10 flex gap-1.5 items-center">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="relative w-7 h-[2px] rounded-px overflow-hidden bg-white/14 cursor-pointer transition-colors hover:bg-white/28"
            aria-label={`Go to slide ${i + 1}`}
          >
            <span
              className="absolute inset-0 bg-green-light origin-left transition-none"
              style={{
                transform: `scaleX(${i === cur ? progress / 100 : i < cur ? 1 : 0})`,
              }}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
