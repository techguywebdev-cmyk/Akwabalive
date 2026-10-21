'use client';

import { useState, type CSSProperties } from 'react';
import { Icon, CATEGORY_ICONS } from '@/components/ui/Icon';
import { alpha } from '@/lib/thiscene';

/**
 * Shows a flyer whole, whatever its shape. The same image, blurred and darkened, fills
 * the space behind; the flyer itself is fitted (never cropped) inside `area`, so a tall
 * story poster, a square post and a wide banner each get their own canvas and every
 * detail printed on them stays readable.
 *
 * Fills its positioned parent. `area` is the box the poster may use (CSS insets).
 */
export default function FlyerCanvas({
  src, area, accent = '#7BE3A8', category, dim = false, radius = 18, align = 'center',
}: {
  src?: string | null;
  area: { top: number | string; bottom: number | string; left: number | string; right: number | string };
  accent?: string;
  category?: string;
  /** Fade the poster a little (inactive feed cards) */
  dim?: boolean;
  radius?: number;
  /** Where the poster sits vertically inside the area */
  align?: 'center' | 'start' | 'end';
}) {
  const [failed, setFailed] = useState(false);
  const fill: CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none' };

  if (!src || failed) {
    return (
      <div aria-hidden style={{ ...fill, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(70% 45% at 50% 35%, ${alpha(accent, 0.22)} 0%, rgba(3,8,6,0) 70%)` }}>
        <span style={{ marginTop: '-25%', color: alpha(accent, 0.5) }}>
          <Icon name={(category && CATEGORY_ICONS[category]) || 'sparkle'} size={120} strokeWidth={1} />
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop: the flyer itself, blurred, so the canvas takes the poster's colours */}
      <div aria-hidden style={{ ...fill, overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          style={{ position: 'absolute', inset: '-8%', width: '116%', height: '116%', objectFit: 'cover', filter: 'blur(38px) saturate(1.25) brightness(0.5)' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(3,8,6,0.35) 0%, rgba(3,8,6,0.15) 40%, rgba(3,8,6,0.75) 100%)' }} />
      </div>

      {/* The flyer, fitted whole */}
      <div style={{ position: 'absolute', ...area, display: 'flex', alignItems: align === 'start' ? 'flex-start' : align === 'end' ? 'flex-end' : 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          onError={() => setFailed(true)}
          style={{
            display: 'block', maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain',
            borderRadius: radius, boxShadow: '0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)',
            opacity: dim ? 0.7 : 1, transition: 'opacity 0.5s ease',
          }}
        />
      </div>
    </>
  );
}
