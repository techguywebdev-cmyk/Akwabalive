'use client';

import { Star } from 'lucide-react';
import { T, FONT } from '@/lib/thiscene';

const GOLD = '#F5C451';

/** Read-only stars (supports halves by clipping) */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span role="img" aria-label={`${value.toFixed(1)} out of 5`} style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return (
          <span key={i} style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}>
            <Star size={size} color="rgba(255,255,255,0.22)" fill="rgba(255,255,255,0.12)" style={{ position: 'absolute', inset: 0 }} />
            <span style={{ position: 'absolute', inset: 0, width: `${fill * 100}%`, overflow: 'hidden' }}>
              <Star size={size} color={GOLD} fill={GOLD} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** Tap-to-set stars */
export function StarInput({ value, onChange, size = 34, label }: { value: number; onChange: (v: number) => void; size?: number; label: string }) {
  return (
    <span role="radiogroup" aria-label={label} style={{ display: 'inline-flex', gap: size > 24 ? 8 : 4 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} star${i > 1 ? 's' : ''}`} onClick={() => onChange(value === i && size <= 24 ? 0 : i)}
          style={{ padding: 2, border: 'none', background: 'none', cursor: 'pointer', lineHeight: 0, transform: value >= i ? 'scale(1.05)' : 'none', transition: 'transform 120ms ease' }}>
          <Star size={size} color={value >= i ? GOLD : 'rgba(255,255,255,0.3)'} fill={value >= i ? GOLD : 'transparent'} strokeWidth={1.6} />
        </button>
      ))}
    </span>
  );
}

/** "★ 4.6" chip for lists */
export function ScoreChip({ score, count }: { score: number; count?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: FONT.sans, fontSize: 13, fontWeight: 700, color: T.white }}>
      <Star size={13} color={GOLD} fill={GOLD} />{score.toFixed(1)}
      {count != null && <span style={{ fontWeight: 500, color: T.text3 }}>({count})</span>}
    </span>
  );
}
