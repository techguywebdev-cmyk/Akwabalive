'use client';

import Link from 'next/link';
import { Flame, Mic2 } from 'lucide-react';
import type { GhanaEvent } from '@/lib/types';
import { T, FONT, GRAD } from '@/lib/thiscene';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const known = (v?: string | null) => (v && !/\b(tba|tbc|to be announced)\b/i.test(v) ? v : null);

function until(date: string): string {
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(`${date}T00:00:00`);
  const n = Math.round((b.getTime() - a.getTime()) / 86400000);
  if (n < 0) return 'Been';
  if (n === 0) return 'Tonight';
  if (n === 1) return 'Tomorrow';
  if (n < 7) return `In ${n} days`;
  if (n < 14) return 'Next week';
  if (n < 60) return `In ${Math.round(n / 7)} weeks`;
  return `In ${Math.round(n / 30)} months`;
}
const price = (e: GhanaEvent) => (e.priceUnknown ? null : e.price === 0 ? 'Free' : `GH₵${e.price.toLocaleString()}`);

/** The flyer, whole: any spare space is the flyer itself, blurred */
function Flyer({ e, radius }: { e: GhanaEvent; radius: number }) {
  return (
    <span className="ak-tile-flyer" style={{ position: 'relative', display: 'block', aspectRatio: '4 / 5', borderRadius: radius, overflow: 'hidden', background: '#0B1510', boxShadow: '0 18px 40px rgba(0,0,0,0.5)' }}>
      {e.image && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={e.image} alt="" aria-hidden loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(16px) brightness(0.55)', transform: 'scale(1.15)' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={e.image} alt={e.title} loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
        </>
      )}
    </span>
  );
}

/** The card's own light: its flyer, blurred and dimmed behind everything */
function Glow({ src }: { src?: string | null }) {
  return (
    <span aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 'inherit', pointerEvents: 'none' }}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" style={{ position: 'absolute', inset: '-20%', width: '140%', height: '140%', objectFit: 'cover', filter: 'blur(40px) saturate(1.5) brightness(0.55)', opacity: 0.85 }} />
      )}
      <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(6,10,8,0.15) 0%, rgba(6,10,8,0.55) 55%, rgba(6,10,8,0.88) 100%)' }} />
    </span>
  );
}

function Meta({ e, big }: { e: GhanaEvent; big?: boolean }) {
  const d = new Date(`${e.date}T12:00:00`);
  const p = price(e);
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontFamily: FONT.display, fontSize: big ? 12.5 : 11, fontWeight: 800, letterSpacing: '0.14em', color: T.mintText }}>
        {DAYS[d.getDay()]} {d.getDate()} {MONTHS[d.getMonth()]}
      </span>
      <span style={{ fontFamily: FONT.sans, fontSize: big ? 13 : 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{until(e.date)}</span>
      {big && p && <span style={{ fontFamily: FONT.sans, fontSize: 13, fontWeight: 700, color: p === 'Free' ? T.mintText : 'rgba(255,255,255,0.85)' }}>· {p}</span>}
    </span>
  );
}

/**
 * One show in the grid. `feature` makes it the big card that opens the grid:
 * flyer beside the details, with the line-up and a clear way in.
 */
export default function EventTile({ event: e, performer, feature = false }: { event: GhanaEvent; performer?: { name: string; slug: string } | null; feature?: boolean }) {
  const where = [known(e.venue), known(e.area)].filter(Boolean).join(', ');
  const time = known(e.time);
  const acts = (e.lineup ?? []).slice(0, 3).join(', ');
  const p = price(e);
  const day = new Date(`${e.date}T12:00:00`);

  if (feature) {
    return (
      <Link href={`/events/${e.slug}`} className="ak-tile" style={{ gridColumn: '1 / -1', position: 'relative', display: 'flex', gap: 'clamp(14px, 3vw, 28px)', alignItems: 'center', padding: 'clamp(10px, 2vw, 16px)', borderRadius: 28, textDecoration: 'none', isolation: 'isolate', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}>
        <Glow src={e.image} />
        <span style={{ position: 'relative', flex: '0 0 clamp(128px, 38%, 320px)' }}><Flyer e={e} radius={18} /></span>
        <span style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1.2vw, 10px)' }}>
          {e.hot && (
            <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5, height: 24, padding: '0 10px', borderRadius: 999, background: GRAD.mint, color: T.onMint, fontFamily: FONT.sans, fontSize: 11.5, fontWeight: 800 }}>
              <Flame size={12} strokeWidth={2.6} /> Up next
            </span>
          )}
          <Meta e={e} big />
          <span style={{ fontFamily: FONT.display, fontSize: 'clamp(24px, 5.4vw, 46px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.02, color: T.white, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{e.title}</span>
          {(time || where) && <span style={{ fontFamily: FONT.sans, fontSize: 'clamp(13px, 1.6vw, 15px)', color: 'rgba(255,255,255,0.7)' }}>{[time, where].filter(Boolean).join(' · ')}</span>}
          {acts && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT.sans, fontSize: 'clamp(12.5px, 1.5vw, 14px)', fontWeight: 600, color: T.white }}>
              <Mic2 size={14} strokeWidth={2.3} color={T.mintText} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acts}</span>
            </span>
          )}
          <span className="ak-hide-phone" style={{ alignSelf: 'flex-start', marginTop: 'clamp(2px, 1vw, 8px)', display: 'inline-flex', alignItems: 'center', height: 'clamp(36px, 4.4vw, 44px)', padding: '0 clamp(14px, 2vw, 20px)', borderRadius: 999, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', color: T.white, fontFamily: FONT.sans, fontSize: 'clamp(13px, 1.5vw, 14.5px)', fontWeight: 700 }}>
            See the show
          </span>
        </span>
      </Link>
    );
  }

  // A grid square: the flyer, whole, floating in its own light (the flyer blurred fills the square),
  // then a clear order underneath: the name first, then one quiet line for when.
  return (
    <Link href={`/events/${e.slug}`} className="ak-tile ak-box" style={{ display: 'block', minWidth: 0, textDecoration: 'none', color: T.text }}>
      <span style={{ position: 'relative', display: 'block', aspectRatio: '1 / 1', borderRadius: 20, overflow: 'hidden', isolation: 'isolate', background: '#0B1510', boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 14px 32px rgba(0,0,0,0.45)' }}>
        {e.image && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={e.image} alt="" aria-hidden loading="lazy" style={{ position: 'absolute', zIndex: -1, inset: '-10%', width: '120%', height: '120%', objectFit: 'cover', filter: 'blur(22px) saturate(1.5) brightness(0.6)' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="ak-tile-flyer" src={e.image} alt={e.title} loading="lazy" style={{ position: 'absolute', inset: '5%', width: '90%', height: '90%', objectFit: 'contain', filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.5))' }} />
          </>
        )}
      </span>
      <span style={{ display: 'block', padding: '10px 2px 0' }}>
        <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontFamily: FONT.display, fontSize: 15.5, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.18, color: T.white }}>{e.title}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, fontFamily: FONT.sans, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden' }}>
          {e.hot && <Flame size={11} strokeWidth={2.8} color={T.mintText} aria-label="Hot" style={{ flexShrink: 0 }} />}
          <span style={{ fontWeight: 700, color: T.mintText }}>{DAYS[day.getDay()].charAt(0)}{DAYS[day.getDay()].slice(1).toLowerCase()} {day.getDate()} {MONTHS[day.getMonth()].charAt(0)}{MONTHS[day.getMonth()].slice(1).toLowerCase()}</span>
          <span aria-hidden style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
          <span style={{ color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{performer ? performer.name : until(e.date)}</span>
        </span>
      </span>
    </Link>
  );
}
