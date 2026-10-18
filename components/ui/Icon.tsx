/**
 * Icon system — one stroke style (24px grid, 1.6 stroke, round caps/joins, no fills),
 * drawn from a single path table. The Oct 2026 set redraws the everyday icons
 * (navigation, actions, categories) to match the approved mockup.
 * Use <Icon name="ticket" size={20} color={...} filled /> everywhere instead of
 * mixing icon libraries, so every page reads as one set.
 */
import type { CSSProperties } from 'react';

const PATHS = {
  // ── from This-scine ────────────────────────────────────────────────
  search: ['M11 17.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z', 'M20 20l-4.2-4.2'],
  close: ['M6.5 6.5l11 11', 'M17.5 6.5l-11 11'],
  sliders: ['M4 7h9', 'M17 7h3', 'M15 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', 'M4 17h3', 'M11 17h9', 'M9 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'],
  heart: 'M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  bookmark: 'M17.5 20.5L12 16.5l-5.5 4V6A2.5 2.5 0 0 1 9 3.5h6A2.5 2.5 0 0 1 17.5 6z',
  send: ['M22 2L11 13', 'M22 2l-7 20-4-9-9-4 20-7z'],
  chevron: 'M6 9.5l6 6 6-6',
  flame: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z',
  sparkle: ['M11 3l1.9 5.6L18.5 10.5l-5.6 1.9L11 18l-1.9-5.6L3.5 10.5l5.6-1.9z', 'M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z'],
  eye: ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  reply: ['M9 17l-5-5 5-5', 'M4 12h11a4 4 0 0 1 0 8h-1'],
  user: ['M12 12.1a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2z', 'M5 20a7 7 0 0 1 14 0'],
  people: ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  friends: ['M9 13a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z', 'M3.5 19.5v-1.2a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4v1.2', 'M17 10.2a2.6 2.6 0 1 0 0-5.2', 'M19.8 16.2a3.2 3.2 0 0 0-2.6-3.1'],
  logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  trash: ['M3 6h18', 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6', 'M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2'],
  check: 'M5 12.5l4.5 4.5L19 7.5',
  share: ['M12 3.5v11', 'M7.8 7.7L12 3.5l4.2 4.2', 'M5 13v4.5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5V13'],
  play: 'M8 5.5v13l10.5-6.5z',
  list: ['M9 7h11', 'M9 12h11', 'M9 17h11', 'M4.5 7h.01', 'M4.5 12h.01', 'M4.5 17h.01'],
  plus: ['M12 5v14', 'M5 12h14'],
  globe: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M2 12h20', 'M12 2a15 15 0 0 1 0 20', 'M12 2a15 15 0 0 0 0 20'],
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  lock: ['M7.5 10.5h9a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18v-5a2.5 2.5 0 0 1 2.5-2.5z', 'M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5'],
  calendar: ['M7.5 5.5h9A3.5 3.5 0 0 1 20 9v7.5a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 4 16.5V9a3.5 3.5 0 0 1 3.5-3.5z', 'M4 10h16', 'M8.5 3.5V7', 'M15.5 3.5V7'],
  clock: ['M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17z', 'M12 7.5V12l3 2'],
  bell: ['M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z', 'M10 20.5a2 2 0 0 0 4 0'],
  userPlus: ['M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M19 8v6', 'M22 11h-6'],
  dots: ['M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', 'M19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', 'M5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z'],
  badgeCheck: ['M12 2l2.4 1.7 2.8-.3 1.1 2.6 2.6 1.1-.3 2.8L22 12l-1.7 2.4.3 2.8-2.6 1.1-1.1 2.6-2.8-.3L12 22l-2.4-1.7-2.8.3-1.1-2.6-2.6-1.1.3-2.8L2 12l1.7-2.4-.3-2.8 2.6-1.1 1.1-2.6 2.8.3z', 'M9 12l2 2 4-4'],
  edit: ['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', 'M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'],
  trophy: ['M8 21h8', 'M12 17v4', 'M7 4h10v6a5 5 0 0 1-10 0V4z', 'M7 5H4a1 1 0 0 0-1 1v1a3 3 0 0 0 3 3', 'M17 5h3a1 1 0 0 1 1 1v1a3 3 0 0 1-3 3'],
  speaker: ['M11 5L6 9H2v6h4l5 4V5z', 'M15.54 8.46a5 5 0 0 1 0 7.07', 'M19.07 4.93a10 10 0 0 1 0 14.14'],
  speakerOff: ['M11 5L6 9H2v6h4l5 4V5z', 'M23 9l-6 6', 'M17 9l6 6'],
  image: ['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', 'M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z', 'M21 15l-5-5L5 21'],
  camera: ['M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z', 'M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],

  // ── Akwaaba additions, same grid and stroke ───────────────────────
  home: ['M3 10.5L12 3l9 7.5', 'M5 9v11a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9'],
  compass: ['M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17z', 'M15 9l-1.8 4.2L9 15l1.8-4.2z'],
  ticket: ['M3.5 9V7A1.5 1.5 0 0 1 5 5.5h14A1.5 1.5 0 0 1 20.5 7v2a3 3 0 0 0 0 6v2a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17v-2a3 3 0 0 0 0-6z', 'M14.5 6v2', 'M14.5 11v2', 'M14.5 16v2'],
  live: ['M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', 'M16.24 7.76a6 6 0 0 1 0 8.48', 'M7.76 16.24a6 6 0 0 1 0-8.48', 'M19.07 4.93a10 10 0 0 1 0 14.14', 'M4.93 19.07a10 10 0 0 1 0-14.14'],
  moments: ['M7.5 4.5h9a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4h-9a4 4 0 0 1-4-4v-7a4 4 0 0 1 4-4z', 'M10.5 9.6v4.8l4-2.4z'],
  city: ['M3 21h18', 'M5 21V8l7-5v18', 'M19 21V11l-7-3', 'M8.5 9v.01', 'M8.5 12v.01', 'M8.5 15v.01', 'M15.5 13v.01', 'M15.5 16v.01'],
  mapPin: ['M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z', 'M12 12.3a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6z'],
  navigation: 'M4.5 11l15-6.5-6.5 15-1.8-6.7z',
  locate: ['M12 3v3', 'M12 18v3', 'M3 12h3', 'M18 12h3', 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z'],
  gift: ['M20 12v9H4v-9', 'M2 7h20v5H2z', 'M12 21V7', 'M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z', 'M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z'],
  info: ['M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17z', 'M12 16v-4.5', 'M12 8h.01'],
  menu: ['M4 8h16', 'M4 16h10'],
  grid: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  feed: ['M9 3.5h6a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-11a3 3 0 0 1 3-3z', 'M3 6.5v11', 'M21 6.5v11'],
  arrowLeft: 'M14.5 5.5L8 12l6.5 6.5',
  arrowRight: ['M5 12h14', 'M13 6l6 6-6 6'],
  music: ['M9 17.5V6l10-2v11.5', 'M6.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z', 'M16.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'],
  dashboard: ['M3 3h8v10H3z', 'M13 3h8v6h-8z', 'M13 11h8v10h-8z', 'M3 15h8v6H3z'],
  going: ['M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17z', 'M8.5 12.2l2.4 2.3 4.6-4.8'],
  // ── Rework (Oct 2026): categories and small extras ─────────────────
  festival: ['M12 4L3.5 19.5h17z', 'M9.2 19.5L12 14l2.8 5.5', 'M12 4V2.5'],
  nightlife: 'M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z',
  food: ['M7 3.5V10a2 2 0 0 0 4 0V3.5', 'M9 12v8.5', 'M17 20.5V3.5c-2 0-3.5 2.6-3.5 6.2 0 2.6 1.5 3.8 3.5 3.8'],
  culture: ['M12 9.6c3.9 0 7-1.2 7-2.6S15.9 4.4 12 4.4 5 5.6 5 7s3.1 2.6 7 2.6z', 'M5 7v9.5c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V7', 'M8 9.4l2 9.4', 'M16 9.4l-2 9.4'],
  sports: ['M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17z', 'M12 7.5l4.2 3-1.6 5h-5.2l-1.6-5z', 'M12 3.5v4', 'M16.2 10.5l3.8-1.3', 'M14.6 15.5l2.3 3.3', 'M9.4 15.5l-2.3 3.3', 'M7.8 10.5L4 9.2'],
  art: ['M12 3.5l2 5.5 5.5 2-5.5 2-2 5.5-2-5.5-5.5-2 5.5-2z', 'M19 3.5v3', 'M17.5 5h3'],
  tech: ['M9 6.5h6A2.5 2.5 0 0 1 17.5 9v6a2.5 2.5 0 0 1-2.5 2.5H9A2.5 2.5 0 0 1 6.5 15V9A2.5 2.5 0 0 1 9 6.5z', 'M10 3.5v3', 'M14 3.5v3', 'M10 17.5v3', 'M14 17.5v3', 'M3.5 10h3', 'M3.5 14h3', 'M17.5 10h3', 'M17.5 14h3'],
  wellness: ['M5 20.5c0-4 2.5-6 7-6s7 2 7 6', 'M12 14.5c-2.5-1.5-4-4-4-7a4 4 0 0 1 8 0c0 3-1.5 5.5-4 7z'],
  fashion: ['M6.5 3.5h11l-2 6h-7z', 'M8.5 9.5L7 20.5h10l-1.5-11'],
  open: ['M7 17L17 7', 'M9 7h8v8'],
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name, size = 20, color = 'currentColor', filled = false, strokeWidth = 1.6, style, title,
}: {
  name: IconName; size?: number; color?: string; filled?: boolean; strokeWidth?: number;
  style?: CSSProperties; title?: string;
}) {
  const def = PATHS[name];
  const paths: readonly string[] = Array.isArray(def) ? def : [def as string];
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? color : 'none'} stroke={color} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}
      style={{ flexShrink: 0, ...style }}
    >
      {title && <title>{title}</title>}
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

/** Page icons — one per section, used in the header, menus and page titles. */
export const PAGE_ICONS: Record<string, IconName> = {
  Discover: 'compass',
  Events: 'calendar',
  Live: 'live',
  Moments: 'moments',
  Cities: 'city',
  'My profile': 'user',
  'My tickets': 'ticket',
  'Dream events': 'bookmark',
  'Organizer dashboard': 'dashboard',
};

/** One icon per event category. */
export const CATEGORY_ICONS: Record<string, IconName> = {
  concert: 'music',
  festival: 'festival',
  nightlife: 'nightlife',
  food: 'food',
  culture: 'culture',
  sports: 'sports',
  art: 'art',
  tech: 'tech',
  wellness: 'wellness',
  fashion: 'fashion',
};
