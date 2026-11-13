'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { CustomPlayerHandle } from './CustomPlayer';

/**
 * Plays a clip uploaded to TsaCoal (a plain video file) with the same controls as the YouTube player:
 * plays only while on screen, starts muted, tap to pause, sound toggled from outside.
 */
const ClipPlayer = forwardRef<CustomPlayerHandle, {
  src: string; poster?: string | null; title: string; active: boolean; fit?: 'contain' | 'cover';
  onMuteChange?: (muted: boolean) => void; onEnded?: () => void; onTimeUpdate?: (t: number, d: number) => void;
}>(function ClipPlayer({ src, poster, title, active, fit = 'contain', onMuteChange, onEnded, onTimeUpdate }, ref) {
  const v = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  useEffect(() => { onMuteChange?.(muted); }, [muted, onMuteChange]);

  useEffect(() => {
    const el = v.current;
    if (!el) return;
    if (active) el.play().catch(() => { /* blocked until a tap */ });
    else el.pause();
  }, [active]);

  useImperativeHandle(ref, () => ({
    seekTo: (s) => { if (v.current) v.current.currentTime = s; },
    play: () => { v.current?.play().catch(() => {}); },
    toggleMute: () => { const el = v.current; if (!el) return; el.muted = !el.muted; setMuted(el.muted); if (!el.muted) el.play().catch(() => {}); },
    getCurrentTime: () => v.current?.currentTime ?? 0,
    getDuration: () => v.current?.duration || 0,
  }), []);

  return (
    <video ref={v} src={src} poster={poster ?? undefined} title={title} muted={muted} playsInline preload={active ? 'auto' : 'metadata'}
      onClick={() => { const el = v.current; if (el) (el.paused ? el.play().catch(() => {}) : el.pause()); }}
      onEnded={onEnded} onTimeUpdate={() => { const el = v.current; if (el) onTimeUpdate?.(el.currentTime, el.duration || 0); }}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: fit, background: '#000', cursor: 'pointer' }} />
  );
});

export default ClipPlayer;
