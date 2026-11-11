'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Countdown, { startsAt } from '@/components/events/Countdown';
import { FlyerPop, type GridEvent } from '@/components/calendars/MonthGrid';
import { hiRes } from '@/lib/events/image';
import { listTitle } from '@/lib/titles';
import { T, FONT, GRAD } from '@/lib/thiscene';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FACE_BG = ['linear-gradient(135deg,#F7B267,#E0703A)', 'linear-gradient(135deg,#B8F3D2,#4FD192)', 'linear-gradient(135deg,#A9C8FF,#5A7BEA)', 'linear-gradient(135deg,#F4A8D8,#C057A0)'];
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const todayIso = () => { const d = new Date(); return iso(d.getFullYear(), d.getMonth(), d.getDate()); };
const flyer = (e: GridEvent, w: number) => (e.image_url ? hiRes(e.image_url, w) ?? e.image_url : null);
const gradText: React.CSSProperties = { background: GRAD.text, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' };

function until(day: string) {
  const n = Math.round((Date.parse(`${day}T12:00:00Z`) - Date.parse(`${todayIso()}T12:00:00Z`)) / 864e5);
  if (n < 0) return 'Been';
  if (n === 0) return 'Tonight';
  if (n === 1) return 'Tomorrow';
  if (n < 14) return `In ${n} days`;
  return `In ${Math.round(n / 7)} weeks`;
}

type Face = { id: string; name: string; avatar: string | null };
/** Who's going to each night: a count and up to three faces */
function useGoing(slugs: string[]) {
  const db = useMemo(() => createClient(), []);
  const [going, setGoing] = useState<Record<string, { n: number; faces: Face[] }>>({});
  const key = slugs.join(',');
  useEffect(() => {
    if (!slugs.length) return;
    let live = true;
    (async () => {
      const { data } = await db.from('event_attendance').select('user_id, event_slug').eq('status', 'going').eq('is_public', true).in('event_slug', slugs.slice(0, 200)).limit(2000);
      const rows = (data ?? []) as { user_id: string; event_slug: string }[];
      const ids = Array.from(new Set(rows.map((r) => r.user_id))).slice(0, 300);
      const { data: ps } = ids.length ? await db.from('profiles').select('id, username, full_name, avatar_url').in('id', ids) : { data: [] };
      const byId = new Map(((ps ?? []) as { id: string; username: string | null; full_name: string | null; avatar_url: string | null }[]).map((p) => [p.id, p]));
      const out: Record<string, { n: number; faces: Face[] }> = {};
      rows.forEach((r) => {
        const g = (out[r.event_slug] ??= { n: 0, faces: [] });
        g.n++;
        const p = byId.get(r.user_id);
        if (p && g.faces.length < 3) g.faces.push({ id: p.id, name: p.full_name || p.username || '?', avatar: p.avatar_url });
      });
      if (live) setGoing(out);
    })();
    return () => { live = false; };
  }, [key, db]); // eslint-disable-line react-hooks/exhaustive-deps
  return going;
}

/**
 * A real month calendar: the month in big type, a full grid of dates, and each night out wearing its flyer.
 * Tap a date and that night opens underneath with its countdown, who's going and the way in.
 */
export default function MonthView({ events, onRemove, onFindDay, tagOf, eyebrow, action }: {
  /** A small line above the month, and something to sit beside it (the calendars page) */
  eyebrow?: string; action?: React.ReactNode;
  events: GridEvent[];
  onRemove?: (e: GridEvent) => void;
  /** Owner: find a show for this date */
  onFindDay?: (iso: string) => void;
  /** Which calendar a night is on (the calendars page shows all of yours together) */
  tagOf?: (slug: string) => { title: string; href: string } | null;
}) {
  const today = todayIso();
  const byDay = useMemo(() => {
    const m: Record<string, GridEvent[]> = {};
    for (const e of events) (m[e.date.slice(0, 10)] ??= []).push(e);
    return m;
  }, [events]);
  const days = useMemo(() => Object.keys(byDay).sort(), [byDay]);
  const going = useGoing(useMemo(() => events.map((e) => e.slug), [events]));

  // Months from this month (or the first night) to the last night
  const months = useMemo(() => {
    const now = new Date();
    const first = days[0] && days[0] < today ? days[0] : today;
    const a = [+first.slice(0, 4), +first.slice(5, 7) - 1];
    const last = days.length && days[days.length - 1] > today ? days[days.length - 1] : iso(now.getFullYear(), now.getMonth(), 1);
    const b = [+last.slice(0, 4), +last.slice(5, 7) - 1];
    const out: { y: number; m: number; n: number }[] = [];
    for (let y = a[0], m = a[1]; y < b[0] || (y === b[0] && m <= b[1]); m === 11 ? (y++, m = 0) : m++) {
      const k = `${y}-${String(m + 1).padStart(2, '0')}`;
      out.push({ y, m, n: days.filter((d) => d.startsWith(k)).length });
    }
    return out;
  }, [days, today]);

  // Opens on the next night out
  const upcoming = days.find((d) => d >= today) ?? null;
  const [sel, setSel] = useState<string>(upcoming ?? today);
  const [ym, setYm] = useState<string>((upcoming ?? today).slice(0, 7));
  useEffect(() => { if (upcoming) { setSel(upcoming); setYm(upcoming.slice(0, 7)); } }, [upcoming]);
  const [pop, setPop] = useState(false);

  const y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1;
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const len = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: len }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  // Whole weeks, minus the ones already gone by with nothing saved in them
  const weeks = Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7)).filter((row) => {
    const ds = row.filter((d): d is number => d != null);
    return iso(y, m, ds[ds.length - 1]) >= today || ds.some((d) => byDay[iso(y, m, d)]);
  });

  const selEvents = byDay[sel] ?? [];
  const sd = new Date(`${sel}T12:00:00`);
  const pickMonth = (yy: number, mm: number) => {
    const k = `${yy}-${String(mm + 1).padStart(2, '0')}`;
    setYm(k);
    setSel(days.find((d) => d.startsWith(k) && d >= today) ?? days.find((d) => d.startsWith(k)) ?? (today.startsWith(k) ? today : `${k}-01`));
  };

  return (
    <div>
      {/* The month */}
      {eyebrow && <p style={{ margin: '0 0 10px', fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.mintText }}>{eyebrow}</p>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
        <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 'clamp(34px, 10vw, 48px)', fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1, paddingBottom: '0.08em', ...gradText }}>{MONTHS[m]}</h2>
        <span style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 700, color: T.text3 }}>{y}</span>
      </div>
      {action}
      </div>
      {months.length > 1 && (
        <div className="no-scrollbar" role="tablist" aria-label="Month" style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: '12px -20px 0', padding: '0 20px' }}>
          {months.map((x) => {
            const on = x.y === y && x.m === m;
            return (
              <button key={`${x.y}-${x.m}`} type="button" role="tab" aria-selected={on} onClick={() => pickMonth(x.y, x.m)}
                style={{ flexShrink: 0, height: 34, padding: '0 13px', borderRadius: 999, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 700, background: on ? 'rgba(123,227,168,0.16)' : 'rgba(255,255,255,0.05)', color: on ? T.mintText : T.text2 }}>
                {MONTHS[x.m].slice(0, 3)}
                {x.n > 0 && <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, background: on ? GRAD.mint : 'rgba(255,255,255,0.1)', color: on ? T.onMint : T.text2 }}>{x.n}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* The grid: weeks gone by drop away, quiet weeks stay slim, weeks with a night out get room for the flyer */}
      <div key={ym} className="ak-fade" style={{ marginTop: 16, padding: '14px 10px 10px', borderRadius: 26, background: 'linear-gradient(180deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.025) 100%)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6, paddingBottom: 8 }}>
          {WEEK.map((w, i) => <span key={w} style={{ textAlign: 'center', fontFamily: FONT.sans, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: i >= 5 ? 'rgba(168,240,198,0.75)' : T.text3 }}>{w}</span>)}
        </div>
        {weeks.map((row, r) => {
          const busy = row.some((d) => d != null && byDay[iso(y, m, d)]);
          return (
            <div key={r} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6, marginTop: r ? 6 : 0, alignItems: 'center' }}>
              {row.map((d, i) => {
                if (d == null) return <span key={i} />;
                const k = iso(y, m, d);
                const list = byDay[k];
                const on = k === sel, isToday = k === today, past = k < today;
                if (!list) {
                  return (
                    <button key={i} type="button" onClick={() => setSel(k)} aria-label={`${d} ${MONTHS[m]}`} aria-pressed={on}
                      style={{ height: busy ? '100%' : 38, minHeight: 38, padding: 0, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ width: 34, height: 34, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.display, fontSize: 14.5, fontWeight: 700, background: isToday ? GRAD.mint : on ? 'rgba(123,227,168,0.16)' : 'transparent', color: isToday ? T.onMint : on ? T.mintText : past ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.62)' }}>{d}</span>
                    </button>
                  );
                }
                const f = flyer(list[0], 200);
                return (
                  <button key={i} type="button" onClick={() => setSel(k)} aria-label={`${d} ${MONTHS[m]}: ${list.map((e) => e.title).join(', ')}`} aria-pressed={on}
                    style={{ position: 'relative', aspectRatio: '4 / 5', padding: 0, borderRadius: 11, border: 'none', cursor: 'pointer', overflow: 'hidden', background: GRAD.card, opacity: past ? 0.45 : 1, transform: on ? 'scale(1.1)' : 'none', zIndex: on ? 2 : 1, transition: 'transform 180ms cubic-bezier(0.22,1,0.36,1)', boxShadow: on ? '0 0 0 2px #7BE3A8, 0 12px 24px -8px rgba(91,217,154,0.6)' : '0 8px 16px -8px rgba(0,0,0,0.8)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {f && <img src={f} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                    <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(4,8,6,0) 45%, rgba(4,8,6,0.85) 100%)' }} />
                    <span style={{ position: 'absolute', left: 0, right: 0, bottom: 3, textAlign: 'center', fontFamily: FONT.display, fontSize: 13, fontWeight: 800, color: '#fff' }}>{d}</span>
                    {list.length > 1 && <span style={{ position: 'absolute', right: 3, top: 3, minWidth: 17, height: 17, padding: '0 4px', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: GRAD.mint, color: T.onMint, fontFamily: FONT.sans, fontSize: 10.5, fontWeight: 800 }}>{list.length}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* The chosen night */}
      <section key={sel} className="ak-rise" aria-label={`${DAYS[sd.getDay()]} ${sd.getDate()} ${MONTHS[sd.getMonth()]}`} style={{ marginTop: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h3 style={{ margin: 0, fontFamily: FONT.display, fontSize: 19, fontWeight: 800, letterSpacing: '-0.025em', color: T.white }}>{DAYS[sd.getDay()]} {sd.getDate()} {MONTHS[sd.getMonth()]}</h3>
          {selEvents.length > 0 && <span style={{ padding: '4px 11px', borderRadius: 999, background: sel >= today ? 'rgba(123,227,168,0.14)' : 'rgba(255,255,255,0.07)', color: sel >= today ? T.mintText : T.text3, fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 700 }}>{until(sel)}</span>}
        </div>

        {selEvents.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12 }}>
            <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 14.5, color: T.text3 }}>{sel < today ? 'Nothing was saved for this night.' : 'A free night. Nothing saved yet.'}</p>
            {onFindDay && sel >= today && (
              <button type="button" onClick={() => onFindDay(sel)} style={{ flexShrink: 0, height: 40, padding: '0 15px', borderRadius: 999, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(123,227,168,0.12)', color: T.mintText, fontFamily: FONT.sans, fontSize: 14, fontWeight: 700 }}>
                <Plus size={16} strokeWidth={2.4} />Find a show
              </button>
            )}
          </div>
        ) : selEvents.map((e, i) => {
          const at = startsAt(e.date, e.time);
          const g = going[e.slug];
          const tag = tagOf?.(e.slug);
          const f = flyer(e, 400);
          const where = [e.time && !/tba/i.test(e.time) ? e.time : null, e.venue && !/to be announced|tba/i.test(e.venue) ? e.venue : null].filter(Boolean).join(' · ') || 'Details soon';
          return (
            <article key={e.slug} style={{ position: 'relative', marginTop: 12, borderRadius: 26, overflow: 'hidden', background: '#0A100D', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {f && <img src={f} alt="" aria-hidden style={{ position: 'absolute', inset: '-30%', width: '160%', height: '160%', objectFit: 'cover', filter: 'blur(44px) saturate(1.4)', opacity: 0.6, pointerEvents: 'none' }} />}
              <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(6,10,8,0.45) 0%, rgba(6,10,8,0.82) 60%, rgba(6,10,8,0.93) 100%)' }} />
              <div style={{ position: 'relative', padding: 16 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <button type="button" onClick={() => setPop(true)} aria-label={`See the ${e.title} flyer`} style={{ flexShrink: 0, width: 92, height: 115, padding: 0, border: 'none', borderRadius: 13, overflow: 'hidden', cursor: 'zoom-in', background: GRAD.card, boxShadow: '0 16px 30px -12px rgba(0,0,0,0.85)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {f && <img src={f} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                  </button>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 'clamp(20px, 5.8vw, 26px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.08, ...gradText }}>{listTitle(e.title)}</p>
                    <p style={{ margin: '5px 0 0', fontFamily: FONT.sans, fontSize: 13.5, lineHeight: 1.4, color: T.text2 }}>{where}</p>
                    {g?.n ? (
                      <span style={{ display: 'flex', alignItems: 'center', marginTop: 9 }}>
                        {g.faces.map((p, j) => p.avatar
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img key={p.id} src={p.avatar} alt="" style={{ width: 22, height: 22, borderRadius: 999, objectFit: 'cover', marginLeft: j ? -7 : 0, border: '2px solid rgba(10,16,13,0.9)' }} />
                          : <span key={p.id} aria-hidden style={{ width: 22, height: 22, borderRadius: 999, marginLeft: j ? -7 : 0, border: '2px solid rgba(10,16,13,0.9)', background: FACE_BG[j % 4], display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.display, fontSize: 10, fontWeight: 800, color: '#08120C' }}>{p.name.charAt(0).toUpperCase()}</span>)}
                        <span style={{ marginLeft: 7, fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 700, color: T.mintText }}>{g.n} going</span>
                      </span>
                    ) : null}
                  </div>
                </div>
                {i === 0 && at && sel >= today && <div style={{ marginTop: 14 }}><Countdown at={at} compact /></div>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14 }}>
                  <span style={{ minWidth: 0, fontFamily: FONT.sans, fontSize: 13, color: T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tag ? <>On <Link href={tag.href} style={{ color: T.white, fontWeight: 700, textDecoration: 'none' }}>{tag.title}</Link></>
                      : onRemove ? <button type="button" onClick={() => onRemove(e)} style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', color: T.text3, fontFamily: FONT.sans, fontSize: 13, fontWeight: 600 }}>Remove</button> : null}
                  </span>
                  <Link href={`/events/${e.slug}`} style={{ flexShrink: 0, height: 40, padding: '0 16px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6, background: GRAD.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>See the event <ArrowRight size={15} /></Link>
                </div>
              </div>
            </article>
          );
        })}
        {selEvents.length > 0 && onFindDay && sel >= today && (
          <button type="button" onClick={() => onFindDay(sel)} style={{ marginTop: 12, padding: 0, border: 'none', background: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, color: T.mintText, fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 700 }}>
            <Plus size={15} strokeWidth={2.4} />Add another for this night
          </button>
        )}
      </section>

      {pop && selEvents.length > 0 && <FlyerPop day={sel} events={selEvents} onClose={() => setPop(false)} onRemove={onRemove ? (e) => { onRemove(e); setPop(false); } : undefined} />}
    </div>
  );
}
