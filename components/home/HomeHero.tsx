'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { GhanaEvent } from '@/lib/types';
import FlyerCanvas from '@/components/events/FlyerCanvas';
import { EventTags, MetaRows, BTN, PriceTag } from '@/components/events/CardParts';
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
  const bottom = wide ? 56 : 32;

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
        style={{ position: 'absolute', left: wide ? 56 : 20, right: wide ? undefined : 20, width: wide ? 'min(44%, 600px)' : undefined, bottom: `calc(${bottom}px + env(safe-area-inset-bottom, 0px))`, display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <EventTags event={event} accent={accent} lead={live ? 'Featured' : 'Recently'} />

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

        {d && <MetaRows when={[shortDay(d), event.time?.toLowerCase()].filter(Boolean).join(' · ')} where={event.venue} />}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          {live ? (
            <Link href={`/events/${event.slug}?tickets=1`} style={{ ...BTN.primary, flex: wide ? undefined : 1 }}>Get tickets <PriceTag text={price} /></Link>
          ) : (
            <Link href={`/events/${event.slug}`} style={{ ...BTN.primary, flex: wide ? undefined : 1 }}>View event</Link>
          )}
          <Link href="/events" style={BTN.secondary}>All events</Link>
        </div>
      </div>
    </section>
  );
}
