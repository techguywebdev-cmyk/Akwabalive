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

/** Thiscene accent palette as RGB (noir excluded — reserved for black-and-white work). */
const PALETTE: RGB[] = (['gold', 'indigo', 'teal', 'rose', 'lime', 'violet', 'sky', 'ember', 'emerald'] as const)
  .map((k) => hexToRgb(ACCENTS[k]));

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

const cache = new Map<string, RGB | null>();
const pending = new Map<string, Promise<RGB | null>>();

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

/** Nearest Thiscene accent to a colour, by hue (circular distance). */
function snapToPalette(rgb: RGB): RGB {
  const [h] = rgbToHsl(rgb);
  let best = PALETTE[0];
  let bestD = Infinity;
  for (const p of PALETTE) {
    const [ph] = rgbToHsl(p);
    const d = Math.min(Math.abs(ph - h), 1 - Math.abs(ph - h));
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

/** Flyer colour → a Thiscene accent so every event card uses the system's palette. */
function tune(rgb: RGB): RGB {
  const [h, s, l] = rgbToHsl(rgb);
  return snapToPalette(hslToRgb(h, Math.max(s, 0.55), Math.min(0.6, Math.max(0.45, l))));
}

function sample(url: string): Promise<RGB | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      try {
        const size = 28;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        // Hue buckets weighted by saturation, ignoring near-black/near-white pixels.
        const buckets = new Array(12).fill(0).map(() => ({ w: 0, r: 0, g: 0, b: 0 }));
        for (let i = 0; i < data.length; i += 4) {
          const px: RGB = [data[i], data[i + 1], data[i + 2]];
          const [h, s, l] = rgbToHsl(px);
          if (l < 0.12 || l > 0.92 || s < 0.18) continue;
          const w = s * (1 - Math.abs(l - 0.5));
          const bk = buckets[Math.floor(h * 12) % 12];
          bk.w += w; bk.r += px[0] * w; bk.g += px[1] * w; bk.b += px[2] * w;
        }
        const best = buckets.reduce((a, b) => (b.w > a.w ? b : a));
        if (best.w < 1.5) return resolve(null);
        resolve(tune([best.r / best.w, best.g / best.w, best.b / best.w].map(Math.round) as RGB));
      } catch {
        resolve(null); // tainted canvas (no CORS) etc.
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Resolves an event's accent; cached per image URL. */
export async function eventAccent(image: string | null | undefined, category?: string | null): Promise<RGB> {
  const fallback = categoryAccent(category);
  if (!image || typeof window === 'undefined') return fallback;
  if (cache.has(image)) return cache.get(image) ?? fallback;
  if (!pending.has(image)) pending.set(image, sample(image).then((c) => { cache.set(image, c); return c; }));
  return (await pending.get(image)!) ?? fallback;
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
