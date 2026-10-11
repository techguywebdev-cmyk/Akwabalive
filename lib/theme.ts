/**
 * Brand + design tokens — frosted glass over a colour wash.
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
  /** Page base (opaque) */
  bg: '#0D0B08',
  /** Glass panel — cards, bars, sidebars */
  bg2: 'rgba(30, 25, 17, 0.52)',
  /** Raised / inset surface on top of a panel — inputs, tiles, chips */
  bg3: 'rgba(245, 236, 215, 0.06)',
  /** Hover / pressed */
  bg4: 'rgba(245, 236, 215, 0.11)',

  gold: '#C8922A',
  goldText: '#E0B25A',
  goldDim: 'rgba(200, 146, 42, 0.16)',
  goldBd: 'rgba(200, 146, 42, 0.40)',

  cream: '#F5ECD7',
  c2: 'rgba(245, 236, 215, 0.72)',
  c3: 'rgba(245, 236, 215, 0.50)',
  c4: 'rgba(245, 236, 215, 0.08)',

  bd: 'rgba(245, 236, 215, 0.10)',
  bd2: 'rgba(245, 236, 215, 0.16)',

  red: '#CE1126',
  green: '#2D6A4F',
  greenL: '#4ade80',
  greenSolid: '#2D6A4F',
  greenDim: 'rgba(74, 222, 128, 0.12)',
  greenBd: 'rgba(74, 222, 128, 0.32)',

  onAccent: '#0D0B08',
  white: '#FFFFFF',
  black: '#0D0B08',
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
    background: 'rgba(20, 17, 12, 0.80)',
    backdropFilter: blur(32, 160),
    WebkitBackdropFilter: blur(32, 160),
  },
  /** Navigation bar */
  bar: {
    background: 'rgba(13, 11, 8, 0.62)',
    backdropFilter: blur(24, 160),
    WebkitBackdropFilter: blur(24, 160),
  },
  /** Controls floating over photos and video (icon buttons, pills) */
  overlay: {
    background: 'rgba(13, 11, 8, 0.40)',
    backdropFilter: blur(16),
    WebkitBackdropFilter: blur(16),
  },
  /** Scrim behind modals */
  scrim: {
    background: 'rgba(8, 6, 4, 0.62)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
  },
} satisfies Record<string, CSSProperties>;

/** Corner radii */
export const R = {
  chip: 999,
  btn: 12,
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
    borderRadius: R.btn,
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
