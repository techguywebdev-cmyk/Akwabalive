'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Eye, Flame, Users } from 'lucide-react';
import type { GhanaEvent } from '@/lib/types';
import { parseDay, shortDay } from '@/lib/dates';
import { hiRes } from '@/lib/events/image';
import { eventCounts, trackEvent, compact, type EventCounts } from '@/lib/events/track';
import { T, FONT } from '@/lib/thiscene';

/**
 * A full screen in the feed (every few cards): the hot shows as big flyers to swipe sideways.
 * Real numbers (people who saw it this week, people going) once they're worth showing; otherwise the date.
 */
export default function HotCarousel({ events, topInset, active, onNext }: { events: GhanaEvent[]; topInset: number; active: boolean; onNext: () => void }) {
  const [counts, setCounts] = useState<Record<string, EventCounts>>({});
  const key = events.map((e) => e.slug).join('|');
  useEffect(() => {
    if (!active) return;
    events.forEach((e) => trackEvent(e.slug, 'impression'));
    let live = true;
    eventCounts(events.map((e) => e.slug)).then((c) => { if (live) setCounts(c); }).catch(() => {});
    return () => { live = false; };
  }, [active, key]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section aria-label="Hot right now" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', scrollSnapAlign: 'start', scrollSnapStop: 'always', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: topInset, boxSizing: 'border-box', background: 'radial-gradient(70% 40% at 50% 35%, rgba(123,227,168,0.10) 0%, rgba(0,0,0,0) 70%), #050606' }}>
      <header style={{ padding: '0 20px 14px' }}>
        <p style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.mintText }}><Flame size={14} /> Hot right now</p>
        <h2 style={{ margin: '4px 0 0', fontFamily: FONT.display, fontSize: 28, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.05, color: T.white }}>The shows everyone’s going to</h2>
      </header>
      <div className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', padding: '0 20px', scrollPaddingLeft: 20 }}>
        {events.map((e) => {
          const c = counts[e.slug];
          const d = parseDay(e.date);
          const stat = c && c.seen7d >= 30 ? <><Eye size={13} /> {compact(c.seen7d)} saw this week</>
            : c && c.going >= 10 ? <><Users size={13} /> {compact(c.going)} going</> : null;
          return (
            <Link key={e.slug} href={`/events/${e.slug}`} style={{ flex: '0 0 auto', width: 'min(66vw, 280px)', scrollSnapAlign: 'start', textDecoration: 'none' }}>
              <span style={{ display: 'block', aspectRatio: '4 / 5', borderRadius: 20, overflow: 'hidden', background: '#111', boxShadow: '0 18px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {e.image && <img src={hiRes(e.image, 700) ?? e.image} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }} />}
              </span>
              <span style={{ display: 'block', marginTop: 10, fontFamily: FONT.display, fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 600, color: stat ? T.mintText : T.text2 }}>
                {stat ?? [d ? shortDay(d) : e.dateLabel, e.venue].filter(Boolean).join(' · ')}
              </span>
            </Link>
          );
        })}
      </div>
      <button type="button" onClick={onNext} style={{ alignSelf: 'center', marginTop: 22, height: 40, padding: '0 16px', border: 'none', borderRadius: 999, background: 'rgba(255,255,255,0.07)', color: T.text2, fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        Keep scrolling <ChevronDown size={16} />
      </button>
    </section>
  );
}
