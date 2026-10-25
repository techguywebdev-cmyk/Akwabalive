'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Icon, CATEGORY_ICONS } from '@/components/ui/Icon';
import { alpha } from '@/lib/thiscene';
import { hiRes } from '@/lib/events/image';

type Area = { top: number | string; bottom: number | string; left: number | string; right: number | string };

/**
 * The flyer, sized to its own shape. Fills its positioned parent.
 *
 * bleed (phones): always edge to edge — no side gaps.
 *  - Portrait and story flyers run full width from the top; if they're taller than the room above
 *    the text, their lower part continues under the text behind a dark fade.
 *  - Square and wide flyers run full width and sit right on top of the text, with the
 *    same image blurred above them, so there's no hole between flyer and text.
 * framed (desktop): fitted whole inside `area` on a blurred copy of itself.
 *
 * `area.bottom` (a number in px) is the room the text below needs.
 */
export default function FlyerCanvas({
  src, area, accent = '#7BE3A8', category, dim = false, radius = 18, bleed = false, fill: fillBox = false,
}: {
  src?: string | null;
  area: Area;
  accent?: string;
  category?: string;
  /** Fade the poster a little (inactive feed cards) */
  dim?: boolean;
  radius?: number;
  bleed?: boolean;
  /** Bleed only: square and wide images fill the whole box (cropped at the sides) instead of resting on the text */
  fill?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [ratio, setRatio] = useState<number | null>(null); // width / height
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 390, h: 844 });
  const url = hiRes(src);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fill: CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none' };

  if (!url || failed) {
    return (
      <div aria-hidden style={{ ...fill, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(70% 45% at 50% 35%, ${alpha(accent, 0.22)} 0%, rgba(3,8,6,0) 70%)` }}>
        <span style={{ marginTop: '-25%', color: alpha(accent, 0.5) }}>
          <Icon name={(category && CATEGORY_ICONS[category]) || 'sparkle'} size={120} strokeWidth={1} />
        </span>
      </div>
    );
  }

  const onLoad = (img: HTMLImageElement) => { if (img.naturalWidth && img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight); };
  const reserve = typeof area.bottom === 'number' ? area.bottom : 0;
  const room = Math.max(160, size.h - reserve); // height available above the text

  // Where the sharp flyer goes (bleed mode)
  let poster: CSSProperties = { position: 'absolute', left: 0, top: 0, width: '100%', height: room, objectFit: 'cover', objectPosition: 'center top' };
  let fadeFrom = room;
  if (bleed && ratio) {
    const fullH = size.w / ratio; // height when the flyer spans the full width
    if (fullH <= room + 16) {
      // Fits at full width: rest it right on the text (no side gaps, nothing covered)
      poster = { position: 'absolute', left: 0, top: Math.max(0, room - fullH), width: '100%', height: fullH, objectFit: 'cover' };
      fadeFrom = room - 24;
    } else if (fillBox) {
      // Home hero: fill the screen like a cover photo
      poster = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 35%' };
      fadeFrom = Math.max(room - 140, size.h * 0.4);
    } else {
      // Taller than the room: always full width, never shrunk or cropped at the sides; the
      // lower part continues under the text behind a dark fade
      poster = { position: 'absolute', left: 0, top: 0, width: '100%', height: Math.min(fullH, size.h), objectFit: 'cover', objectPosition: 'center top' };
      fadeFrom = Math.max(room - 60, size.h * 0.45);
    }
  }

  return (
    <div ref={box} style={{ ...fill, overflow: 'hidden' }}>
      {/* Backdrop: the flyer itself, blurred, so any spare room takes its colours */}
      <div aria-hidden style={{ ...fill, overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" style={{ position: 'absolute', inset: '-8%', width: '116%', height: '116%', objectFit: 'cover', filter: 'blur(38px) saturate(1.25) brightness(0.5)' }} />
      </div>

      {bleed ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            decoding="async"
            ref={(el) => { if (el?.complete && !ratio) onLoad(el); }}
            onLoad={(e) => onLoad(e.currentTarget)}
            onError={() => setFailed(true)}
            style={{ ...poster, opacity: ratio ? (dim ? 0.7 : 1) : 0, transition: 'opacity 0.4s ease' }}
          />
          {/* Dark fade so the text below/over the flyer reads */}
          <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: fadeFrom, bottom: 0, background: 'linear-gradient(180deg, rgba(3,8,6,0) 0%, rgba(3,8,6,0.82) 38%, rgba(3,8,6,0.94) 100%)' }} />
          <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 120, background: 'linear-gradient(180deg, rgba(3,8,6,0.35), rgba(3,8,6,0))' }} />
        </>
      ) : (
        <div style={{ position: 'absolute', ...area, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            decoding="async"
            onError={() => setFailed(true)}
            style={{ display: 'block', maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', borderRadius: radius, boxShadow: '0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)', opacity: dim ? 0.7 : 1, transition: 'opacity 0.5s ease' }}
          />
        </div>
      )}
    </div>
  );
}
