'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { GhanaEvent } from '@/lib/types';
import FlyerCanvas from '@/components/events/FlyerCanvas';
import FriendsStrip from '@/components/social/FriendsStrip';
import { splitEventTitle, eventBlurb } from '@/lib/events/title';
import { parseDay, shortDay } from '@/lib/dates';
import { T, FONT, alpha } from '@/lib/thiscene';

/**
 * First screen of the home page: the featured event's flyer shown whole on its own
 * blurred canvas, with a short title, subtitle and description underneath.
 */
export default function HomeHero({ event, accent, live }: { event: GhanaEvent; accent: string; live: boolean }) {
  const block = useRef<HTMLDivElement>(null);
  const [blockH, setBlockH] = useState(300);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const fn = () => setWide(window.innerWidth >= 900);
    fn();
    window.addEventListener('resize', fn);
    const el = block.current;
    const ro = el ? new ResizeObserver(() => setBlockH(el.offsetHeight)) : null;
    if (el && ro) ro.observe(el);
    return () => { window.removeEventListener('resize', fn); ro?.disconnect(); };
  }, []);

  const { title, subtitle } = splitEventTitle(event.title);
  const d = parseDay(event.date);
  const price = event.price === 0 ? 'Free' : `GH₵ ${event.price.toLocaleString()}`;
  const bottom = wide ? 56 : 104;
  const eyebrow = { fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' } as const;
  const dot = <span aria-hidden style={{ width: 3, height: 3, borderRadius: 2, background: accent, opacity: 0.6 }} />;

  return (
    <section aria-label={event.title} style={{ position: 'relative', height: '100svh', minHeight: 600, maxHeight: 1000, overflow: 'hidden' }}>
      <FlyerCanvas
        src={event.image}
        accent={accent}
        category={event.category}
        area={wide
          ? { top: 96, bottom: 56, right: '6%', left: '54%' }
          : { top: 0, bottom: blockH + bottom + 12, left: 0, right: 0 }}
        bleed={!wide}
      />

      <div
        ref={block}
        style={{ position: 'absolute', left: wide ? 56 : 20, right: wide ? undefined : 20, width: wide ? 'min(44%, 600px)' : undefined, bottom: `calc(${bottom}px + env(safe-area-inset-bottom, 0px))`, display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, ...eyebrow }}>
          <span style={{ color: T.mint }}>{live ? 'Featured' : 'Recently'}</span>
          {dot}
          <span style={{ color: accent }}>{event.category}</span>
          {d && <>{dot}<span style={{ color: accent }}>{shortDay(d)}</span></>}
        </div>

        <Link href={`/events/${event.slug}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h1 style={{ margin: 0, fontFamily: FONT.display, fontSize: wide ? 'clamp(48px, 5vw, 76px)' : title.length > 22 ? 36 : 44, fontWeight: 800, lineHeight: 0.98, letterSpacing: '-0.035em', color: T.white, textShadow: `0 0 42px ${alpha(accent, 0.45)}, 0 2px 18px rgba(0,0,0,0.5)` }}>
            {title}
          </h1>
          {subtitle && <span style={{ fontFamily: FONT.display, fontSize: wide ? 22 : 17, fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>{subtitle}</span>}
        </Link>

        <FriendsStrip slug={event.slug} />

        <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.5, color: T.text2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {eventBlurb(event, 200)}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <Link href={`/events/${event.slug}${live ? '?tickets=1' : ''}`} style={{ height: 48, padding: '0 22px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: T.white, background: alpha(accent, 0.22), border: `1px solid ${alpha(accent, 0.6)}`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', fontFamily: FONT.display, fontSize: 15, fontWeight: 700 }}>
            {live ? <>Get tickets <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>{price}</span></> : 'View event'}
          </Link>
          <Link href="/events" style={{ height: 48, padding: '0 20px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: T.text, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', fontFamily: FONT.sans, fontSize: 15, fontWeight: 600 }}>
            All events
          </Link>
        </div>
      </div>
    </section>
  );
}
