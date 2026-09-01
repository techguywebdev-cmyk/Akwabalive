/**
 * Brand + color tokens.
 * Change BRAND_NAME in one place when the product is renamed.
 */
export const BRAND_NAME = 'Akwaaba';
export const BRAND_MARK = BRAND_NAME.toUpperCase();
export const BRAND_TAGLINE = "Ghana's events — discover, list, go.";

/** Original warm dark + gold system */
export const C = {
  bg: '#0D0B08',
  bg2: '#141109',
  bg3: '#1C1710',
  bg4: '#242018',

  gold: '#C8922A',
  goldDim: 'rgba(200, 146, 42, 0.14)',
  goldBd: 'rgba(200, 146, 42, 0.28)',

  cream: '#F5ECD7',
  c2: 'rgba(245, 236, 215, 0.55)',
  c3: 'rgba(245, 236, 215, 0.24)',
  c4: 'rgba(245, 236, 215, 0.08)',

  bd: 'rgba(245, 236, 215, 0.07)',
  bd2: 'rgba(245, 236, 215, 0.13)',

  red: '#CE1126',
  green: '#2D6A4F',
  greenL: '#4ade80',
  greenSolid: '#2D6A4F',
  greenDim: 'rgba(45, 106, 79, 0.15)',
  greenBd: 'rgba(45, 106, 79, 0.35)',

  onAccent: '#0D0B08',
  white: '#FFFFFF',
  black: '#0D0B08',
} as const;

export type ThemeColors = typeof C;
