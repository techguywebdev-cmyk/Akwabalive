'use client';

import { forwardRef, useImperativeHandle, useRef, type VideoHTMLAttributes } from 'react';
import { readTrim } from '@/lib/videoUpload';

/**
 * A <video> that plays only the trimmed part of an uploaded clip (its link ends in #t=start,end).
 * Loops inside that part when `loop` is set; otherwise stops at its end and calls onEnded.
 */
const TrimmedVideo = forwardRef<HTMLVideoElement, VideoHTMLAttributes<HTMLVideoElement> & { src: string }>(function TrimmedVideo({ src, loop, onEnded, onTimeUpdate, onLoadedMetadata, ...rest }, ref) {
  const v = useRef<HTMLVideoElement>(null);
  useImperativeHandle(ref, () => v.current!, []);
  const trim = readTrim(src);
  const back = (el: HTMLVideoElement) => { el.currentTime = trim?.start ?? 0; el.play().catch(() => {}); };
  return (
    <video ref={v} src={src} {...rest} loop={loop && !trim}
      onLoadedMetadata={(e) => { if (trim && e.currentTarget.currentTime < trim.start) e.currentTarget.currentTime = trim.start; onLoadedMetadata?.(e); }}
      onTimeUpdate={(e) => {
        const el = e.currentTarget;
        if (trim && el.currentTime >= trim.end) {
          if (loop) back(el);
          else { el.pause(); onEnded?.(e as unknown as React.SyntheticEvent<HTMLVideoElement, Event>); }
        }
        onTimeUpdate?.(e);
      }}
      onEnded={(e) => { if (loop && trim) back(e.currentTarget); else onEnded?.(e); }} />
  );
});

export default TrimmedVideo;
