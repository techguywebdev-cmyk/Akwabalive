'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import jsQR from 'jsqr';
import { ArrowLeft, Check, X, Clock, Camera } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { T, FONT } from '@/lib/thiscene';

type Result =
  | { kind: 'ok'; holder: string; tier: string; quantity: number; event: string }
  | { kind: 'used'; holder: string; tier: string; at: string | null; event: string }
  | { kind: 'bad'; message: string };

const clock = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '');

/** Pull the ticket id and key out of a scanned Akwaaba QR (…/t/<id>?k=<key>) */
function parseTicket(text: string): { id: string; key: string } | null {
  try {
    const u = new URL(text);
    const m = u.pathname.match(/\/t\/([0-9a-f-]{36})\/?$/i);
    const key = u.searchParams.get('k');
    return m && key ? { id: m[1], key } : null;
  } catch { return null; }
}

/**
 * Door scanner for organisers: point the phone at a ticket's QR code and it is
 * checked in (once). Green = let them in, amber = already used, red = not valid.
 */
export default function ScanPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const busy = useRef(false);
  const lastText = useRef('');
  const [camError, setCamError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) window.location.href = `/auth?next=${encodeURIComponent('/organizer/scan')}`;
  }, [authLoading, user]);

  const handle = useCallback(async (text: string) => {
    if (busy.current || text === lastText.current) return;
    busy.current = true;
    lastText.current = text;
    const t = parseTicket(text);
    if (!t) {
      setResult({ kind: 'bad', message: 'This isn’t an Akwaaba ticket QR code.' });
    } else {
      const { data: v } = await supabase.rpc('verify_ticket', { p_id: t.id, p_key: t.key });
      if (!v?.valid && v?.reason === 'not_recognised') setResult({ kind: 'bad', message: 'Not a valid ticket. It may be fake or changed.' });
      else if (!v) setResult({ kind: 'bad', message: 'Couldn’t check this ticket. Check your connection.' });
      else if (v.status === 'used') setResult({ kind: 'used', holder: v.holder ?? '', tier: v.tier ?? '', at: v.checked_in_at, event: v.event_title ?? '' });
      else if (!v.can_check_in) setResult({ kind: 'bad', message: `This ticket is for “${v.event_title}”, which isn’t one of your events.` });
      else {
        const { data: c } = await supabase.rpc('check_in_ticket', { p_id: t.id, p_key: t.key });
        if (c?.ok) { setResult({ kind: 'ok', holder: v.holder ?? '', tier: v.tier ?? '', quantity: v.quantity ?? 1, event: v.event_title ?? '' }); setCount((n) => n + (v.quantity ?? 1)); if (navigator.vibrate) navigator.vibrate(80); }
        else if (c?.reason === 'already_used') setResult({ kind: 'used', holder: v.holder ?? '', tier: v.tier ?? '', at: c.checked_in_at, event: v.event_title ?? '' });
        else setResult({ kind: 'bad', message: 'Couldn’t check this ticket in.' });
      }
    }
    // Ready for the next person
    setTimeout(() => { busy.current = false; lastText.current = ''; setResult(null); }, 2600);
  }, [supabase]);

  // Camera + decoding loop (native BarcodeDetector where available, jsQR otherwise)
  useEffect(() => {
    if (!user) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const Detector = (window as any).BarcodeDetector;
    const detector = Detector ? new Detector({ formats: ['qr_code'] }) : null;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        const v = video.current!;
        v.srcObject = stream;
        await v.play();
      } catch {
        setCamError('Allow camera access to scan tickets. On iPhone: Settings → Safari → Camera.');
        return;
      }
      let last = 0;
      const tick = async (ts: number) => {
        if (stopped) return;
        raf = requestAnimationFrame(tick);
        if (ts - last < 180 || busy.current) return;
        last = ts;
        const v = video.current;
        if (!v || v.readyState < 2) return;
        try {
          if (detector) {
            const codes = await detector.detect(v);
            if (codes[0]?.rawValue) handle(codes[0].rawValue);
          } else {
            const c = canvas.current!;
            const w = 480; const h = Math.round((v.videoHeight / v.videoWidth) * w) || 480;
            c.width = w; c.height = h;
            const ctx = c.getContext('2d', { willReadFrequently: true })!;
            ctx.drawImage(v, 0, 0, w, h);
            const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
            if (code?.data) handle(code.data);
          }
        } catch { /* keep scanning */ }
      };
      raf = requestAnimationFrame(tick);
    })();
    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, [user, handle]);

  const tone = result?.kind === 'ok' ? T.mint : result?.kind === 'used' ? '#F5C451' : '#FF6B6B';

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', color: T.white, fontFamily: FONT.sans }}>
      <video ref={video} playsInline muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <canvas ref={canvas} style={{ display: 'none' }} />

      {/* Frame */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ width: 'min(72vw, 300px)', aspectRatio: '1', borderRadius: 28, boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)', border: `3px solid ${result ? tone : 'rgba(255,255,255,0.85)'}`, transition: 'border-color 200ms ease' }} />
      </div>

      <header style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 'calc(14px + env(safe-area-inset-top, 0px)) 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/organizer/dashboard" aria-label="Back to dashboard" style={{ width: 44, height: 44, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.18)', color: T.white }}><ArrowLeft size={22} /></Link>
        <span style={{ height: 36, padding: '0 14px', borderRadius: 18, display: 'inline-flex', alignItems: 'center', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.18)', fontSize: 14, fontWeight: 600 }}>{count} checked in</span>
      </header>

      <p style={{ position: 'absolute', left: 0, right: 0, top: 'calc(50% + min(36vw, 150px) + 18px)', textAlign: 'center', margin: 0, fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>
        {camError ? '' : 'Point at the ticket’s QR code'}
      </p>

      {camError && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32, textAlign: 'center', background: '#030806' }}>
          <Camera size={40} color={T.mint} />
          <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 20, fontWeight: 700 }}>Camera needed</p>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: T.text2, maxWidth: 320 }}>{camError}</p>
        </div>
      )}

      {result && (
        <div role="status" aria-live="assertive" style={{ position: 'absolute', left: 16, right: 16, bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))', borderRadius: 26, padding: 20, background: tone, color: result.kind === 'ok' ? T.onMint : result.kind === 'used' ? '#1A1300' : '#fff', display: 'flex', gap: 14, alignItems: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
          <span style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.14)' }}>
            {result.kind === 'ok' ? <Check size={30} strokeWidth={3} /> : result.kind === 'used' ? <Clock size={28} strokeWidth={2.5} /> : <X size={30} strokeWidth={3} />}
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
              {result.kind === 'ok' ? `Let ${result.quantity > 1 ? `${result.quantity} people` : 'them'} in` : result.kind === 'used' ? 'Already checked in' : 'Not valid'}
            </span>
            <span style={{ display: 'block', marginTop: 2, fontSize: 15, fontWeight: 500 }}>
              {result.kind === 'bad' ? result.message : `${result.holder} · ${result.tier}${result.kind === 'used' && result.at ? ` · at ${clock(result.at)}` : ''}`}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
