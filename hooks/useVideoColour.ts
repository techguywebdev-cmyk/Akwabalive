'use client';

import { useEffect, useState } from 'react';

const cache = new Map<string, string | null>();

/**
 * The main colour of a video's thumbnail ("r, g, b"), for tinting the screen around it.
 * Reads a tiny copy of the still into a canvas; null if the image can't be read.
 */
export function useVideoColour(youtubeId: string | undefined, enabled: boolean): string | null {
  const [rgb, setRgb] = useState<string | null>(() => (youtubeId ? cache.get(youtubeId) ?? null : null));
  useEffect(() => {
    if (!enabled || !youtubeId) return;
    if (cache.has(youtubeId)) { setRgb(cache.get(youtubeId) ?? null); return; }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = 24; c.height = 14;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('no canvas');
        ctx.drawImage(img, 0, 0, 24, 14);
        const d = ctx.getImageData(0, 0, 24, 14).data;
        // Weight colourful, mid-bright pixels: stage lights, not black edges or white walls
        let r = 0, g = 0, b = 0, w = 0;
        for (let i = 0; i < d.length; i += 4) {
          const R = d[i], G = d[i + 1], B = d[i + 2];
          const max = Math.max(R, G, B), min = Math.min(R, G, B);
          const sat = max ? (max - min) / max : 0;
          const light = max / 255;
          const weight = sat * sat * (light > 0.15 && light < 0.95 ? 1 : 0.1) + 0.02;
          r += R * weight; g += G * weight; b += B * weight; w += weight;
        }
        r /= w; g /= w; b /= w;
        // Push it a little brighter and more saturated so it reads as a glow on near-black
        const max = Math.max(r, g, b, 1);
        const k = Math.min(1.6, 200 / max);
        const out = [r, g, b].map((v) => Math.round(Math.min(255, v * k))).join(', ');
        cache.set(youtubeId, out);
        if (!cancelled) setRgb(out);
      } catch {
        cache.set(youtubeId, null);
      }
    };
    img.onerror = () => cache.set(youtubeId, null);
    img.src = `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`;
    return () => { cancelled = true; };
  }, [youtubeId, enabled]);
  return rgb;
}
