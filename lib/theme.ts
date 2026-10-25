/**
 * Brand + design tokens for older pages, retoned to the green-black ground (Oct 2026).
 * New surfaces use lib/thiscene.ts.
 *
 * Rules of the system:
 *  - GLASS: surfaces are translucent and blur what sits behind them
 *    (photos, video, and the ambient colour wash painted on <body>).
 *  - WASH: the page background is a soft gradient in the current accent
 *    (gold/green by default, the event's own colour in the events feed).
 *  - Flat controls: no drop shadows on buttons or panels; hairline borders instead.
 *  - Text over photos may sit on a dark fade (scrim) for legibility.
 *
 * Change BRAND_NAME in one place when the product is renamed.
 */
import type { CSSProperties } from 'react';

export const BRAND_NAME = 'Akwaaba';
export const BRAND_MARK = BRAND_NAME.toUpperCase();
export const BRAND_TAGLINE = "Ghana's events — discover, list, go.";

export const C = {
  /** Page base (opaque) — the green-black ground */
  bg: '#030806',
  /** Glass panel — cards, bars, sidebars */
  bg2: 'rgba(6, 22, 14, 0.5)',
  /** Raised / inset surface on top of a panel — inputs, tiles, chips */
  bg3: 'rgba(255, 255, 255, 0.05)',
  /** Hover / pressed */
  bg4: 'rgba(255, 255, 255, 0.09)',

  /** App accent (mint). Named "gold" for older call sites. */
  gold: '#7BE3A8',
  goldText: '#A8F0C6',
  goldDim: 'rgba(123, 227, 168, 0.14)',
  goldBd: 'rgba(123, 227, 168, 0.45)',

  cream: '#F1F4F2',
  c2: 'rgba(255, 255, 255, 0.72)',
  c3: 'rgba(255, 255, 255, 0.5)',
  c4: 'rgba(255, 255, 255, 0.08)',

  bd: 'rgba(255, 255, 255, 0.08)',
  bd2: 'rgba(255, 255, 255, 0.13)',

  red: '#FF6B6B',
  green: '#1F5A3F',
  greenL: '#7BE3A8',
  greenSolid: '#1F5A3F',
  greenDim: 'rgba(123, 227, 168, 0.12)',
  greenBd: 'rgba(123, 227, 168, 0.32)',

  onAccent: '#03130B',
  white: '#FFFFFF',
  black: '#030806',
} as const;

export type ThemeColors = typeof C;

const blur = (px: number, sat = 150) => `blur(${px}px) saturate(${sat}%)`;

/**
 * Glass surfaces as inline-style fragments. Spread them into a style object:
 *   style={{ ...G.panel, border: `1px solid ${C.bd}`, borderRadius: R.card }}
 * They set background + blur only, so borders and radii stay per component.
 */
export const G = {
  /** Default glass: cards, panels, sidebars */
  panel: {
    background: C.bg2,
    backdropFilter: blur(22),
    WebkitBackdropFilter: blur(22),
  },
  /** Lighter glass for tiles/inputs sitting on a panel or a photo */
  raised: {
    background: C.bg3,
    backdropFilter: blur(14),
    WebkitBackdropFilter: blur(14),
  },
  /** Dense glass for sheets, modals and menus — stays legible over anything */
  sheet: {
    background: 'rgba(5, 16, 10, 0.86)',
    backdropFilter: blur(32, 160),
    WebkitBackdropFilter: blur(32, 160),
  },
  /** Navigation bar */
  bar: {
    background: 'rgba(4, 14, 9, 0.66)',
    backdropFilter: blur(24, 160),
    WebkitBackdropFilter: blur(24, 160),
  },
  /** Controls floating over photos and video (icon buttons, pills) */
  overlay: {
    background: 'rgba(3, 10, 6, 0.42)',
    backdropFilter: blur(16),
    WebkitBackdropFilter: blur(16),
  },
  /** Scrim behind modals */
  scrim: {
    background: 'rgba(1, 4, 3, 0.62)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
  },
} satisfies Record<string, CSSProperties>;

/** Corner radii */
export const R = {
  chip: 999,
  btn: 999,
  input: 12,
  card: 18,
  sheet: 24,
} as const;

/** Flat buttons */
export const BTN = {
  primary: {
    background: C.gold,
    color: C.onAccent,
    border: 'none',
    borderRadius: R.chip,
    fontWeight: 700,
    boxShadow: 'none',
  },
  secondary: {
    ...G.raised,
    color: C.cream,
    border: `1px solid ${C.bd2}`,
    borderRadius: R.btn,
    fontWeight: 600,
    boxShadow: 'none',
  },
} satisfies Record<string, CSSProperties>;
