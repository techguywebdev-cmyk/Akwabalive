'use client';

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { T, TYPE, RADIUS, BLUR, DEFAULT_ACCENT, alpha, glass } from '@/lib/thiscene';

/**
 * GlassPill — every button, chip and meta capsule (Thiscene).
 *  - primary:   accent ~18% fill, accent ~60% border, white label. One per row.
 *  - secondary: glass fill, hairline-strong border, white label.
 *  - chip:      34px; selected = accent ~20% fill with an inset accent ring.
 *  - round:     44–48px icon button for the card's action rail.
 * Never a solid fill. Place pills side by side (gap 8), never full-width stacks.
 */
type Variant = 'primary' | 'secondary' | 'chip' | 'round';

export function pillStyle(variant: Variant, accent: string = DEFAULT_ACCENT, opts: { selected?: boolean; active?: boolean; size?: number; compact?: boolean } = {}): CSSProperties {
  const base: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexShrink: 0,
    borderRadius: RADIUS.pill, cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap',
    backdropFilter: BLUR, WebkitBackdropFilter: BLUR, transition: 'background 200ms ease, border-color 200ms ease, color 200ms ease',
  };
  switch (variant) {
    case 'primary':
      return { ...base, ...TYPE.pill, height: 46, padding: opts.compact ? '0 20px' : '0 26px', color: T.white, background: alpha(accent, 0.18), border: `1px solid ${alpha(accent, 0.6)}` };
    case 'secondary':
      return { ...base, ...TYPE.pill, height: 46, padding: opts.compact ? '0 20px' : '0 26px', color: T.white, ...glass(), backdropFilter: BLUR };
    case 'chip':
      return opts.selected
        ? { ...base, fontFamily: TYPE.pill.fontFamily, fontSize: 12.5, fontWeight: 700, height: 34, padding: '0 13px', color: T.white, background: alpha(accent, 0.2), border: '1px solid transparent', boxShadow: `inset 0 0 0 1px ${alpha(accent, 0.53)}` }
        : { ...base, fontFamily: TYPE.pill.fontFamily, fontSize: 12.5, fontWeight: 700, height: 34, padding: '0 13px', color: 'rgba(255,255,255,0.8)', background: T.surface, border: `1px solid ${T.hairlineStrong}` };
    case 'round': {
      const s = opts.size ?? 46;
      return {
        ...base, width: s, height: s, padding: 0, color: opts.active ? accent : T.white,
        ...(opts.active
          ? { background: alpha(accent, 0.18), border: `1px solid ${alpha(accent, 0.6)}` }
          : { background: T.glass, border: `1px solid ${T.hairlineStrong}` }),
        backdropFilter: BLUR,
      };
    }
  }
}

export default function GlassPill({
  variant = 'secondary', accent, selected, active, size, compact, href, external, onClick, label, children, style, disabled, type = 'button',
}: {
  variant?: Variant;
  accent?: string;
  selected?: boolean;
  active?: boolean;
  size?: number;
  compact?: boolean;
  href?: string;
  external?: boolean;
  onClick?: () => void;
  /** Accessible name; required for round icon buttons */
  label?: string;
  children?: ReactNode;
  style?: CSSProperties;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const s = { ...pillStyle(variant, accent, { selected, active, size, compact }), ...(disabled ? { opacity: 0.5, cursor: 'default' } : {}), ...style };
  const aria = { 'aria-label': label, title: variant === 'round' ? label : undefined };
  if (href && external) return <a href={href} target="_blank" rel="noopener noreferrer" style={s} {...aria}>{children}</a>;
  if (href) return <Link href={href} style={s} {...aria}>{children}</Link>;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={variant === 'chip' ? !!selected : variant === 'round' && active !== undefined ? active : undefined}
      style={s}
      {...aria}
    >
      {children}
    </button>
  );
}

/** Glass meta capsule (card header row). */
export function Capsule({ children, accent, accentBorder = false }: { children: ReactNode; accent?: string; accentBorder?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
        background: T.glass, backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
        border: `1px solid ${accentBorder && accent ? alpha(accent, 0.19) : T.hairlineStrong}`,
        borderRadius: RADIUS.pill, padding: '5px 12px',
        fontFamily: TYPE.pill.fontFamily, fontSize: 11, fontWeight: 600, color: T.text,
      }}
    >
      {children}
    </span>
  );
}
