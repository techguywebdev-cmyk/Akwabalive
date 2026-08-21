'use client';

import { useState } from 'react';
import { ChevronUp } from 'lucide-react';
import type { Moment } from './types';
import { C } from './types';
import PhotoStrip from './PhotoStrip';

interface MomentInfoProps {
  moment: Moment;
  photos: string[];
  onPhotoClick: (src: string) => void;
}

export default function MomentInfo({ moment, photos, onPhotoClick }: MomentInfoProps) {
  const [showPhotos, setShowPhotos] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const desc = moment.description ?? '';
  const long = desc.length > 90;
  const shown = expanded || !long ? desc : desc.slice(0, 90) + '…';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 68,
        zIndex: 10,
        padding: '0 14px 14px',
        pointerEvents: 'none',
      }}
    >
      {/* Event name */}
      <p
        style={{
          fontFamily: 'var(--font-dm-mono,monospace)',
          fontSize: 9,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: C.gold,
          opacity: 0.9,
          marginBottom: 4,
          pointerEvents: 'auto',
        }}
      >
        {moment.event_name}
      </p>

      {/* Title */}
      <h2
        style={{
          fontFamily: 'var(--font-cormorant,serif)',
          fontSize: 'clamp(18px,4.8vw,26px)',
          fontWeight: 300,
          color: C.cream,
          lineHeight: 1.15,
          marginBottom: 6,
          pointerEvents: 'auto',
        }}
      >
        {moment.title}
      </h2>

      {/* Description (tap to expand) */}
      {desc && (
        <p
          onClick={() => long && setExpanded((v) => !v)}
          style={{
            fontFamily: 'var(--font-inter,sans-serif)',
            fontSize: 12,
            color: C.c2,
            lineHeight: 1.45,
            marginBottom: 8,
            maxWidth: 250,
            cursor: long ? 'pointer' : 'default',
            pointerEvents: 'auto',
          }}
        >
          {shown}
        </p>
      )}

      {/* Compact meta row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: photos.length ? 8 : 0,
          pointerEvents: 'auto',
        }}
      >
        {moment.year != null && (
          <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3 }}>
            {moment.year}
          </span>
        )}
        {moment.duration_label && (
          <>
            <span style={{ color: C.c3, opacity: 0.4 }}>·</span>
            <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3 }}>
              {moment.duration_label}
            </span>
          </>
        )}
        <span
          style={{
            fontFamily: 'var(--font-dm-mono,monospace)',
            fontSize: 7,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            padding: '2px 7px',
            borderRadius: 4,
            background: 'rgba(255,255,255,0.08)',
            color: C.c3,
            border: `1px solid ${C.glassBd}`,
          }}
        >
          HD
        </span>
      </div>

      {/* Photos — collapsed by default */}
      {photos.length > 0 && (
        <div style={{ pointerEvents: 'auto' }}>
          <button
            onClick={() => setShowPhotos((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              padding: '4px 0',
              cursor: 'pointer',
              color: C.c3,
              fontFamily: 'var(--font-dm-mono,monospace)',
              fontSize: 8,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
            }}
          >
            <ChevronUp
              size={12}
              style={{
                transform: showPhotos ? 'rotate(0deg)' : 'rotate(180deg)',
                transition: 'transform 200ms',
              }}
            />
            {showPhotos ? 'Hide photos' : `${photos.length} photos`}
          </button>
          {showPhotos && (
            <div style={{ marginTop: 6 }}>
              <PhotoStrip photos={photos} onSelect={onPhotoClick} />
            </div>
          )}
        </div>
      )}
    </div>
  );
        }
