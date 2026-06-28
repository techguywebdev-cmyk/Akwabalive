'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Calendar, Clock } from 'lucide-react';
import clsx from 'clsx';
import { formatDistance, cityLabel } from '@/lib/utils';

type Size = 'feature' | 'standard' | 'mini';

const C = {
  bg2:     '#141109',
  bg3:     '#1C1710',
  gold:    '#C8922A',
  goldDim: 'rgba(200,146,42,0.14)',
  goldBd:  'rgba(200,146,42,0.28)',
  cream:   '#F5ECD7',
  c2:      'rgba(245,236,215,0.55)',
  c3:      'rgba(245,236,215,0.24)',
  c4:      'rgba(245,236,215,0.08)',
  bd:      'rgba(245,236,215,0.07)',
};

export default function EventCard({
  event, size = 'standard', distanceKm, className,
}: {
  event: GhanaEvent; size?: Size; distanceKm?: number; className?: string;
}) {
  const isOverlay = size === 'feature';

  return (
    <Link
      href={`/events/${event.slug}`}
      className={clsx(
        'group relative block overflow-hidden',
        'transition-all duration-300 ease-out hover:-translate-y-1',
        size === 'feature' && 'h-full min-h-[400px]',
        className,
      )}
      style={{ borderRadius: 14, border: `1px solid ${C.bd}`, background: C.bg2, textDecoration: 'none' }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = C.goldBd;
        e.currentTarget.style.boxShadow = `0 20px 48px rgba(0,0,0,0.55), 0 0 0 1px ${C.goldBd}`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = C.bd;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {event.hot && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${C.gold}, rgba(200,146,42,0.15))`, zIndex: 6 }} />
      )}

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
          style={{ objectFit: 'cover', filter: 'brightness(0.78) saturate(0.85)' }}
          className="transition-transform duration-700 group-hover:scale-[1.07] group-hover:brightness-[0.38]"
        />
        <div style={{ position: 'absolute', inset: 0, background: isOverlay ? `linear-gradient(to top, ${C.bg2} 0%, rgba(13,11,8,0.22) 55%, transparent 100%)` : `linear-gradient(to top, ${C.bg2} 0%, rgba(13,11,8,0.18) 50%, transparent 100%)` }} />
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 4, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '4px 9px', borderRadius: 3, background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBd}` }}>
            {event.badge}
          </span>
          {distanceKm !== undefined && (
            <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 9px', borderRadius: 3, background: 'rgba(45,106,79,0.2)', color: '#6ee7a0', border: '1px solid rgba(45,106,79,0.35)' }}>
              {formatDistance(distanceKm)} away
            </span>
          )}
        </div>
      </div>

      <div style={{ ...(isOverlay ? { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2 } : {}), padding: size === 'mini' ? '12px 14px 14px' : '16px 18px 18px' }}>
        {!isOverlay && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, fontFamily: 'var(--font-inter,sans-serif)', fontSize: 10, color: C.c3 }}>
            <MapPin size={9} style={{ opacity: 0.5, flexShrink: 0 }} />
            <span style={{ color: C.c2, fontWeight: 500 }}>{cityLabel(event.city)}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.c4 }}> · {event.venue}</span>
          </div>
        )}

        <h3
          className="group-hover:text-white"
          style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: size === 'feature' ? 26 : size === 'mini' ? 14 : 19, fontWeight: 400, color: C.cream, lineHeight: 1.18, marginBottom: size === 'mini' ? 6 : 8, letterSpacing: size === 'feature' ? '-0.5px' : '-0.2px', transition: 'color 0.2s' }}
        >
          {event.title}
        </h3>

        {size !== 'mini' && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontFamily: 'var(--font-inter,sans-serif)', fontSize: 9.5, color: C.c3, marginBottom: 14 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={10} />{event.dateLabel}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={10} />{event.time}</span>
            {isOverlay && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={10} />{event.venue}</span>}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: size !== 'mini' ? 12 : 0, borderTop: size !== 'mini' ? `1px solid ${C.bd}` : 'none', marginTop: size === 'mini' ? 4 : 0 }}>
          {event.price === 0
            ? <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 10, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#4ade80', flex: 1 }}>Free</span>
            : <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: size === 'mini' ? 13 : 16, color: C.cream, flex: 1, letterSpacing: '-0.5px' }}>
                <span style={{ fontSize: 10, color: C.gold, marginRight: 1 }}>₵</span>{event.price}
              </span>
          }
          {size !== 'mini' && (
            <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '2px', textTransform: 'uppercase', background: C.gold, color: '#000', padding: '9px 16px', borderRadius: 6, flexShrink: 0, fontWeight: 600 }}>
              Get Tickets
            </span>
          )}
        </div>
      </div>

      <div
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${C.gold}, rgba(200,146,42,0.1))`, zIndex: 5 }}
        className="origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
      />
    </Link>
  );
                     }
