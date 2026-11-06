'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame, Eye, Users } from 'lucide-react';
import type { GhanaEvent } from '@/lib/types';
import { parseDay, shortDay } from '@/lib/dates';
import { hiRes } from '@/lib/events/image';
import { eventCounts, trackEvent, compact, type EventCounts } from '@/lib/events/track';
import { T, FONT, GRAD } from '@/lib/thiscene';

export const HOT_RAIL_H = 100;

/** Mint ring, the app's own accent */
const ring = `linear-gradient(140deg, ${T.mint} 0%, #3FBF86 100%)`;

/**
 * The Hot rail: the shows everyone's after, in a slim row under the header on the events feed and list.
 * It sits on the page ground (the feed starts below it), so it never covers a flyer. Shows real numbers
 * (people who saw it this week, people going) once they're worth showing; otherwise the date.
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
    <nav aria-label="Hot right now" style={{ position: 'fixed', zIndex: 190, left: 0, right: 0, top: `calc(${top}px + env(safe-area-inset-top, 0px))`, height: HOT_RAIL_H, background: T.bg, borderBottom: `1px solid ${T.hairline}` }}>
      <div className="no-scrollbar" style={{ display: 'flex', alignItems: 'flex-start', gap: 14, overflowX: 'auto', padding: '6px 16px 0', maxWidth: 960, margin: '0 auto' }}>
        <span style={{ flexShrink: 0, alignSelf: 'center', marginTop: -14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: T.mintText }}>
          <Flame size={18} />
          <span style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em' }}>HOT</span>
        </span>
        {events.map((e) => {
          const c = counts[e.slug];
          const d = parseDay(e.date);
          const stat = c && c.seen7d >= 30 ? <><Eye size={10} strokeWidth={2.6} /> {compact(c.seen7d)}</>
            : c && c.going >= 10 ? <><Users size={10} strokeWidth={2.6} /> {compact(c.going)}</>
              : null;
          const when = d ? shortDay(d).replace(/^\w+ /, '') : 'Soon';
          return (
            <Link key={e.slug} href={`/events/${e.slug}`} aria-label={e.title} style={{ flexShrink: 0, width: 58, textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span style={{ position: 'relative', width: 54, height: 68, borderRadius: 16, padding: 2, background: ring }}>
                <span style={{ display: 'block', width: '100%', height: '100%', borderRadius: 14, overflow: 'hidden', background: '#111', border: `2px solid ${T.bg}` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {e.image && <img src={hiRes(e.image, 200) ?? e.image} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%', display: 'block' }} />}
                </span>
                <span style={{ position: 'absolute', left: '50%', bottom: -5, transform: 'translateX(-50%)', display: 'inline-flex', alignItems: 'center', gap: 3, height: 16, padding: '0 6px', borderRadius: 8, whiteSpace: 'nowrap', fontFamily: FONT.sans, fontSize: 9.5, fontWeight: 800, boxShadow: `0 0 0 2px ${T.bg}`,
                  ...(stat ? { background: GRAD.mint, color: T.onMint } : { background: '#1A1F1D', color: T.text }) }}>{stat ?? when}</span>
              </span>
              <span style={{ width: '100%', textAlign: 'center', fontFamily: FONT.sans, fontSize: 10.5, fontWeight: 600, lineHeight: 1.2, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortName(e.title)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** "Tidal Rave Festival 2026" → "Tidal Rave" */
function shortName(t: string) {
  const clean = t.replace(/\b(19|20)\d{2}\b/g, '').replace(/\b(festival|concert|live in [a-z]+|live|memorial)\b/gi, '').replace(/[|:–—-].*$/, '').replace(/\s+/g, ' ').trim();
  return clean || t;
}
