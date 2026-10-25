'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { GhanaEvent } from '@/lib/types';
import FlyerCanvas from '@/components/events/FlyerCanvas';
import { EventTags, MetaRows, BTN, PriceTag } from '@/components/events/CardParts';
import { ticketsLabel } from '@/components/events/EventActions';
import FriendsStrip from '@/components/social/FriendsStrip';
import { splitEventTitle } from '@/lib/events/title';
import { parseDay, shortDay } from '@/lib/dates';
import { T, FONT, alpha } from '@/lib/thiscene';

const SLIDE_MS = 7000;

/** One full-screen slide: the flyer fills the screen, the details sit over its lower part */
function Slide({ event, accent, lead, wide }: { event: GhanaEvent; accent: string; lead: string; wide: boolean }) {
  const block = useRef<HTMLDivElement>(null);
  const [blockH, setBlockH] = useState(260);
  useEffect(() => {
    const el = block.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBlockH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { title, subtitle } = splitEventTitle(event.title);
  const d = parseDay(event.date);
  const label = ticketsLabel(event);
  const bottom = wide ? 64 : 56; // room for the slide bars

  return (
    <section aria-roledescription="slide" aria-label={event.title} style={{ position: 'relative', flex: '0 0 100%', height: '100%', scrollSnapAlign: 'start', overflow: 'hidden' }}>
      <FlyerCanvas
        src={event.image}
        accent={accent}
        category={event.category}
        area={wide ? { top: 104, bottom: 64, right: '6%', left: '54%' } : { top: 0, bottom: blockH + bottom - 40, left: 0, right: 0 }}
        bleed={!wide}
        fill
      />
      <div
        ref={block}
        style={{ position: 'absolute', left: wide ? 56 : 20, right: wide ? undefined : 20, width: wide ? 'min(44%, 600px)' : undefined, bottom: `calc(${bottom}px + env(safe-area-inset-bottom, 0px))`, display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <EventTags event={event} accent={accent} lead={lead} />
        <Link href={`/events/${event.slug}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: wide ? 'clamp(52px, 5.4vw, 84px)' : title.length > 22 ? 40 : 50, fontWeight: 800, lineHeight: 0.95, letterSpacing: '-0.04em', color: T.white, textShadow: `0 0 48px ${alpha(accent, 0.45)}, 0 2px 20px rgba(0,0,0,0.6)` }}>
            {title}
          </h2>
          {subtitle && <span style={{ fontFamily: FONT.display, fontSize: wide ? 22 : 18, fontWeight: 600, color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 10px rgba(0,0,0,0.5)' }}>{subtitle}</span>}
        </Link>
        <FriendsStrip slug={event.slug} />
        <MetaRows when={[d ? shortDay(d) : event.dateLabel, event.time?.toLowerCase()].filter(Boolean).join(' · ')} where={event.venue} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          {label === 'Ended'
            ? <Link href={`/events/${event.slug}`} style={{ ...BTN.primary, flex: wide ? undefined : 1 }}>View event</Link>
            : <>
                <Link href={`/events/${event.slug}?tickets=1`} style={{ ...BTN.primary, flex: wide ? undefined : 1 }}>Get tickets <PriceTag text={label} /></Link>
                <Link href={`/events/${event.slug}`} style={BTN.secondary}>Details</Link>
              </>}
        </div>
      </div>
    </section>
  );
}

/**
 * First screen of the home page: the top events full screen, one at a time. Swipe, or
 * let it move on by itself every few seconds (it stops once you touch it).
 */
export default function HomeHero({ events, accentOf, live }: { events: GhanaEvent[]; accentOf: (e: GhanaEvent) => string; live: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const fn = () => setWide(window.innerWidth >= 900);
    fn();
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const go = (n: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: n * el.clientWidth, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!auto || events.length < 2) return;
    const t = setTimeout(() => go((i + 1) % events.length), SLIDE_MS);
    return () => clearTimeout(t);
  }, [i, auto, events.length]);

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const n = Math.round(el.scrollLeft / el.clientWidth);
    if (n !== i) setI(n);
  };

  return (
    <div aria-roledescription="carousel" aria-label="Top events" style={{ position: 'relative', height: '100svh', minHeight: 620, maxHeight: 1000 }}>
      <div
        ref={track}
        className="no-scrollbar"
        onScroll={onScroll}
        onPointerDown={() => setAuto(false)}
        onTouchStart={() => setAuto(false)}
        style={{ display: 'flex', height: '100%', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory', overscrollBehaviorX: 'contain' }}
      >
        {events.map((e, n) => (
          <Slide key={e.slug} event={e} accent={accentOf(e)} wide={wide} lead={n === 0 ? (live ? 'Top pick' : 'Recently') : live ? 'Featured' : 'Recently'} />
        ))}
      </div>

      {events.length > 1 && (
        <div style={{ position: 'absolute', left: wide ? 56 : 20, right: wide ? undefined : 20, width: wide ? 'min(44%, 600px)' : undefined, bottom: `calc(${wide ? 30 : 24}px + env(safe-area-inset-bottom, 0px))`, display: 'flex', gap: 6 }}>
          {events.map((e, n) => (
            <button key={e.slug} type="button" aria-label={`Show ${e.title}`} aria-current={n === i} onClick={() => { setAuto(false); go(n); }} style={{ flex: 1, height: 18, padding: '7px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
              <span style={{ display: 'block', position: 'relative', height: 3, borderRadius: 2, overflow: 'hidden', background: 'rgba(255,255,255,0.18)' }}>
                <span
                  key={`${i}-${auto}`}
                  style={{ position: 'absolute', inset: 0, borderRadius: 2, background: T.mint, transformOrigin: 'left', transform: n < i || (n === i && !auto) ? 'scaleX(1)' : 'scaleX(0)', animation: n === i && auto ? `akwBar ${SLIDE_MS}ms linear forwards` : undefined }}
                />
              </span>
            </button>
          ))}
        </div>
      )}
      <style>{'@keyframes akwBar{from{transform:scaleX(0)}to{transform:scaleX(1)}}'}</style>
    </div>
  );
}
