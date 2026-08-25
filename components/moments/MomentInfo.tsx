'use client';

import Link from 'next/link';
import { Ticket } from 'lucide-react';
import type { Moment } from './types';
import { C } from './types';
import PhotoStrip from './PhotoStrip';

interface MomentInfoProps {
  moment: Moment;
  photos: string[];
  onPhotoClick: (src: string) => void;
  onShare?: () => void;
  venue?: string;
  dateLabel?: string;
  floating?: boolean;
}

export default function MomentInfo({ moment, photos, onPhotoClick, dateLabel, venue }: MomentInfoProps) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 72,
        zIndex: 10,
        padding: '0 18px 20px',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-dm-mono,monospace)',
          fontSize: 9,
          letterSpacing: '2.5px',
          textTransform: 'uppercase',
          color: C.gold,
          opacity: 0.85,
          marginBottom: 6,
        }}
      >
        {moment.event_name}
      </p>
      <h2
        style={{
          fontFamily: 'var(--font-cormorant,serif)',
          fontSize: 'clamp(20px,5vw,28px)',
          fontWeight: 300,
          color: C.cream,
          lineHeight: 1.1,
          marginBottom: 8,
        }}
      >
        {moment.title}
      </h2>
      {moment.description && (
        <p
          style={{
            fontFamily: 'var(--font-inter,sans-serif)',
            fontSize: 12,
            color: C.c2,
            lineHeight: 1.5,
            marginBottom: 10,
            maxWidth: 260,
          }}
        >
          {moment.description}
        </p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3 }}>
            📅 {dateLabel ?? moment.year}
          </span>
        {moment.duration_label && (
          <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3 }}>
            ⏱ {moment.duration_label}
          </span>
        )}
        <span
          style={{
            fontFamily: 'var(--font-dm-mono,monospace)',
            fontSize: 7.5,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            padding: '3px 8px',
            borderRadius: 4,
            background: C.glass,
            color: C.c3,
            border: `1px solid ${C.glassBd}`,
          }}
        >
          HD
        </span>
      </div>

      {venue && (
        <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
          📍 {venue}
        </p>
      )}
      <PhotoStrip photos={photos} onSelect={onPhotoClick} />

      {moment.event_slug && (
        <Link
          href={`/events/${moment.event_slug}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'var(--font-dm-mono,monospace)',
            fontSize: 8,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: '#0D0B08',
            background: C.gold,
            padding: '10px 18px',
            borderRadius: 22,
            textDecoration: 'none',
            fontWeight: 700,
            marginTop: 4,
          }}
        >
          <Ticket size={13} /> Get Tickets
        </Link>
      )}
    </div>
  );
}
