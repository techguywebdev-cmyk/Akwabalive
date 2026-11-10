'use client';

import { useEffect, useState } from 'react';
import { T, FONT } from '@/lib/thiscene';

/** When a show starts: its date plus the listed time ("9pm", "12:00 PM", "20:00"), 8pm if no time; Ghana is on UTC */
export function startsAt(date: string, time?: string | null): number | null {
  if (!/^\d{4}-\d{2}-\d{2}/.test(date)) return null;
  let h = 20, m = 0;
  const t = time?.toLowerCase().match(/(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?/);
  if (t && !/tba|tbc/.test(time!.toLowerCase())) {
    h = Number(t[1]) % 24; m = Number(t[2] ?? 0);
    if (t[3] === 'pm' && h < 12) h += 12;
    if (t[3] === 'am' && h === 12) h = 0;
  }
  return Date.parse(`${date.slice(0, 10)}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`);
}

/** One digit that slides in from above whenever it changes */
function Digit({ d }: { d: string }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: '0.62em', height: '1.1em', overflow: 'hidden', textAlign: 'center' }}>
      <span key={d} className="ak-tick" style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>{d}</span>
    </span>
  );
}

/** Days · hours · minutes · seconds to a show, ticking live; "Happening now" once it's started */
export default function Countdown({ at, compact = false }: { at: number; compact?: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return <div style={{ height: compact ? 58 : 76 }} />;
  const left = Math.max(0, at - now);
  if (left === 0) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, height: 40, padding: '0 16px', borderRadius: 999, background: 'rgba(123,227,168,0.14)', color: T.mint, fontFamily: FONT.display, fontSize: 15, fontWeight: 800 }}>
        <span className="ak-pulse" style={{ width: 8, height: 8, borderRadius: 3, background: T.mint }} /> Happening now
      </div>
    );
  }
  const s = Math.floor(left / 1000);
  const units: [string, number][] = [['Days', Math.floor(s / 86400)], ['Hours', Math.floor(s / 3600) % 24], ['Mins', Math.floor(s / 60) % 60], ['Secs', s % 60]];
  return (
    <div role="timer" aria-label={`${units[0][1]} days ${units[1][1]} hours ${units[2][1]} minutes to go`} style={{ display: 'flex', gap: compact ? 6 : 8 }}>
      {units.map(([label, v], i) => (
        <div key={label} style={{ flex: 1, minWidth: 0, padding: compact ? '8px 0 7px' : '12px 0 10px', borderRadius: compact ? 14 : 18, textAlign: 'center', background: i === 3 ? 'rgba(123,227,168,0.12)' : 'rgba(255,255,255,0.06)' }}>
          <div style={{ fontFamily: FONT.display, fontSize: compact ? 24 : 32, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, color: i === 3 ? T.mint : T.white, fontVariantNumeric: 'tabular-nums' }}>
            {String(v).padStart(2, '0').split('').map((d, k) => <Digit key={k} d={d} />)}
          </div>
          <div style={{ marginTop: 3, fontFamily: FONT.sans, fontSize: compact ? 10.5 : 11.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.text3 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}
