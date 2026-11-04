'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame, Eye, Users } from 'lucide-react';
import type { GhanaEvent } from '@/lib/types';
import { parseDay, shortDay } from '@/lib/dates';
import { hiRes } from '@/lib/events/image';
import { eventCounts, trackEvent, compact, type EventCounts } from '@/lib/events/track';
import { T, FONT } from '@/lib/thiscene';

export const HOT_RAIL_H = 96;

const ring = 'linear-gradient(135deg, #FF4D2E 0%, #FF8A3D 45%, #FFD23F 100%)';

/**
 * The Hot rail: the shows everyone's after, pinned under the header on the events feed and list,
 * so they're one tap away on every screen. Shows real numbers (people who saw it this week, people going)
 * once they're worth showing; otherwise the date.
 */
export default function HotRail({ events, top }: { events: GhanaEvent[]; top: number }) {
  const [counts, setCounts] = useState<Record<string, EventCounts>>({});
  const key = events.map((e) => e.slug).join('|');

  useEffect(() => {
    if (!events.length) return;
    events.forEach((e) => trackEvent(e.slug, 'impression'));
    let live = true;
    eventCounts(events.map((e) => e.slug)).then((c) => { if (live) setCounts(c); }).catch(() => {});
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!events.length) return null;
  return (
    <nav aria-label="Hot right now" style={{ position: 'fixed', zIndex: 190, left: 0, right: 0, top: `calc(${top}px + env(safe-area-inset-top, 0px))`, height: HOT_RAIL_H, background: 'linear-gradient(180deg, rgba(5,6,6,0.94) 0%, rgba(5,6,6,0.86) 75%, rgba(5,6,6,0) 100%)' }}>
      <div className="no-scrollbar" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, overflowX: 'auto', padding: '4px 16px 0', maxWidth: 960, margin: '0 auto' }}>
        <span aria-hidden style={{ flexShrink: 0, width: 46, height: 72, borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: 'rgba(255,106,61,0.12)', border: '1px solid rgba(255,138,61,0.3)', color: '#FFB27A' }}>
          <Flame size={20} fill="currentColor" />
          <span style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: 800, letterSpacing: '0.04em' }}>HOT</span>
        </span>
        {events.map((e) => {
          const c = counts[e.slug];
          const d = parseDay(e.date);
          const stat = c && c.seen7d >= 30
            ? <><Eye size={10} strokeWidth={2.6} /> {compact(c.seen7d)}</>
            : c && c.going >= 10
              ? <><Users size={10} strokeWidth={2.6} /> {compact(c.going)}</>
              : <>{d ? shortDay(d).replace(/^\w+ /, '') : 'Soon'}</>;
          return (
            <Link key={e.slug} href={`/events/${e.slug}`} aria-label={e.title} style={{ flexShrink: 0, width: 62, textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <span style={{ position: 'relative', width: 58, height: 72, borderRadius: 17, padding: 2, background: ring, boxShadow: '0 4px 18px rgba(255,106,61,0.28)' }}>
                <span style={{ display: 'block', width: '100%', height: '100%', borderRadius: 15, overflow: 'hidden', background: '#111', border: '2px solid #050606' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {e.image && <img src={hiRes(e.image, 240) ?? e.image} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }} />}
                </span>
                <span style={{ position: 'absolute', left: '50%', bottom: -6, transform: 'translateX(-50%)', display: 'inline-flex', alignItems: 'center', gap: 3, height: 17, padding: '0 6px', borderRadius: 9, whiteSpace: 'nowrap', background: ring, color: '#1C0B03', fontFamily: FONT.sans, fontSize: 10, fontWeight: 800, boxShadow: '0 0 0 2px #050606' }}>
                  {stat}
                </span>
              </span>
              <span style={{ width: '100%', marginTop: 2, textAlign: 'center', fontFamily: FONT.sans, fontSize: 11, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortName(e.title)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** "Tidal Rave Festival 2026" → "Tidal Rave" */
function shortName(t: string) {
  const clean = t.replace(/\b(19|20)\d{2}\b/g, '').replace(/\b(festival|concert|live in [a-z]+|live)\b/gi, '').replace(/[|:–—-].*$/, '').replace(/\s+/g, ' ').trim();
  return clean || t;
}
