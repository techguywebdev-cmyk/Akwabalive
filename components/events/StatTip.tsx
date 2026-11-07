'use client';

import { useEffect, useRef, useState } from 'react';
import { T, FONT } from '@/lib/thiscene';

/**
 * Just the icon and the number. What it means shows as a small tip for a moment when the page
 * opens, and again whenever it's tapped, then fades away.
 */
export default function StatTip({ icon, value, tip, intro = false }: { icon: React.ReactNode; value: string; tip: string; intro?: boolean }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = (ms = 2600) => {
    setOpen(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), ms);
  };
  useEffect(() => {
    if (!intro) return;
    const t = setTimeout(() => show(2800), 900);
    return () => { clearTimeout(t); if (timer.current) clearTimeout(timer.current); };
  }, [intro]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" onClick={() => show()} aria-label={`${value} ${tip}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: 0, border: 'none', background: 'none', cursor: 'pointer', color: T.mintText, fontFamily: FONT.sans, fontSize: 14, fontWeight: 700 }}>
        {icon} {value}
      </button>
      <span role="tooltip" aria-hidden={!open} style={{
        position: 'absolute', left: -6, bottom: 'calc(100% + 8px)', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 5,
        padding: '6px 10px', borderRadius: 9, background: 'rgba(14,30,22,0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)', color: T.white, fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 600,
        opacity: open ? 1 : 0, transform: open ? 'translateY(0)' : 'translateY(4px)', transition: 'opacity 220ms ease, transform 220ms ease',
      }}>{tip}</span>
    </span>
  );
}
