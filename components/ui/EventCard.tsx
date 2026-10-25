'use client';
import { C, G, R } from '@/lib/theme';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Calendar, Clock } from 'lucide-react';
import clsx from 'clsx';
import type { GhanaEvent } from '@/lib/types';
import { isListedEvent } from '@/lib/types';
import { formatDistance, cityLabel } from '@/lib/utils';
import { LineupChips } from '@/components/ui/LineupChips';

type Size = 'feature' | 'standard' | 'mini';

const mono = 'var(--font-inter), sans-serif';
const sans = 'var(--font-inter,sans-serif)';
const serif = 'var(--font-display), sans-serif';

/**
 * Event card — flat frosted glass.
 * Standard/mini: photo on top, glass body below.
 * Feature: full-bleed photo with a glass info panel floating over it.
 */
export default function EventCard({
  event, size = 'standard', distanceKm, className,
}: {
  event: GhanaEvent; size?: Size; distanceKm?: number; className?: string;
}) {
  const isOverlay = size === 'feature';
  const cta = event.price === 0 ? 'RSVP' : isListedEvent(event) ? 'Official tickets' : 'Get tickets';

  return (
    <Link
      href={`/events/${event.slug}`}
      className={clsx(
        'group relative block overflow-hidden',
        'transition-[transform,border-color] duration-300 ease-out hover:-translate-y-1',
        size === 'feature' && 'h-full min-h-[400px]',
        className,
      )}
      style={{ borderRadius: R.card, border: `1px solid ${C.bd}`, ...(isOverlay ? {} : G.panel), textDecoration: 'none', display: 'flex', flexDirection: 'column' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.goldBd; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.bd; }}
    >
      {/* Photo */}
      <div
        style={{
          position: isOverlay ? 'absolute' : 'relative',
          ...(isOverlay ? { inset: 0 } : {}),
          width: '100%',
          paddingTop: isOverlay ? 0 : size === 'mini' ? '62%' : '58%',
          overflow: 'hidden',
          background: C.bg3,
        }}
      >
        <Image
          src={event.image} alt={event.title}
          fill sizes="(max-width:640px) 50vw, 420px"
          style={{ objectFit: 'cover' }}
          className="transition-transform duration-700 group-hover:scale-[1.05]"
        />
        <div style={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ ...G.overlay, fontFamily: mono, fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', padding: '5px 10px', borderRadius: R.chip, color: C.cream, border: '1px solid rgba(255,255,255,0.16)' }}>
            {event.hot && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 6, background: C.gold, marginRight: 6, verticalAlign: 1 }} />}
            {event.badge}
          </span>
          {distanceKm !== undefined && (
            <span style={{ ...G.overlay, fontFamily: mono, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', padding: '5px 10px', borderRadius: R.chip, color: '#86efac', border: '1px solid rgba(74,222,128,0.35)' }}>
              {formatDistance(distanceKm)} away
            </span>
          )}
        </div>
      </div>

      {/* Body (glass) */}
      <div
        style={{
          ...(isOverlay
            ? { position: 'absolute', bottom: 10, left: 10, right: 10, zIndex: 2, ...G.panel, border: `1px solid ${C.bd2}`, borderRadius: R.card - 4 }
            : {}),
          padding: size === 'mini' ? '12px 14px 14px' : '16px 18px 18px',
          display: 'flex', flexDirection: 'column', flex: 1,
        }}
      >
        {!isOverlay && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, fontFamily: sans, fontSize: 11, color: C.c3, minWidth: 0 }}>
            <MapPin size={11} style={{ flexShrink: 0 }} />
            <span style={{ color: C.c2, fontWeight: 500, flexShrink: 0 }}>{cityLabel(event.city)}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}> · {event.venue}</span>
          </div>
        )}

        <h3 style={{ fontFamily: serif, fontSize: size === 'feature' ? 28 : size === 'mini' ? 16 : 21, fontWeight: 500, color: C.cream, lineHeight: 1.15, marginBottom: size === 'mini' ? 6 : 8, letterSpacing: '-0.2px' }}>
          {event.title}
        </h3>

        {size !== 'mini' && <LineupChips event={event} compact max={3} />}

        {size !== 'mini' && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontFamily: sans, fontSize: 11, color: C.c2, marginBottom: 14 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={12} />{event.dateLabel}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={12} />{event.time}</span>
            {isOverlay && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><MapPin size={12} />{event.venue}</span>}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto', paddingTop: size !== 'mini' ? 12 : 0, borderTop: size !== 'mini' ? `1px solid ${C.bd}` : 'none' }}>
          {event.price === 0
            ? <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: C.greenL, flex: 1 }}>Free</span>
            : <span style={{ fontFamily: mono, fontSize: size === 'mini' ? 14 : 17, color: C.cream, flex: 1, letterSpacing: '-0.5px' }}>
                <span style={{ fontSize: 11, color: C.goldText, marginRight: 2 }}>₵</span>{event.price}
              </span>
          }
          {size !== 'mini' && (
            <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 700, background: C.gold, color: C.onAccent, padding: '9px 14px', borderRadius: R.btn - 2, flexShrink: 0 }}>
              {cta}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
