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

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 68,
        zIndex: 10,
        padding: '28px 14px 16px',
        /* Local scrim so text stays readable on any video frame */
        background:
          'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 55%, transparent 100%)',
        pointerEvents: 'none',
      }}
    >
      {/* Event name */}
      <p
        style={{
          fontFamily: 'var(--font-dm-mono,monospace)',
          fontSize: 10,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: C.gold,
          marginBottom: 6,
          textShadow: '0 1px 8px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.8)',
          pointerEvents: 'auto',
        }}
      >
        {moment.event_name}
      </p>

      {/* Title */}
      <h2
        style={{
          fontFamily: 'var(--font-cormorant,serif)',
          fontSize: 'clamp(20px,5vw,28px)',
          fontWeight: 400,
          color: '#FFFEF8',
          lineHeight: 1.15,
          marginBottom: 8,
          textShadow: '0 2px 12px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,0.9)',
          pointerEvents: 'auto',
        }}
      >
        {moment.title}
      </h2>

      {/* Description */}
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

      {/* Compact meta */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: photos.length ? 10 : 0,
          pointerEvents: 'auto',
        }}
      >
        {moment.year != null && (
          <span
            style={{
              fontFamily: 'var(--font-inter,sans-serif)',
              fontSize: 12,
              color: 'rgba(255,250,240,0.75)',
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
                color: 'rgba(255,250,240,0.75)',
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
            color: 'rgba(255,250,240,0.8)',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          HD
        </span>
      </div>

      {/* Photos always visible */}
      {photos.length > 0 && (
        <div style={{ pointerEvents: 'auto' }}>
          <PhotoStrip photos={photos} onSelect={onPhotoClick} />
        </div>
      )}
    </div>
  );
}      <p
        style={{
          fontFamily: 'var(--font-dm-mono,monospace)',
          fontSize: 10,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: C.gold,
          marginBottom: 6,
          textShadow: '0 1px 8px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.8)',
          pointerEvents: 'auto',
        }}
      >
        {moment.event_name}
      </p>

      {/* Title */}
      <h2
        style={{
          fontFamily: 'var(--font-cormorant,serif)',
          fontSize: 'clamp(20px,5vw,28px)',
          fontWeight: 400,
          color: '#FFFEF8',
          lineHeight: 1.15,
          marginBottom: 8,
          textShadow: '0 2px 12px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,0.9)',
          pointerEvents: 'auto',
        }}
      >
        {moment.title}
      </h2>

      {/* Description */}
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

      {/* Compact meta */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: photos.length ? 10 : 0,
          pointerEvents: 'auto',
        }}
      >
        {moment.year != null && (
          <span
            style={{
              fontFamily: 'var(--font-inter,sans-serif)',
              fontSize: 12,
              color: 'rgba(255,250,240,0.75)',
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
                color: 'rgba(255,250,240,0.75)',
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
            color: 'rgba(255,250,240,0.8)',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          HD
        </span>
      </div>

      {/* Photos always visible */}
      {photos.length > 0 && (
        <div style={{ pointerEvents: 'auto' }}>
          <PhotoStrip photos={photos} onSelect={onPhotoClick} />
        </div>
      )}
    </div>
  );
}        style={{
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
