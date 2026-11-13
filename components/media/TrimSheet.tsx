'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Pause, Play, X } from 'lucide-react';
import { T, FONT, GRAD } from '@/lib/thiscene';
import { MAX_SECONDS, unreadable, type Trim } from '@/lib/videoUpload';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const MIN = 1;

/**
 * Pick the part of a video that plays (up to a minute): drag either end, or slide the whole window.
 * The video previews the part on a loop. Nothing is cut on the phone; the part is saved with the clip.
 */
export default function TrimSheet({ file, onCancel, onDone }: { file: File; onCancel: () => void; onDone: (trim: Trim | null) => void }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const v = useRef<HTMLVideoElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [dur, setDur] = useState(0);
  const [range, setRange] = useState<Trim>({ start: 0, end: 0 });
  const [now, setNow] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  const drag = useRef<{ what: 'start' | 'end' | 'move'; x0: number; r0: Trim } | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const loaded = () => {
    const el = v.current;
    if (!el) return;
    if (!Number.isFinite(el.duration)) { el.currentTime = 1e9; return; } // some recordings only say how long they are after a seek
    // Clips play in a wide (16:9) frame on the event cards, so only landscape videos work
    if (el.videoHeight > el.videoWidth) { setError('This video is upright. Clips play wide on TsaCoal, so use a landscape video: turn your phone sideways when you record.'); return; }
    const d = el.duration;
    setDur(d);
    setRange({ start: 0, end: Math.min(d, MAX_SECONDS) });
    el.currentTime = 0;
  };

  // Keep the preview inside the chosen part
  const onTime = () => {
    const el = v.current;
    if (!el || !dur) return;
    setNow(el.currentTime);
    if (!el.paused && el.currentTime >= range.end - 0.05) el.currentTime = range.start;
  };

  const toggle = () => {
    const el = v.current;
    if (!el) return;
    if (el.paused) { if (el.currentTime < range.start || el.currentTime >= range.end) el.currentTime = range.start; el.play().then(() => setPlaying(true)).catch(() => {}); }
    else { el.pause(); setPlaying(false); }
  };

  const at = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * dur;
  };
  const down = (what: 'start' | 'end' | 'move') => (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { what, x0: e.clientX, r0: range };
    v.current?.pause(); setPlaying(false);
  };
  const move = (e: React.PointerEvent) => {
    const g = drag.current;
    if (!g || !dur) return;
    let { start, end } = g.r0;
    if (g.what === 'move') {
      const len = end - start;
      const dt = ((e.clientX - g.x0) / track.current!.getBoundingClientRect().width) * dur;
      start = Math.min(Math.max(0, g.r0.start + dt), dur - len); end = start + len;
    } else if (g.what === 'start') {
      start = Math.min(at(e.clientX), end - MIN);
      if (end - start > MAX_SECONDS) end = start + MAX_SECONDS;
    } else {
      end = Math.max(at(e.clientX), start + MIN);
      if (end - start > MAX_SECONDS) start = end - MAX_SECONDS;
    }
    setRange({ start, end });
    const el = v.current;
    if (el) el.currentTime = g.what === 'end' ? end : start; // show the frame at the end being moved
  };
  const up = () => { drag.current = null; };

  const len = range.end - range.start;
  const pct = (s: number) => (dur ? (s / dur) * 100 : 0);
  const whole = dur > 0 && range.start < 0.05 && range.end > dur - 0.05;
  const handle: CSSProperties = { position: 'absolute', top: -4, bottom: -4, width: 22, borderRadius: 8, background: T.white, cursor: 'ew-resize', touchAction: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(0,0,0,0.5)' };
  const grip = <span style={{ width: 3, height: 18, borderRadius: 2, background: 'rgba(6,17,11,0.45)' }} />;

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Trim your clip" style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#030806', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(14px + env(safe-area-inset-top, 0px)) 16px 12px' }}>
        <button type="button" aria-label="Cancel" onClick={onCancel} style={{ width: 42, height: 42, borderRadius: 21, border: 'none', background: 'rgba(255,255,255,0.08)', color: T.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={20} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>Trim your clip</p>
          <p style={{ margin: '2px 0 0', fontFamily: FONT.sans, fontSize: 13, color: T.text3 }}>Landscape · up to {MAX_SECONDS} seconds plays</p>
        </div>
      </div>

      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }} onClick={toggle}>
        <video ref={v} src={url} playsInline muted={false} preload="auto" onLoadedMetadata={loaded} onDurationChange={() => { if (!dur && v.current && Number.isFinite(v.current.duration)) loaded(); }}
          onTimeUpdate={onTime} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)}
          onError={() => setError(unreadable(v.current?.error?.code))}
          style={{ maxWidth: '100%', maxHeight: '100%', display: error ? 'none' : 'block' }} />
        {!error && dur > 0 && !playing && (
          <span aria-hidden style={{ position: 'absolute', width: 64, height: 64, borderRadius: 32, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.white }}><Play size={26} fill={T.white} style={{ marginLeft: 3 }} /></span>
        )}
        {error && <p style={{ margin: 0, padding: '0 28px', textAlign: 'center', fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.55, color: '#FCA5A5' }}>{error}</p>}
        {!error && !dur && <p style={{ position: 'absolute', margin: 0, fontFamily: FONT.sans, fontSize: 14, color: T.text3 }}>Opening your video…</p>}
      </div>

      <div style={{ padding: '18px 20px calc(18px + env(safe-area-inset-bottom, 0px))' }}>
        {!error && dur > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: FONT.sans, fontSize: 13, color: T.text3 }}>
              <span>{fmt(range.start)}</span>
              <span style={{ fontWeight: 700, color: T.white }}>{whole ? `Whole clip · ${fmt(len)}` : `${fmt(len)} selected`}</span>
              <span>{fmt(range.end)}</span>
            </div>
            {/* The timeline: the chosen part in mint between two white handles */}
            <div ref={track} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
              style={{ position: 'relative', height: 52, margin: '12px 11px 0', borderRadius: 12, background: 'rgba(255,255,255,0.08)', touchAction: 'none' }}>
              <div onPointerDown={down('move')} style={{ position: 'absolute', top: 0, bottom: 0, left: `${pct(range.start)}%`, width: `${pct(len)}%`, background: 'rgba(123,227,168,0.28)', boxShadow: 'inset 0 0 0 2px #7BE3A8', borderRadius: 10, cursor: 'grab', touchAction: 'none' }} />
              <span aria-hidden style={{ position: 'absolute', top: 6, bottom: 6, width: 2, borderRadius: 1, left: `${pct(now)}%`, background: T.white, opacity: playing ? 0.9 : 0, pointerEvents: 'none' }} />
              <span role="slider" aria-label="Start" aria-valuenow={Math.round(range.start)} aria-valuemin={0} aria-valuemax={Math.round(dur)} onPointerDown={down('start')} style={{ ...handle, left: `calc(${pct(range.start)}% - 11px)` }}>{grip}</span>
              <span role="slider" aria-label="End" aria-valuenow={Math.round(range.end)} aria-valuemin={0} aria-valuemax={Math.round(dur)} onPointerDown={down('end')} style={{ ...handle, left: `calc(${pct(range.end)}% - 11px)` }}>{grip}</span>
            </div>
            <p style={{ margin: '12px 0 0', textAlign: 'center', fontFamily: FONT.sans, fontSize: 12.5, color: T.text3 }}>
              {dur > MAX_SECONDS ? `Your video is ${fmt(dur)}. Drag the ends or slide the box to pick the best minute.` : 'Drag the ends to cut the start or the end.'}
            </p>
          </>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button type="button" onClick={toggle} disabled={!!error || !dur} aria-label={playing ? 'Pause' : 'Play'}
            style={{ width: 52, height: 52, borderRadius: 26, border: 'none', flexShrink: 0, background: 'rgba(255,255,255,0.08)', color: T.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: error || !dur ? 0.4 : 1 }}>
            {playing ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 2 }} />}
          </button>
          <button type="button" disabled={!!error || !dur} onClick={() => { v.current?.pause(); onDone(whole ? null : range); }}
            style={{ flex: 1, height: 52, borderRadius: 999, border: 'none', background: GRAD.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 15.5, fontWeight: 700, cursor: 'pointer', opacity: error || !dur ? 0.4 : 1 }}>
            {error ? 'Can’t use this video' : whole ? 'Use clip' : 'Use this part'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
