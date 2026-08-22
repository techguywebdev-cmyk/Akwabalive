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
  floating?: boolean;
}

export default function MomentInfo({
  moment,
  photos,
  onPhotoClick,
  onShare,
  venue,
  dateLabel,
  floating = false,
}: MomentInfoProps) {
  const [expanded, setExpanded] = useState(false);

  const desc = moment.description ?? '';
  const long = desc.length > 90;
  const shown = expanded || !long ? desc : desc.slice(0, 90) + '…';
  const strip = photos.length > 0 ? photos : [];
  const meta = [dateLabel, venue].filter(Boolean).join(' · ');

  const isFloating = floating || strip.length === 0;

  const textShadow = isFloating
    ? '0 1px 3px rgba(0,0,0,0.9), 0 2px 14px rgba(0,0,0,0.55)'
    : '0 1px 6px rgba(0,0,0,0.85)';

  return (
    <div
      style={{
        position: isFloating ? 'relative' : 'absolute',
        bottom: isFloating ? undefined : 0,
        left: isFloating ? undefined : 0,
        right: isFloating ? undefined : 68,
        zIndex: 10,
        padding: isFloating
          ? '4px 14px 0'
          : '20px 14px calc(12px + env(safe-area-inset-bottom))',
        background: 'transparent',
        pointerEvents: 'none',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-dm-mono), monospace',
          fontSize: 8,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: C.gold,
          marginBottom: 8,
          textShadow,
          pointerEvents: 'auto',
        }}
      >
        {moment.event_name}
      </p>

      <h2
        onClick={onShare}
        title="Tap to share"
        style={{
          fontFamily: 'var(--font-cormorant), serif',
          fontSize: 'clamp(24px,5vw,32px)',
          fontWeight: 300,
          letterSpacing: '-0.5px',
          color: '#F5ECD7',
          lineHeight: 1.1,
          marginBottom: 6,
          textShadow,
          pointerEvents: 'auto',
          cursor: onShare ? 'pointer' : 'default',
        }}
      >
        {moment.title}
      </h2>

      {meta && (
        <p
          style={{
            fontFamily: 'var(--font-dm-mono), monospace',
            fontSize: 9,
            color: 'rgba(245,236,215,0.4)',
            marginBottom: 8,
            textShadow,
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
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 13,
            fontWeight: 300,
            color: 'rgba(245,236,215,0.85)',
            lineHeight: 1.65,
            marginBottom: isFloating ? 0 : 10,
            maxWidth: 280,
            cursor: long ? 'pointer' : 'default',
            textShadow,
            pointerEvents: 'auto',
          }}
        >
          {shown}
          {long && !expanded && (
            <span
              style={{
                color: C.gold,
                marginLeft: 4,
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: 8,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                fontWeight: 500,
              }}
            >
              more
            </span>
          )}
        </p>
      )}

      {strip.length > 0 && (
        <div style={{ pointerEvents: 'auto', marginTop: 10 }}>
          <PhotoStrip photos={strip} onSelect={onPhotoClick} />
        </div>
      )}
    </div>
  );
}
