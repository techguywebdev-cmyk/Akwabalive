'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, Plus, X } from 'lucide-react';
import { hiRes } from '@/lib/events/image';
import { listTitle } from '@/lib/titles';
import { T, FONT, GRAD } from '@/lib/thiscene';

export type GridEvent = { slug: string; title: string; date: string; time: string | null; venue: string | null; image_url: string | null };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const todayIso = () => { const d = new Date(); return iso(d.getFullYear(), d.getMonth(), d.getDate()); };
const flyer = (e: GridEvent, w: number) => (e.image_url ? hiRes(e.image_url, w) ?? e.image_url : null);
const gradText: React.CSSProperties = { background: GRAD.text, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' };

function until(day: string) {
  const n = Math.round((Date.parse(`${day}T12:00:00`) - Date.parse(`${todayIso()}T12:00:00`)) / 86400000);
  if (n < 0) return 'Been and gone';
  if (n === 0) return 'Tonight';
  if (n === 1) return 'Tomorrow';
  if (n < 14) return `In ${n} days`;
  return `In ${Math.round(n / 7)} weeks`;
}

/**
 * The calendar as a calendar: one month at a time, each night with a show wearing its flyer, like a wall
 * planner. Tap a night to see what's on below.
 */
export default function MonthGrid({ events, onRemove, onAddDay, renderSheet }: {
  events: GridEvent[]; onRemove?: (e: GridEvent) => void;
  /** Owner: an empty night was tapped (or "add another" on a night): find a show for it */
  onAddDay?: (iso: string) => void;
  /** The Months view: their whole calendar as one sheet; gets a callback that opens a night in Days */
  renderSheet?: (pick: (iso: string) => void) => React.ReactNode;
}) {
  const byDay = useMemo(() => {
    const m: Record<string, GridEvent[]> = {};
    for (const e of events) (m[e.date.slice(0, 10)] ??= []).push(e);
    return m;
  }, [events]);
  const days = useMemo(() => Object.keys(byDay).sort(), [byDay]);

  // Months from the first show to the last (or this month when it's empty)
  const months = useMemo(() => {
    const now = new Date();
    const a = days[0] ? [+days[0].slice(0, 4), +days[0].slice(5, 7) - 1] : [now.getFullYear(), now.getMonth()];
    const b = days.length ? [+days[days.length - 1].slice(0, 4), +days[days.length - 1].slice(5, 7) - 1] : a;
    const out: [number, number][] = [];
    for (let y = a[0], m = a[1]; y < b[0] || (y === b[0] && m <= b[1]); m === 11 ? (y++, m = 0) : m++) out.push([y, m]);
    return out;
  }, [days]);

  // Opens on the next night out
  const upcoming = days.find((d) => d >= todayIso()) ?? days[days.length - 1] ?? null;
  const [sel, setSel] = useState<string | null>(upcoming);
  const [mi, setMi] = useState(0);
  // Days (one month) or Months (the whole season at a glance); remembered on this device
  const [view, setView] = useState<'days' | 'months'>('days');
  useEffect(() => { try { if (localStorage.getItem('cal-view') === 'months') setView('months'); } catch { /* private mode */ } }, []);
  const pickView = (v: 'days' | 'months') => { setView(v); try { localStorage.setItem('cal-view', v); } catch { /* private mode */ } };
  useEffect(() => {
    if (sel && byDay[sel]) return;
    setSel(upcoming);
  }, [byDay, sel, upcoming]);
  useEffect(() => {
    if (!sel) return;
    const k = months.findIndex(([y, m]) => sel.startsWith(iso(y, m, 1).slice(0, 7)));
    if (k >= 0) setMi(k);
  }, [sel, months]);

  const tiles = useMemo(() => {
    const out = [...months];
    while (out.length < 4) { const [ly, lm] = out[out.length - 1]; out.push(lm === 11 ? [ly + 1, 0] : [ly, lm + 1]); }
    return out;
  }, [months]);
  const [y, m] = months[Math.min(mi, months.length - 1)];
  const lead = (new Date(y, m, 1).getDay() + 6) % 7; // Monday first
  const count = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const today = todayIso();
  const inMonth = days.filter((d) => d.startsWith(iso(y, m, 1).slice(0, 7))).length;
  const list = sel ? byDay[sel] ?? [] : [];
  const selDate = sel ? new Date(`${sel}T12:00:00`) : null;

  const navBtn = (on: boolean): React.CSSProperties => ({
    width: 40, height: 40, borderRadius: 13, border: 'none', cursor: on ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(255,255,255,0.07)', color: T.white, opacity: on ? 1 : 0.3,
  });

  return (
    <div>
      {/* Days / Months */}
      <div role="tablist" aria-label="Calendar view" style={{ display: 'inline-flex', padding: 4, borderRadius: 15, background: 'rgba(255,255,255,0.06)', marginBottom: 22 }}>
        {(['days', 'months'] as const).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => pickView(v)} style={{
            height: 36, padding: '0 16px', borderRadius: 11, border: 'none', cursor: 'pointer', fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 700,
            background: view === v ? 'rgba(123,227,168,0.18)' : 'transparent', color: view === v ? T.mintText : T.text2, transition: 'background 200ms ease, color 200ms ease',
          }}>{v === 'days' ? 'Days' : 'Months'}</button>
        ))}
      </div>

      {view === 'months' && (renderSheet ? renderSheet((key) => {
        const k = months.findIndex(([a2, b2]) => key.startsWith(iso(a2, b2, 1).slice(0, 7)));
        if (k >= 0) setMi(k);
        setSel(key); pickView('days');
        window.scrollTo({ top: Math.max(0, window.scrollY - 200), behavior: 'smooth' });
      }) : null)}

      {view === 'days' && (<>
      {/* Month header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.text3 }}>
            {y} · {inMonth} {inMonth === 1 ? 'night' : 'nights'} out
          </p>
          <h2 style={{ margin: '4px 0 0', fontFamily: FONT.display, fontSize: 'clamp(34px, 9vw, 46px)', fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1, ...gradText }}>{MONTHS[m]}</h2>
        </div>
        {months.length > 1 && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" aria-label="Previous month" disabled={mi === 0} onClick={() => setMi(mi - 1)} style={navBtn(mi > 0)}><ChevronLeft size={20} /></button>
            <button type="button" aria-label="Next month" disabled={mi >= months.length - 1} onClick={() => setMi(mi + 1)} style={navBtn(mi < months.length - 1)}><ChevronRight size={20} /></button>
          </div>
        )}
      </div>

      {/* Weekdays */}
      <div aria-hidden style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginTop: 18 }}>
        {WEEK.map((w, i) => <span key={i} style={{ textAlign: 'center', fontFamily: FONT.sans, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', color: i >= 5 ? T.mintText : T.text3 }}>{w}</span>)}
      </div>

      {/* The month */}
      <div role="grid" aria-label={`${MONTHS[m]} ${y}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginTop: 8 }}>
        {cells.map((d, i) => {
          if (d == null) return <span key={`x${i}`} />;
          const key = iso(y, m, d);
          const evs = byDay[key];
          const isSel = key === sel;
          const past = key < today;
          const src = evs?.find((e) => e.image_url);
          if (!evs && onAddDay && !past) {
            // Owner: tap an empty night to find a show for it
            return (
              <button key={key} type="button" onClick={() => onAddDay(key)} aria-label={`Add a show on ${d} ${MONTHS[m]}`}
                style={{ position: 'relative', aspectRatio: '3 / 4', padding: 0, border: 'none', borderRadius: 11, cursor: 'pointer', background: 'rgba(255,255,255,0.035)' }}>
                <span style={{ position: 'absolute', top: 5, left: 0, right: 0, textAlign: 'center', fontFamily: FONT.display, fontSize: 12.5, fontWeight: 700, color: key === today ? T.mintText : T.text3 }}>{d}</span>
                <Plus size={13} strokeWidth={2.4} style={{ position: 'absolute', left: '50%', bottom: 8, transform: 'translateX(-50%)', color: 'rgba(168,240,198,0.45)' }} />
              </button>
            );
          }
          if (!evs) {
            return (
              <span key={key} style={{ position: 'relative', aspectRatio: '3 / 4', borderRadius: 11, background: 'rgba(255,255,255,0.035)', opacity: past ? 0.45 : 1 }}>
                <span style={{ position: 'absolute', top: 5, left: 0, right: 0, textAlign: 'center', fontFamily: FONT.display, fontSize: 12.5, fontWeight: 700, color: key === today ? T.mintText : T.text3 }}>{d}</span>
                {key === today && <span style={{ position: 'absolute', left: '50%', bottom: 7, width: 5, height: 5, borderRadius: 2, transform: 'translateX(-50%)', background: T.mint }} />}
              </span>
            );
          }
          return (
            <button key={key} type="button" role="gridcell" aria-selected={isSel} aria-label={`${d} ${MONTHS[m]}: ${evs.map((e) => e.title).join(', ')}`} onClick={() => setSel(key)}
              style={{
                position: 'relative', aspectRatio: '3 / 4', padding: 0, border: 'none', borderRadius: 11, overflow: 'hidden', cursor: 'pointer',
                background: src ? '#000' : GRAD.mint, opacity: past && !isSel ? 0.5 : 1,
                transform: isSel ? 'translateY(-3px) scale(1.06)' : 'none', zIndex: isSel ? 2 : 1,
                boxShadow: isSel ? '0 14px 30px -8px rgba(123,227,168,0.6), 0 6px 14px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.35)',
                transition: 'transform 220ms cubic-bezier(0.22,1,0.36,1), box-shadow 220ms ease',
              }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {src && <img src={flyer(src, 160)!} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
              <span style={{ position: 'absolute', top: 3, left: 3, minWidth: 20, height: 20, padding: '0 4px', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: src ? 'rgba(5,10,8,0.72)' : 'transparent', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', fontFamily: FONT.display, fontSize: 11.5, fontWeight: 800, color: src ? T.white : T.onMint }}>{d}</span>
              {evs.length > 1 && <span style={{ position: 'absolute', right: 4, bottom: 4, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 6, background: GRAD.mint, color: T.onMint, fontFamily: FONT.sans, fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+{evs.length - 1}</span>}
            </button>
          );
        })}
      </div>

      {/* What's on the chosen night */}
      {sel && selDate && list.length > 0 && (
        <div key={sel} style={{ marginTop: 30, animation: 'mgIn 260ms cubic-bezier(0.22,1,0.36,1)' }}>
          <style>{'@keyframes mgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}'}</style>
          <p style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em', color: T.white }}>{DAYS[selDate.getDay()]} {selDate.getDate()} {MONTHS[selDate.getMonth()]}</span>
            <span style={{ fontFamily: FONT.sans, fontSize: 13, fontWeight: 700, color: T.mintText }}>{until(sel)}</span>
          </p>
          <div style={{ marginTop: 14, display: 'grid', gap: 18 }}>
            {list.map((e) => (
              <div key={e.slug} style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
                <Link href={`/events/${e.slug}`} style={{ flexShrink: 0, width: 104, aspectRatio: '4 / 5', borderRadius: 16, overflow: 'hidden', background: GRAD.card, boxShadow: '0 14px 30px -12px rgba(0,0,0,0.8)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {flyer(e, 360) && <img src={flyer(e, 360)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                </Link>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Link href={`/events/${e.slug}`} style={{ textDecoration: 'none' }}>
                    <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 19, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em', color: T.white }}>{listTitle(e.title)}</span>
                  </Link>
                  <span style={{ display: 'block', marginTop: 6, fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>{e.time && !/tba/i.test(e.time) ? e.time : 'Time to be announced'}</span>
                  {e.venue && <span style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, fontFamily: FONT.sans, fontSize: 13.5, color: T.text3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}><MapPin size={13} style={{ flexShrink: 0 }} />{e.venue}</span>}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
                    <Link href={`/events/${e.slug}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 700, color: T.mintText, textDecoration: 'none' }}>See the event <ArrowRight size={14} /></Link>
                    {onRemove && <button type="button" onClick={() => onRemove(e)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: T.text3 }}><X size={13} />Remove</button>}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {onAddDay && sel >= today && (
            <button type="button" onClick={() => onAddDay(sel)} style={{ marginTop: 18, height: 42, padding: '0 14px', borderRadius: 13, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: T.white, fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Plus size={15} />Add another show this night
            </button>
          )}
        </div>
      )}
      </>)}
    </div>
  );
}
