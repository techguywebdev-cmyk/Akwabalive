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

  // Auto-float when there is no photo strip (chapters mode)
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
        backgroundImage: 'none',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        boxShadow: 'none',
        border: 'none',
        borderRadius: 0,
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
          fontFamily: 'var(--font-cormorant,serif)',
          fontSize: 'clamp(20px,5vw,28px)',
          fontWeight: 400,
          color: '#FFFEF8',
          lineHeight: 1.15,
          marginBottom: 6,
          textShadow,
          pointerEvents: 'auto',
          cursor: onShare ? 'pointer' : 'default',
          background: 'transparent',
        }}
      >
        {moment.title}
      </h2>

      {meta && (
        <p
          style={{
            fontFamily: 'var(--font-inter,sans-serif)',
            fontSize: 12,
            color: 'rgba(255,250,240,0.85)',
            marginBottom: 8,
            textShadow,
            pointerEvents: 'auto',
            background: 'transparent',
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
            color: 'rgba(255,250,240,0.95)',
            lineHeight: 1.5,
            marginBottom: isFloating ? 0 : 10,
            maxWidth: 280,
            cursor: long ? 'pointer' : 'default',
            textShadow,
            pointerEvents: 'auto',
            background: 'transparent',
          }}
        >
          {shown}
          {long && !expanded && (
            <span style={{ color: C.gold, marginLeft: 4 }}>more</span>
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
