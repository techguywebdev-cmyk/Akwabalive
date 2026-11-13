/**
 * Thiscene design system — the basis for TsaCoal's event surfaces.
 * Source: the "Thiscene" Design System artifact (tokens.json + component docs).
 *
 * Oct 2026 rework: a dark green → black ground everywhere. Each event keeps an accent,
 * but it only tints its tags, title glow and main button. Mint is the app's own accent.
 */
import type { CSSProperties } from 'react';

export const T = {
  /** Green-black ground (Oct 2026 rework) */
  bg: '#050606',
  surface: 'rgba(255,255,255,0.05)',
  surface2: 'rgba(255,255,255,0.025)',
  glass: 'rgba(3,10,6,0.42)',
  glassStrong: 'rgba(3,10,6,0.62)',
  hairline: 'rgba(255,255,255,0.07)',
  hairlineStrong: 'rgba(255,255,255,0.12)',
  text: 'rgba(255,255,255,0.92)',
  text2: 'rgba(255,255,255,0.58)',
  text3: 'rgba(255,255,255,0.4)',
  white: '#ffffff',
  /** The app's own accent: active tab, selected chips, app-level buttons */
  mint: '#7BE3A8',
  mintText: '#A8F0C6',
  onMint: '#03130B',
  success: '#7BE3A8',
  danger: '#FF8A8A',
} as const;

/** The base every screen sits on: near-black charcoal with a faint green light at the top (Nov 2026: calmer). */
export const GROUND =
  // Nov 2026: the This-scine ambient wash in mint — light from two corners and a faint tint across, no boxes
  'radial-gradient(120% 60% at 0% 0%, rgba(123,227,168,0.15) 0%, rgba(123,227,168,0) 70%), ' +
  'radial-gradient(120% 60% at 100% 100%, rgba(45,190,140,0.12) 0%, rgba(45,190,140,0) 70%), ' +
  'linear-gradient(165deg, rgba(123,227,168,0.06) 0%, rgba(123,227,168,0.025) 50%, rgba(123,227,168,0.05) 100%), ' +
  'linear-gradient(180deg, #0B0F0D 0%, #070908 50%, #050606 100%)';

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
 * The background for event sheets and popups: the green-black ground with a faint
 * touch of the event's colour.
 */
export function ambient(accent: AccentHex = DEFAULT_ACCENT) {
  // The event's colour is only a faint touch in one corner; the ground stays green-black.
  return `radial-gradient(90% 40% at 0% 0%, ${alpha(accent, 0.1)} 0%, rgba(0,0,0,0) 70%), ${GROUND}`;
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
  bottom: 'linear-gradient(to top, #030806 0%, rgba(4,16,10,0.9) 30%, rgba(3,8,6,0.35) 62%, rgba(3,8,6,0) 100%)',
  top: 'linear-gradient(to bottom, rgba(3,8,6,0.6) 0%, rgba(3,8,6,0) 100%)',
} as const;

/**
 * Nov 2026 "lit" layer: gradients and lit buttons, so screens feel made rather than flat.
 * Stays in the brand: mint into emerald into deep teal on charcoal. No warm colours.
 */
export const GRAD = {
  /** Primary fill: pale mint into deep emerald */
  mint: 'linear-gradient(135deg, #D2FBE3 0%, #8FEBB7 34%, #5AD99A 68%, #2FB97E 100%)',
  /** Text fill for display headings */
  text: 'linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 38%, #BFF5D6 72%, #7BE3A8 100%)',
  /** Lit glass for secondary controls and cards */
  glass: 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.035) 100%)',
  /** Card surface with a cool green cast */
  card: 'linear-gradient(160deg, rgba(123,227,168,0.10) 0%, rgba(255,255,255,0.03) 38%, rgba(255,255,255,0.015) 100%)',
  /** Hairline that catches light at the top */
  edge: 'linear-gradient(180deg, rgba(190,255,220,0.42) 0%, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0.03) 100%)',
  /** Northern-lights wash for heroes */
  aurora:
    'radial-gradient(48% 38% at 22% 18%, rgba(70,220,150,0.34) 0%, rgba(70,220,150,0) 70%), ' +
    'radial-gradient(42% 34% at 82% 10%, rgba(40,190,200,0.26) 0%, rgba(40,190,200,0) 72%), ' +
    'radial-gradient(70% 50% at 50% 60%, rgba(20,120,80,0.30) 0%, rgba(20,120,80,0) 75%)',
} as const;

/** Lit buttons. Spread onto a <button> or <Link>, then add size. */
export const BTN = {
  primary: {
    background: GRAD.mint,
    color: T.onMint,
    border: 'none',
    boxShadow: '0 12px 32px -10px rgba(91,217,154,0.65), 0 2px 6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.75), inset 0 -2px 0 rgba(0,60,30,0.18)',
    fontFamily: FONT.display,
    fontWeight: 800,
    letterSpacing: '-0.01em',
  },
  ghost: {
    background: GRAD.glass,
    color: T.white,
    border: 'none',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 24px -12px rgba(0,0,0,0.6)',
    backdropFilter: BLUR,
    WebkitBackdropFilter: BLUR,
    fontFamily: FONT.display,
    fontWeight: 600,
  },
} satisfies Record<string, CSSProperties>;

/** A 1px light-catching border around anything: wrap the child in a padded span with this background */
/** @deprecated Leo doesn't want bordered designs; kept for reference */
export const ringed = (radius: number, bg: string = GRAD.edge): CSSProperties => ({ padding: 1, borderRadius: radius, background: bg });
