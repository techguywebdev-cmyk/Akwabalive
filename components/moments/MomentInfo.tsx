'use client';

import { useState } from 'react';
import type { Moment } from './types';
import { C } from './types';
import PhotoStrip from './PhotoStrip';

interface MomentInfoProps {
  moment: Moment;
  photos: string[];
  onPhotoClick: (src: string) => void;
}

export default function MomentInfo({ moment, photos, onPhotoClick }: MomentInfoProps) {
  const [expanded, setExpanded] = useState(false);

  const desc = moment.description ?? '';
  const long = desc.length > 100;
  const shown = expanded || !long ? desc : desc.slice(0, 100) + '…';

  // Always have something to show
  const strip = photos.length > 0 ? photos : [];

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 68,
        zIndex: 10,
        padding: '28px 14px 18px',
        background:
          'linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)',
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
        style={{
          fontFamily: 'var(--font-cormorant,serif)',
          fontSize: 'clamp(20px,5vw,28px)',
          fontWeight: 400,
          color: '#FFFEF8',
          lineHeight: 1.15,
          marginBottom: 8,
          textShadow: '0 2px 12px rgba(0,0,0,0.95)',
          pointerEvents: 'auto',
        }}
      >
        {moment.title}
      </h2>

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

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          pointerEvents: 'auto',
        }}
      >
        {moment.year != null && (
          <span
            style={{
              fontFamily: 'var(--font-inter,sans-serif)',
              fontSize: 12,
              color: 'rgba(255,250,240,0.8)',
              textShadow: '0 1px 4px rgba(0,0,0,0.85)',
            }}
          >
            {moment.year}
          </span>
        )}
        {moment.duration_label && (
          <>
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>·</span>
            <span
              style={{
                fontFamily: 'var(--font-inter,sans-serif)',
                fontSize: 12,
                color: 'rgba(255,250,240,0.8)',
                textShadow: '0 1px 4px rgba(0,0,0,0.85)',
              }}
            >
              {moment.duration_label}
            </span>
          </>
        )}
        <span
          style={{
            fontFamily: 'var(--font-dm-mono,monospace)',
            fontSize: 8,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            padding: '3px 8px',
            borderRadius: 4,
            background: 'rgba(0,0,0,0.45)',
            color: 'rgba(255,250,240,0.85)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          HD
        </span>
      </div>

      {/* Photos — always visible */}
      {strip.length > 0 && (
        <div style={{ pointerEvents: 'auto' }}>
          <PhotoStrip photos={strip} onSelect={onPhotoClick} />
        </div>
      )}
    </div>
  );
}
