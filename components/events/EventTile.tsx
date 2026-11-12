'use client';

import Link from 'next/link';
import { Mic2 } from 'lucide-react';
import type { GhanaEvent } from '@/lib/types';
import { T, FONT, GRAD } from '@/lib/thiscene';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const known = (v?: string | null) => (v && !/\b(tba|tbc|to be announced)\b/i.test(v) ? v : null);

/**
 * One show in the grid: the whole flyer (never cropped; any spare space is the flyer itself, blurred),
 * then a tear-off date beside the name and where/when.
 */
export default function EventTile({ event, performer }: { event: GhanaEvent; performer?: { name: string; slug: string } | null }) {
  const d = new Date(`${event.date}T12:00:00`);
  const month = MONTHS[d.getMonth()] ?? '';
  const day = d.getDate();
  const sub = [known(event.time), known(event.venue)].filter(Boolean).join(' · ');
  return (
    <Link href={`/events/${event.slug}`} className="ak-tile" style={{ display: 'block', minWidth: 0, textDecoration: 'none', color: T.text }}>
      <span style={{ position: 'relative', display: 'block', aspectRatio: '4 / 5', borderRadius: 18, overflow: 'hidden', background: '#0B1510', boxShadow: '0 14px 34px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.05)' }}>
        {event.image && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.image} alt="" aria-hidden loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(18px) brightness(0.5)', transform: 'scale(1.15)' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.image} alt={event.title} loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
          </>
        )}
      </span>
      {/* Tear-off date beside the name, so nothing sits on the flyer */}
      <span style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 10 }}>
        <span aria-hidden style={{ flexShrink: 0, width: 38, borderRadius: 10, overflow: 'hidden', textAlign: 'center', background: 'rgba(255,255,255,0.06)' }}>
          <span style={{ display: 'block', padding: '2px 0 1px', background: GRAD.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 9, fontWeight: 800, letterSpacing: '0.12em' }}>{month}</span>
          <span style={{ display: 'block', padding: '1px 0 3px', fontFamily: FONT.display, fontSize: 17, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.15, color: T.white }}>{day}</span>
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          {performer && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2, fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, color: T.mintText }}>
              <Mic2 size={12} strokeWidth={2.4} /> {performer.name}
            </span>
          )}
          <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontFamily: FONT.display, fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2, color: T.white }}>
            {event.title}
          </span>
          {sub && (
            <span style={{ display: 'block', marginTop: 3, fontFamily: FONT.sans, fontSize: 12.5, color: T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>
          )}
        </span>
      </span>
    </Link>
  );
}
