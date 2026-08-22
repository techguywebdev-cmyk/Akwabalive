'use client';

import { useState } from 'react';
import type { Moment } from './types';
import { C } from './types';
import PhotoStrip from './PhotoStrip';

interface MomentInfoProps {
  moment: Moment;
  photos: string[];
  onPhotoClick: (src: string) => void;
  onShare?: () => void;
  venue?: string | null;
  dateLabel?: string | null;
}

export default function MomentInfo({
  moment,
  photos,
  onPhotoClick,
  onShare,
  venue,
  dateLabel,
}: MomentInfoProps) {
  const [expanded, setExpanded] = useState(false);

  const desc = moment.description ?? '';
  const long = desc.length > 90;
  const shown = expanded || !long ? desc : desc.slice(0, 90) + '…';
  const strip = photos.length > 0 ? photos : [];
  const meta = [dateLabel, venue].filter(Boolean).join(' · ');

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 68,
        zIndex: 10,
        padding: '20px 14px calc(12px + env(safe-area-inset-bottom))',
        background:
          'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.28) 65%, transparent 100%)',
        pointerEvents: 'none',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-dm-mono,monospace)',
          fontSize: 10,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: C.gold,
          marginBottom: 6,
          textShadow: '0 1px 8px rgba(0,0,0,0.9)',
          pointerEvents: 'auto',
        }}
      >
        {moment.event_name}
      </p>

      <h2
        onClick={onShare}
        title="Tap to share"
        style={{
          fontFamily: 'var(--font-cormorant,serif)',
          fontSize: 'clamp(20px,5vw,28px)',
          fontWeight: 400,
          color: '#FFFEF8',
          lineHeight: 1.15,
          marginBottom: 6,
          textShadow: '0 2px 12px rgba(0,0,0,0.95)',
          pointerEvents: 'auto',
          cursor: onShare ? 'pointer' : 'default',
        }}
      >
        {moment.title}
      </h2>

      {meta && (
        <p
          style={{
            fontFamily: 'var(--font-inter,sans-serif)',
            fontSize: 12,
            color: 'rgba(255,250,240,0.78)',
            marginBottom: 8,
            textShadow: '0 1px 4px rgba(0,0,0,0.85)',
            pointerEvents: 'auto',
          }}
        >
          {meta}
        </p>
      )}

      {desc && (
        <p
          onClick={() => long && setExpanded((v) => !v)}
          style={{
            fontFamily: 'var(--font-inter,sans-serif)',
            fontSize: 13,
            color: 'rgba(255,250,240,0.92)',
            lineHeight: 1.5,
            marginBottom: 10,
            maxWidth: 260,
            cursor: long ? 'pointer' : 'default',
            textShadow: '0 1px 6px rgba(0,0,0,0.9)',
            pointerEvents: 'auto',
          }}
        >
          {shown}
          {long && !expanded && (
            <span style={{ color: C.gold, marginLeft: 4 }}>more</span>
          )}
        </p>
      )}

      {strip.length > 0 && (
        <div style={{ pointerEvents: 'auto' }}>
          <PhotoStrip photos={strip} onSelect={onPhotoClick} />
        </div>
      )}
    </div>
  );
}
