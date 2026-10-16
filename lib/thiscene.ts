/**
 * Thiscene design system — the basis for Akwaaba's event surfaces.
 * Source: the "Thiscene" Design System artifact (tokens.json + component docs).
 *
 * Core idea: the content colours the room. Every event carries an accent and the
 * whole screen takes it as a soft ambient gradient over a near-black ground.
 */
import type { CSSProperties } from 'react';

export const T = {
  bg: '#06060B',
  surface: 'rgba(255,255,255,0.05)',
  surface2: 'rgba(255,255,255,0.025)',
  glass: 'rgba(0,0,0,0.4)',
  glassStrong: 'rgba(0,0,0,0.55)',
  hairline: 'rgba(255,255,255,0.06)',
  hairlineStrong: 'rgba(255,255,255,0.14)',
  text: 'rgba(255,255,255,0.92)',
  text2: 'rgba(255,255,255,0.55)',
  text3: 'rgba(255,255,255,0.35)',
  white: '#ffffff',
  success: '#7BFF9E',
  danger: '#FF8A8A',
} as const;

/** Accent palette (tokens accent-*). Gold is the default. */
export const ACCENTS = {
  gold: '#F5A623',
  indigo: '#818CF8',
  teal: '#2DD4BF',
  rose: '#FF6B8A',
  lime: '#A3E635',
  violet: '#B07FEF',
  sky: '#38BDF8',
  ember: '#FF7A2F',
  emerald: '#34D399',
  noir: '#E6E6EA',
} as const;
export type AccentHex = string;
export const DEFAULT_ACCENT: AccentHex = ACCENTS.gold;

export const FONT = {
  display: 'var(--font-display), "Inter Tight", system-ui, -apple-system, sans-serif',
  sans: 'var(--font-inter), Inter, system-ui, -apple-system, sans-serif',
} as const;

export const RADIUS = { tag: 4, tile: 16, card: 24, sheet: 22, pill: 999 } as const;
export const SPACE = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24 } as const;
export const BLUR = 'blur(16px)';
export const EASE = {
  sheet: 'cubic-bezier(0.22,1,0.36,1)',
  toggle: 'cubic-bezier(.3,.7,.3,1)',
} as const;

/** Type styles from tokens.json */
export const TYPE = {
  cardTitle: { fontFamily: FONT.display, fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.02em' },
  sheetTitle: { fontFamily: FONT.display, fontSize: 26, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em' },
  stat: { fontFamily: FONT.display, fontSize: 20, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' },
  body: { fontFamily: FONT.sans, fontSize: 13.5, lineHeight: 1.6, fontWeight: 400 },
  row: { fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.35, fontWeight: 700 },
  pill: { fontFamily: FONT.sans, fontSize: 14.5, lineHeight: 1, fontWeight: 700 },
  meta: { fontFamily: FONT.sans, fontSize: 12, lineHeight: 1.4, fontWeight: 500 },
  eyebrow: { fontFamily: FONT.sans, fontSize: 10, lineHeight: 1.2, fontWeight: 700, letterSpacing: '2.2px', textTransform: 'uppercase' },
} satisfies Record<string, CSSProperties>;

/** Card title size: 28–50px, scaled by title length (54 − length × 0.9). */
export const cardTitleSize = (title: string, max = 50) => Math.min(max, Math.max(28, 54 - title.length * 0.9));

/** `#RRGGBB` + alpha (0–1) → `#RRGGBBAA`, matching the README's hex-suffix notation. */
export function alpha(hex: AccentHex, a: number) {
  const h = hex.replace('#', '').slice(0, 6);
  return `#${h}${Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0')}`;
}

export function hexToRgb(hex: AccentHex): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/**
 * The ambient gradient every screen, sheet and popup sits on.
 * `2e` ≈ 18%, `24` ≈ 14%, `1f` ≈ 12%, `12` ≈ 7%, `1c` ≈ 11%.
 */
export function ambient(accent: AccentHex = DEFAULT_ACCENT, ground: string = T.bg) {
  if (accent.toLowerCase() === ACCENTS.noir.toLowerCase()) {
    return 'radial-gradient(120% 70% at 0% 0%, rgba(255,255,255,0.06) 0%, transparent 70%), #000000';
  }
  return `radial-gradient(120% 70% at 0% 0%, ${accent}2e 0%, transparent 70%), radial-gradient(120% 70% at 100% 100%, ${accent}24 0%, transparent 70%), linear-gradient(165deg, ${accent}1f 0%, ${accent}12 50%, ${accent}1c 100%), ${ground}`;
}

/** Glass surface for controls (pills, capsules, round buttons). */
export const glass = (strong = false): CSSProperties => ({
  background: strong ? T.glassStrong : T.glass,
  border: `1px solid ${T.hairlineStrong}`,
  backdropFilter: BLUR,
  WebkitBackdropFilter: BLUR,
});

/** Full-bleed art scrims (README "Imagery"). */
export const SCRIM = {
  bottom: 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.85) 28%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0) 100%)',
  top: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)',
} as const;
