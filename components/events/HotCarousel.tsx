'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Eye, Flame, Users } from 'lucide-react';
import type { GhanaEvent } from '@/lib/types';
import { parseDay, shortDay } from '@/lib/dates';
import { hiRes } from '@/lib/events/image';
import { eventCounts, trackEvent, compact, type EventCounts } from '@/lib/events/track';
import { T, FONT } from '@/lib/thiscene';
import { Glow } from '@/components/events/FlyerCanvas';
import { Avatar, sentence, type Friend } from '@/components/social/FriendsStrip';

/**
 * A full screen in the feed (every few cards): the hot shows as big flyers to swipe sideways.
 * Real numbers (people who saw it this week, people going) once they're worth showing; otherwise the date.
 */
export default function HotCarousel({ events, topInset, active, onNext, friends }: {
  events: GhanaEvent[]; topInset: number; active: boolean; onNext: () => void;
  /** Friends' plans screen: who you follow is going to each show */
  friends?: Record<string, Friend[]>;
}) {
  const [counts, setCounts] = useState<Record<string, EventCounts>>({});
  const key = events.map((e) => e.slug).join('|');
  // Tiles keep the flyer's 4:5 shape at the full height available (nothing cropped at the sides)
  const rowRef = useRef<HTMLDivElement>(null);
  const [tileW, setTileW] = useState<number | null>(null);
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const fit = () => setTileW(Math.round(Math.min((el.clientHeight - 54) * 0.8, el.clientWidth * 0.86, 560)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (!active) return;
    events.forEach((e) => trackEvent(e.slug, 'impression'));
    let live = true;
    eventCounts(events.map((e) => e.slug)).then((c) => { if (live) setCounts(c); }).catch(() => {});
    return () => { live = false; };
  }, [active, key]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section aria-label={friends ? 'Your friends’ plans' : 'Hot right now'} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', scrollSnapAlign: 'start', scrollSnapStop: 'always', display: 'flex', flexDirection: 'column', paddingTop: `calc(${topInset + 4}px + env(safe-area-inset-top, 0px))`, paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))', boxSizing: 'border-box', background: 'radial-gradient(70% 40% at 50% 30%, rgba(123,227,168,0.10) 0%, rgba(0,0,0,0) 70%), #050606' }}>
      <header style={{ display: 'flex', alignItems: 'flex-end', gap: 12, padding: '0 20px 12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.mintText }}>{friends ? <><Users size={14} /> Your people</> : <><Flame size={14} /> Hot right now</>}</p>
          <h2 style={{ margin: '3px 0 0', fontFamily: FONT.display, fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, color: T.white }}>{friends ? 'Where your friends are going' : 'The shows everyone’s going to'}</h2>
        </div>
        <button type="button" onClick={onNext} aria-label="Next event" style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 20, border: 'none', background: 'transparent', color: T.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ChevronDown size={18} /></button>
      </header>
      {/* The flyers fill the rest of the screen; swipe sideways for the next one */}
      <div ref={rowRef} className="no-scrollbar" style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', padding: '0 20px', scrollPaddingLeft: 20 }}>
        {events.map((e) => {
          const c = counts[e.slug];
          const d = parseDay(e.date);
          const stat = c && c.seen7d >= 30 ? <><Eye size={13} /> {compact(c.seen7d)} saw this week</>
            : c && c.going >= 10 ? <><Users size={13} /> {compact(c.going)} going</> : null;
          return (
            <Link key={e.slug} href={`/events/${e.slug}`} style={{ flex: '0 0 auto', width: tileW ?? '80%', height: '100%', scrollSnapAlign: 'start', textDecoration: 'none', display: 'flex', flexDirection: 'column' }}>
              <span style={{ position: 'relative', flex: 1, minHeight: 0, borderRadius: 22, overflow: 'hidden', background: '#111', boxShadow: '0 18px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {/* The whole flyer, never cropped; any spare room takes its own colours */}
                {e.image && <Glow src={hiRes(e.image, 900) ?? e.image} />}
                {e.image && <img src={hiRes(e.image, 900) ?? e.image} alt="" loading="lazy" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />}
              </span>
              <span style={{ display: 'block', marginTop: 10, fontFamily: FONT.display, fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
              {friends?.[e.slug]?.length ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, overflow: 'hidden' }}>
                  <span style={{ display: 'flex', flexShrink: 0 }}>
                    {friends[e.slug].slice(0, 3).map((f, k) => <span key={f.id} style={{ marginLeft: k ? -8 : 0 }}><Avatar f={f} size={24} ring="#050606" /></span>)}
                  </span>
                  <span style={{ fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 600, color: T.mintText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sentence(friends[e.slug])}{d ? ` · ${shortDay(d)}` : ''}</span>
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 600, color: stat ? T.mintText : T.text2, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {stat ?? [d ? shortDay(d) : e.dateLabel, e.venue].filter(Boolean).join(' · ')}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
