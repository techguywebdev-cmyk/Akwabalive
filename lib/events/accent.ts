'use client';

/**
 * Per-event accent colour, used to wash the page behind the glass
 * (the same idea as This-scine's per-title ambient backdrop).
 *
 * 1. Try to read the flyer's dominant colour (small canvas sample).
 * 2. Fall back to a colour per category when the image can't be read (CORS, error).
 */
import { ACCENTS, hexToRgb } from '@/lib/thiscene';

export type RGB = [number, number, number];

export const BRAND_GOLD: RGB = hexToRgb(ACCENTS.gold);
export const BRAND_GREEN: RGB = hexToRgb(ACCENTS.emerald);

/** Category → Thiscene accent, used when a flyer's colour can't be read. */
const CATEGORY_ACCENT: Record<string, RGB> = {
  concert: hexToRgb(ACCENTS.rose),
  festival: hexToRgb(ACCENTS.gold),
  nightlife: hexToRgb(ACCENTS.violet),
  culture: hexToRgb(ACCENTS.emerald),
  food: hexToRgb(ACCENTS.ember),
  sports: hexToRgb(ACCENTS.sky),
  tech: hexToRgb(ACCENTS.teal),
  art: hexToRgb(ACCENTS.indigo),
  fashion: hexToRgb(ACCENTS.rose),
  wellness: hexToRgb(ACCENTS.lime),
};

export const toHex = (c: RGB) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

export function categoryAccent(category?: string | null): RGB {
  return (category && CATEGORY_ACCENT[category]) || BRAND_GOLD;
}

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb(h: number, s: number, l: number): RGB {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const hue = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue(p, q, h + 1 / 3), hue(p, q, h), hue(p, q, h - 1 / 3)].map((v) => Math.round(v * 255)) as RGB;
}

/** The flyer's main colour, made bright enough for tags and glows. Keeps its real hue (no snapping to a fixed palette). */
function tune(rgb: RGB): RGB {
  const [h, s, l] = rgbToHsl(rgb);
  return hslToRgb(h, Math.min(0.85, Math.max(s, 0.5)), Math.min(0.64, Math.max(0.5, l)));
}

export type FlyerColours = {
  /** Bright colour for tags, glows and buttons (null when the flyer has no real colour) */
  accent: RGB | null;
  /** Deep ground colour that continues the flyer's own bottom edge down the page */
  wash: RGB;
};

/** Skin and skin-like tones (faces, a tan suit): people are on most flyers, but they aren't the flyer's colour */
const isSkin = (h: number, s: number, l: number) => h >= 0.025 && h <= 0.115 && s >= 0.15 && s <= 0.75 && l >= 0.12 && l <= 0.8;

/**
 * Read a flyer's colours from a small copy.
 * Colourful pixels vote by hue (24 families), weighted by area and a little by saturation; the border counts double,
 * since that's usually the background. Skin tones are left out of the vote whenever the flyer has enough other colour,
 * so a purple flyer with people on it reads as purple, not orange. The winning family (with its neighbours) gives:
 * - accent: that colour, bright enough for tags and glows (none when under 12% of the flyer is colourful)
 * - wash: the same hue as a deep tone for the page ground (near-black for black-and-white flyers)
 */
function sample(url: string): Promise<FlyerColours | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      try {
        const N = 36;
        const canvas = document.createElement('canvas');
        canvas.width = N; canvas.height = N;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, N, N);
        const { data } = ctx.getImageData(0, 0, N, N);
        type Bucket = [number, number, number, number]; // weight, r, g, b
        const all: Bucket[] = Array.from({ length: 24 }, () => [0, 0, 0, 0] as Bucket);
        const noSkin: Bucket[] = Array.from({ length: 24 }, () => [0, 0, 0, 0] as Bucket);
        let neutral = 0, total = 0;
        for (let i = 0; i < data.length; i += 4) {
          const x = (i / 4) % N, y = Math.floor(i / 4 / N);
          const frame = x < N * 0.15 || x >= N * 0.85 || y < N * 0.15 || y >= N * 0.85 ? 2 : 1;
          const px: RGB = [data[i], data[i + 1], data[i + 2]];
          const [h, s, l] = rgbToHsl(px);
          total += frame;
          if (l < 0.1 || l > 0.94 || s < 0.2) { neutral += frame; continue; }
          const w = frame * (0.5 + s);
          const k = Math.floor(h * 24) % 24;
          const add = (t: Bucket[]) => { t[k][0] += w; t[k][1] += px[0] * w; t[k][2] += px[1] * w; t[k][3] += px[2] * w; };
          add(all);
          if (!isSkin(h, s, l)) add(noSkin);
        }
        const share = 1 - neutral / Math.max(1, total); // how much of the flyer is actually colourful
        const sumAll = all.reduce((n, b) => n + b[0], 0);
        const sumNo = noSkin.reduce((n, b) => n + b[0], 0);
        const votes = sumNo >= sumAll * 0.3 ? noSkin : all;
        // Strongest colour family, counted with its two neighbours
        let best = 0, bestW = -1;
        for (let k = 0; k < 24; k++) {
          const w = votes[(k + 23) % 24][0] + votes[k][0] + votes[(k + 1) % 24][0];
          if (w > bestW) { bestW = w; best = k; }
        }
        const agg = [0, 0, 0, 0];
        [(best + 23) % 24, best, (best + 1) % 24].forEach((k) => { for (let q = 0; q < 4; q++) agg[q] += votes[k][q]; });
        if (share < 0.12 || agg[0] <= 0) {
          // Black, white or grey flyer: no accent, a near-black ground
          resolve({ accent: null, wash: [16, 16, 17] });
          return;
        }
        const [h, sat] = rgbToHsl([agg[1] / agg[0], agg[2] / agg[0], agg[3] / agg[0]].map(Math.round) as RGB);
        resolve({
          accent: tune([agg[1] / agg[0], agg[2] / agg[0], agg[3] / agg[0]].map(Math.round) as RGB),
          wash: hslToRgb(h, Math.min(0.75, Math.max(sat, 0.3)), 0.13),
        });
      } catch {
        resolve(null); // tainted canvas (no CORS) etc.
      }
    };
    img.onerror = () => resolve(null);
    // Read a same-origin copy: most flyers live on sites that don't let other pages read their pixels
    const sameOrigin = url.startsWith('/') || (typeof window !== 'undefined' && url.startsWith(window.location.origin));
    img.src = sameOrigin || url.startsWith('data:') ? url : `/api/img?src=${encodeURIComponent(url)}`;
  });
}

const cache = new Map<string, FlyerColours | null>();
const pending = new Map<string, Promise<FlyerColours | null>>();

function load(image: string) {
  if (!pending.has(image)) pending.set(image, sample(image).then((c) => { cache.set(image, c); return c; }));
  return pending.get(image)!;
}

/** Brand mint, for flyers with no real colour of their own */
export const NEUTRAL_ACCENT: RGB = [123, 227, 168];

/** Both colours for a flyer; cached per image URL */
export async function eventColours(image: string | null | undefined, category?: string | null): Promise<FlyerColours> {
  const fallback = categoryAccent(category);
    if (!image || typeof window === 'undefined') return { accent: fallback, wash: [16, 16, 17] };
  const c = cache.has(image) ? cache.get(image) : await load(image);
  if (!c) return { accent: fallback, wash: [16, 16, 17] };
  return c;
}

/** Resolves an event's accent; cached per image URL. Black-and-white flyers get the brand mint. */
export async function eventAccent(image: string | null | undefined, category?: string | null): Promise<RGB> {
  const c = await eventColours(image, category);
  return c.accent ?? NEUTRAL_ACCENT;
}

/** Sets the page-wide wash colour (read by body::before in globals.css). */
export function setPageAccent(rgb: RGB, rgb2?: RGB) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement.style;
  root.setProperty('--accent-rgb', rgb.join(', '));
  if (rgb2) root.setProperty('--accent2-rgb', rgb2.join(', '));
}

export function resetPageAccent() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement.style;
  root.removeProperty('--accent-rgb');
  root.removeProperty('--accent2-rgb');
}

export const rgba = (c: RGB, a: number) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;
