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

/**
 * Read a flyer's colours from a small copy:
 * - accent: the strongest colour family, weighted by how much of the flyer it covers.
 *   A flyer that's mostly black, white or grey gets none (a small pink heart shouldn't paint the page red).
 * - wash: the average of the flyer's bottom edge (where the page continues), weighted with the rest,
 *   darkened into a deep tone. Neutral flyers get a near-black wash.
 */
function sample(url: string): Promise<FlyerColours | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      try {
        const size = 36;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        const buckets = new Array(12).fill(0).map(() => ({ w: 0, r: 0, g: 0, b: 0 }));
        let colourful = 0, total = 0;
        let wr = 0, wg = 0, wb = 0, ww = 0;
        for (let i = 0; i < data.length; i += 4) {
          const row = Math.floor(i / 4 / size);
          const px: RGB = [data[i], data[i + 1], data[i + 2]];
          const [h, s, l] = rgbToHsl(px);
          total += 1;
          // Wash: everything counts, the bottom quarter counts most
          const edge = row >= size * 0.75 ? 4 : 1;
          wr += px[0] * edge; wg += px[1] * edge; wb += px[2] * edge; ww += edge;
          // Accent: real colour only
          if (l < 0.12 || l > 0.92 || s < 0.22) continue;
          colourful += 1;
          const w = s * (1 - Math.abs(l - 0.5));
          const bk = buckets[Math.floor(h * 12) % 12];
          bk.w += w; bk.r += px[0] * w; bk.g += px[1] * w; bk.b += px[2] * w;
        }
        const share = colourful / Math.max(1, total); // how much of the flyer is actually colourful
        const best = buckets.reduce((x, y) => (y.w > x.w ? y : x));
        const accent = share >= 0.1 && best.w > 0 ? tune([best.r / best.w, best.g / best.w, best.b / best.w].map(Math.round) as RGB) : null;

        const [wh, ws, wl] = rgbToHsl([wr / ww, wg / ww, wb / ww].map(Math.round) as RGB);
        // Deep, never muddy: colourful flyers keep their hue; black-and-white ones stay near-black
        const sat = share < 0.1 ? Math.min(ws, 0.08) : Math.min(0.7, Math.max(ws * 1.25, 0.25));
        const light = share < 0.1 ? Math.min(0.09, Math.max(0.05, wl * 0.5)) : Math.min(0.22, Math.max(0.1, wl * 0.6));
        resolve({ accent, wash: hslToRgb(wh, sat, light) });
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
  const deep = (c: RGB): RGB => { const [h, s] = rgbToHsl(c); return hslToRgb(h, Math.min(s, 0.6), 0.14); };
  if (!image || typeof window === 'undefined') return { accent: fallback, wash: deep(fallback) };
  const c = cache.has(image) ? cache.get(image) : await load(image);
  if (!c) return { accent: fallback, wash: deep(fallback) };
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
