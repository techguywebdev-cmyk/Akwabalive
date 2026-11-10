'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { FlyerPop, type GridEvent } from '@/components/calendars/MonthGrid';
import { parseDay } from '@/lib/dates';
import { hiRes } from '@/lib/events/image';
import { listTitle } from '@/lib/titles';
import { T, FONT, GRAD } from '@/lib/thiscene';

type Face = { id: string; name: string; avatar: string | null };
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WD = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const FACE_BG = ['linear-gradient(135deg,#F7B267,#E0703A)', 'linear-gradient(135deg,#B8F3D2,#4FD192)', 'linear-gradient(135deg,#A9C8FF,#5A7BEA)', 'linear-gradient(135deg,#F4A8D8,#C057A0)'];
const todayIso = () => new Date().toISOString().slice(0, 10);

/** "In 5 days", "Tomorrow", "Tonight" */
function until(date: string) {
  const d = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${todayIso()}T12:00:00Z`)) / 864e5);
  if (d === 0) return 'Tonight';
  if (d === 1) return 'Tomorrow';
  if (d < 14) return `In ${d} days`;
  return `In ${Math.round(d / 7)} weeks`;
}

/**
 * A calendar as a season: nights grouped by month, the date once on the left like a diary,
 * with who's going. The next night glows with a countdown; nights gone by fade back.
 * Tap a stub for the flyer pop-up.
 */
export default function SeasonTimeline({ events, onRemove, onAdd }: { events: GridEvent[]; onRemove?: (e: GridEvent) => void; onAdd?: () => void }) {
  const db = useMemo(() => createClient(), []);
  const [going, setGoing] = useState<Record<string, { n: number; faces: Face[] }>>({});
  const [pop, setPop] = useState<string | null>(null);
  const today = todayIso();
  const nextSlug = events.find((e) => e.date >= today)?.slug;

  // Who's going to each night: a count and up to three faces
  const key = events.map((e) => e.slug).join(',');
  useEffect(() => {
    if (!events.length) return;
    let live = true;
    (async () => {
      const { data } = await db.from('event_attendance').select('user_id, event_slug').eq('status', 'going').eq('is_public', true).in('event_slug', events.map((e) => e.slug)).limit(2000);
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


  // Group by month, then by day: nights on the same date share one date
  const months: { label: string; count: number; days: { date: string; list: GridEvent[] }[] }[] = [];
  events.forEach((e) => {
    const d = parseDay(e.date);
    const label = d ? MONTH[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : '') : 'Dates to come';
    let m = months[months.length - 1];
    if (m?.label !== label) { m = { label, count: 0, days: [] }; months.push(m); }
    m.count++;
    const day = m.days[m.days.length - 1];
    if (day?.date === e.date.slice(0, 10)) day.list.push(e); else m.days.push({ date: e.date.slice(0, 10), list: [e] });
  });

  let n = 0;
  return (
    <div>
      {months.map((m, mi) => (
        <section key={m.label} aria-label={m.label} style={{ marginTop: mi ? 30 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontFamily: FONT.display, fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', background: GRAD.text, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{m.label}</h3>
            <span style={{ fontFamily: FONT.sans, fontSize: 13, color: T.text3 }}>{m.count} {m.count === 1 ? 'night' : 'nights'}</span>
          </div>

          {m.days.map((day) => {
            const d = parseDay(day.date);
            const past = day.date < today;
            return (
              <div key={day.date} style={{ display: 'flex', gap: 14, marginBottom: 10, opacity: past ? 0.5 : 1 }}>
                {/* the date, once per day */}
                <div style={{ width: 44, flexShrink: 0, paddingTop: 12, textAlign: 'center' }}>
                  <div style={{ fontFamily: FONT.display, fontSize: 26, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, color: T.white }}>{d ? d.getDate() : '?'}</div>
                  <div style={{ marginTop: 4, fontFamily: FONT.sans, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: T.text3 }}>{d ? WD[d.getDay()] : ''}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {day.list.map((e) => {
                    const next = e.slug === nextSlug;
                    const g = going[e.slug];
                    const flyer = e.image_url ? hiRes(e.image_url, 240) ?? e.image_url : null;
                    const where = [e.time && !/tba/i.test(e.time) ? e.time : null, e.venue && !/to be announced|tba/i.test(e.venue) ? e.venue : null].filter(Boolean).join(' · ') || 'Details soon';
                    const i = n++;
                    return (
                      <button key={e.slug} type="button" className="ak-rise" onClick={() => setPop(day.date)} aria-label={`${e.title}, ${d ? `${WD[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}` : e.date}`}
                        style={{
                          animationDelay: `${Math.min(i, 8) * 50}ms`, width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: 10, border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 20,
                          background: next ? 'linear-gradient(120deg, rgba(123,227,168,0.16), rgba(123,227,168,0.05))' : 'rgba(255,255,255,0.045)',
                          boxShadow: next ? 'inset 0 0 0 1px rgba(123,227,168,0.35)' : 'none',
                        }}>
                        <span style={{ width: 52, height: 65, flexShrink: 0, borderRadius: 12, overflow: 'hidden', background: GRAD.card }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {flyer && <img src={flyer} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2, color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{listTitle(e.title)}</span>
                          <span style={{ display: 'block', marginTop: 3, fontFamily: FONT.sans, fontSize: 12.5, color: T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{where}</span>
                          {(next || g?.n) ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
                              {next && <span style={{ padding: '2px 8px', borderRadius: 999, fontFamily: FONT.sans, fontSize: 11, fontWeight: 800, background: GRAD.mint, color: T.onMint }}>{until(e.date)}</span>}
                              {g?.n ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                  {g.faces.map((f, j) => (
                                    f.avatar
                                      // eslint-disable-next-line @next/next/no-img-element
                                      ? <img key={f.id} src={f.avatar} alt="" style={{ width: 20, height: 20, borderRadius: 999, objectFit: 'cover', marginLeft: j ? -6 : 0, border: '2px solid #0E1612' }} />
                                      : <span key={f.id} aria-hidden style={{ width: 20, height: 20, borderRadius: 999, marginLeft: j ? -6 : 0, border: '2px solid #0E1612', background: FACE_BG[j % 4], display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.display, fontSize: 9.5, fontWeight: 800, color: '#08120C' }}>{f.name.charAt(0).toUpperCase()}</span>
                                  ))}
                                  <span style={{ marginLeft: 6, fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, color: T.mintText }}>{g.n} going</span>
                                </span>
                              ) : null}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      ))}

      {onAdd && (
        <button type="button" onClick={onAdd} style={{ marginTop: 14, marginLeft: 58, height: 44, padding: '0 16px', borderRadius: 999, border: 'none', background: 'rgba(123,227,168,0.1)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, color: T.mintText, fontFamily: FONT.sans, fontSize: 14, fontWeight: 700 }}>
          <Plus size={17} strokeWidth={2.4} /> Add a night
        </button>
      )}

      {pop && (
        <FlyerPop day={pop} events={events.filter((e) => e.date.slice(0, 10) === pop)} onClose={() => setPop(null)}
          onRemove={onRemove ? (e) => { onRemove(e); setPop(null); } : undefined} />
      )}
    </div>
  );
}
