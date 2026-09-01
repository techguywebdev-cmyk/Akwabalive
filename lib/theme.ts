/**
 * Brand + color tokens.
 * Change BRAND_NAME in one place when the product is renamed.
 */
export const BRAND_NAME = 'Akwaaba';
/** Short mark in the nav (uppercase). Derived or override. */
export const BRAND_MARK = BRAND_NAME.toUpperCase();

export const BRAND_TAGLINE = "Ghana's events — discover, list, go.";

/**
 * Black / white / green system.
 * `gold` keys are kept as the primary accent alias so existing
 * components keep working (accent is green, not gold).
 */
export const C = {
  bg: '#0A0A0A',
  bg2: '#121212',
  bg3: '#1A1A1A',
  bg4: '#242424',

  /** Primary accent (green) — historically named gold in the codebase */
  gold: '#22C55E',
  goldDim: 'rgba(34, 197, 94, 0.14)',
  goldBd: 'rgba(34, 197, 94, 0.38)',

  /** Primary text / light surfaces */
  cream: '#F2F2F0',
  c2: 'rgba(242, 242, 240, 0.68)',
  c3: 'rgba(242, 242, 240, 0.42)',
  c4: 'rgba(242, 242, 240, 0.14)',

  bd: 'rgba(255, 255, 255, 0.08)',
  bd2: 'rgba(255, 255, 255, 0.16)',

  red: '#EF4444',
  green: '#166534',
  greenL: '#4ADE80',
  greenSolid: '#16A34A',
  greenDim: 'rgba(34, 197, 94, 0.12)',
  greenBd: 'rgba(34, 197, 94, 0.35)',

  /** CTA text on green buttons */
  onAccent: '#0A0A0A',
  white: '#FFFFFF',
  black: '#0A0A0A',
} as const;

export type ThemeColors = typeof C;
