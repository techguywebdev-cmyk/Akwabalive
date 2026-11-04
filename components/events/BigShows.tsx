'use client';

import Link from 'next/link';
import { ChevronDown, Flame } from 'lucide-react';
import type { GhanaEvent } from '@/lib/types';
import { parseDay, shortDay } from '@/lib/dates';
import { hiRes } from '@/lib/events/image';
import { hypeTags } from '@/lib/events/hype';
import { T, FONT } from '@/lib/thiscene';

/**
 * The feed's first screen: the season's biggest shows as a photo grid, so nobody has to swipe
 * through everything to find them. Swipe (or tap the arrow) for the full feed.
 */
export default function BigShows({ events, topInset, onMore }: { events: GhanaEvent[]; topInset: number; onMore: () => void }) {
  const list = events.slice(0, events.length >= 6 ? 6 : 4); // always full rows
  return (
    <section aria-label="Big shows" style={{ position: 'relative', width: '100%', height: '100%', scrollSnapAlign: 'start', scrollSnapStop: 'always', display: 'flex', flexDirection: 'column', padding: `calc(${topInset + 6}px + env(safe-area-inset-top, 0px)) 16px calc(18px + env(safe-area-inset-bottom, 0px))`, boxSizing: 'border-box', background: 'radial-gradient(80% 35% at 50% 0%, rgba(255,106,61,0.14) 0%, rgba(0,0,0,0) 70%), #050606' }}>
      <header style={{ padding: '0 4px 12px' }}>
        <p style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#FFB27A' }}><Flame size={13} fill="currentColor" /> Big shows</p>
        <h2 style={{ margin: '4px 0 0', fontFamily: FONT.display, fontSize: 25, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.1, color: T.white }}>The nights everyone’s talking about</h2>
      </header>
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridAutoRows: '1fr', gap: 10 }}>
        {list.map((e) => {
          const d = parseDay(e.date);
          const tag = hypeTags(e, { max: 1 })[0];
          return (
            <Link key={e.slug} href={`/events/${e.slug}`} style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, background: 'rgba(255,255,255,0.05)', textDecoration: 'none', minHeight: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {e.image && <img src={hiRes(e.image, 700) ?? e.image} alt="" loading="eager" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />}
              <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.82) 100%)' }} />
              {tag && (
                <span style={{ position: 'absolute', top: 8, left: 8, padding: '3px 8px', borderRadius: 999, fontFamily: FONT.sans, fontSize: 11, fontWeight: 700, maxWidth: 'calc(100% - 16px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  ...(tag.kind === 'hot' || tag.kind === 'fast' || tag.kind === 'last' ? { background: 'linear-gradient(100deg, #FF6A3D, #FFA53D)', color: '#1C0B03' } : { background: 'rgba(255,255,255,0.92)', color: '#0B0F0D' }) }}>{tag.text}</span>
              )}
              <span style={{ position: 'absolute', left: 10, right: 10, bottom: 9 }}>
                <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 11.5, fontWeight: 600, color: T.mintText }}>{d ? shortDay(d) : e.dateLabel}</span>
                <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontFamily: FONT.display, fontSize: 15, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.01em', color: T.white }}>{e.title}</span>
              </span>
            </Link>
          );
        })}
      </div>
      <button type="button" onClick={onMore} style={{ alignSelf: 'center', marginTop: 12, height: 40, padding: '0 16px', border: 'none', borderRadius: 999, background: 'rgba(255,255,255,0.08)', color: T.text, fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        All events <ChevronDown size={16} />
      </button>
    </section>
  );
}
