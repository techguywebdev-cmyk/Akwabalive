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
  /** No dark panel behind text — clean text-shadow only */
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

  return (
    <div
      style={{
        position: floating ? 'relative' : 'absolute',
        bottom: floating ? undefined : 0,
        left: floating ? undefined : 0,
        right: floating ? undefined : 68,
        zIndex: 10,
        padding: floating
          ? '8px 14px 4px'
          : '20px 14px calc(12px + env(safe-area-inset-bottom))',
        background: floating
          ? 'transparent'
          : 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.28) 65%, transparent 100%)',
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
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
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
          textShadow: '0 2px 8px rgba(0,0,0,0.75)',
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
            textShadow: '0 1px 4px rgba(0,0,0,0.7)',
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
            maxWidth: 280,
            cursor: long ? 'pointer' : 'default',
            textShadow: '0 1px 5px rgba(0,0,0,0.75)',
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
