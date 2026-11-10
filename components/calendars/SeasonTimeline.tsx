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
 * A calendar as a season: each night a ticket stub on a mint rail, grouped by month,
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

  // Group by month, keeping date order
  const months: { label: string; list: GridEvent[] }[] = [];
  events.forEach((e) => {
    const d = parseDay(e.date);
    const label = d ? `${MONTH[d.getMonth()]} ${d.getFullYear()}` : 'Dates to come';
    const last = months[months.length - 1];
    if (last?.label === label) last.list.push(e); else months.push({ label, list: [e] });
  });

  let n = 0;
  return (
    <div style={{ position: 'relative', paddingLeft: 30 }}>
      {/* The rail */}
      <span aria-hidden style={{ position: 'absolute', left: 9, top: 8, bottom: onAdd ? 40 : 18, width: 3, borderRadius: 2, background: 'linear-gradient(180deg, #7BE3A8 0%, rgba(123,227,168,0.35) 70%, rgba(123,227,168,0.08) 100%)' }} />

      {months.map((m) => (
        <section key={m.label} aria-label={m.label} style={{ marginBottom: 10 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: 34, marginBottom: 8 }}>
            <span aria-hidden style={{ position: 'absolute', left: -27, width: 15, height: 15, borderRadius: 999, background: GRAD.mint, boxShadow: '0 0 0 5px rgba(123,227,168,0.16)' }} />
            <span style={{ fontFamily: FONT.display, fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.mintText }}>{m.label}</span>
          </div>

          {m.list.map((e) => {
            const d = parseDay(e.date);
            const past = e.date < today, next = e.slug === nextSlug;
            const g = going[e.slug];
            const flyer = e.image_url ? hiRes(e.image_url, 240) ?? e.image_url : null;
            const i = n++;
            return (
              <div key={e.slug} className="ak-rise" style={{ position: 'relative', marginBottom: 12, animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                {/* node on the rail */}
                <span aria-hidden style={{ position: 'absolute', left: -25, top: '50%', marginTop: -6, width: 11, height: 11, borderRadius: 999, background: past ? 'rgba(255,255,255,0.18)' : '#0A110D', border: past ? 'none' : `3px solid ${T.mint}`, boxShadow: next ? '0 0 14px rgba(123,227,168,0.9)' : 'none' }} />
                <button type="button" onClick={() => setPop(e.date.slice(0, 10))} aria-label={`${e.title}, ${d ? `${WD[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}` : e.date}`}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 0, padding: 0, border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 22, overflow: 'hidden',
                    background: next ? 'linear-gradient(120deg, rgba(55,120,85,0.5), rgba(14,24,19,0.95) 60%)' : 'linear-gradient(120deg, rgba(40,72,55,0.32), rgba(13,20,16,0.92) 58%)',
                    boxShadow: next ? `inset 0 0 0 1.5px rgba(123,227,168,0.55), 0 14px 40px -18px rgba(91,217,154,0.55)` : 'inset 0 0 0 1px rgba(123,227,168,0.1), 0 14px 34px -20px rgba(0,0,0,0.8)',
                    opacity: past ? 0.5 : 1, transition: 'transform 160ms ease',
                  }}>
                  {/* date */}
                  <span style={{ width: 66, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0' }}>
                    <span style={{ fontFamily: FONT.display, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.16em', background: GRAD.mint, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{d ? MON[d.getMonth()] : ''}</span>
                    <span style={{ fontFamily: FONT.display, fontSize: 32, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, color: T.white }}>{d ? d.getDate() : '?'}</span>
                    <span style={{ marginTop: 2, fontFamily: FONT.sans, fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: T.text3 }}>{d ? WD[d.getDay()] : ''}</span>
                  </span>
                  <span aria-hidden style={{ alignSelf: 'stretch', margin: '12px 0', borderLeft: '2px dashed rgba(255,255,255,0.13)' }} />
                  {/* what and who */}
                  <span style={{ flex: 1, minWidth: 0, padding: '12px 10px 12px 14px' }}>
                    {(next || past) && (
                      <span style={{ display: 'inline-block', marginBottom: 5, padding: '2px 8px', borderRadius: 999, fontFamily: FONT.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.02em', background: next ? GRAD.mint : 'rgba(255,255,255,0.08)', color: next ? T.onMint : T.text3 }}>{next ? until(e.date) : 'Been'}</span>
                    )}
                    <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 16.5, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15, color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{listTitle(e.title)}</span>
                    <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 12.5, color: T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[e.time && !/tba/i.test(e.time) ? e.time : null, e.venue && !/to be announced|tba/i.test(e.venue) ? e.venue : null].filter(Boolean).join(' · ') || 'Details soon'}</span>
                    <span style={{ display: 'flex', alignItems: 'center', marginTop: 8, minHeight: 24 }}>
                      {g?.faces.map((f, j) => (
                        f.avatar
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img key={f.id} src={f.avatar} alt="" style={{ width: 24, height: 24, borderRadius: 999, objectFit: 'cover', marginLeft: j ? -7 : 0, border: '2px solid #0E1612' }} />
                          : <span key={f.id} aria-hidden style={{ width: 24, height: 24, borderRadius: 999, marginLeft: j ? -7 : 0, border: '2px solid #0E1612', background: FACE_BG[j % 4], display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.display, fontSize: 11, fontWeight: 800, color: '#08120C' }}>{f.name.charAt(0).toUpperCase()}</span>
                      ))}
                      <span style={{ marginLeft: g?.faces.length ? 8 : 0, fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 700, color: g?.n ? T.mintText : T.text3 }}>
                        {g?.n ? `${g.n} going` : past ? '' : 'Be the first to go'}
                      </span>
                    </span>
                  </span>
                  {/* flyer */}
                  <span style={{ width: 62, height: 78, marginRight: 12, flexShrink: 0, borderRadius: 12, overflow: 'hidden', background: GRAD.card, boxShadow: '0 8px 18px -6px rgba(0,0,0,0.6)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {flyer && <img src={flyer} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                  </span>
                </button>
              </div>
            );
          })}
        </section>
      ))}

      {onAdd && (
        <div style={{ position: 'relative' }}>
          <span aria-hidden style={{ position: 'absolute', left: -25, top: '50%', marginTop: -6, width: 11, height: 11, borderRadius: 999, border: '2px dashed rgba(123,227,168,0.6)' }} />
          <button type="button" onClick={onAdd} style={{ width: '100%', height: 58, borderRadius: 20, border: '1.5px dashed rgba(123,227,168,0.3)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', color: T.mintText, fontFamily: FONT.sans, fontSize: 14.5, fontWeight: 700 }}>
            <Plus size={18} strokeWidth={2.4} /> Add a night
          </button>
        </div>
      )}

      {pop && (
        <FlyerPop day={pop} events={events.filter((e) => e.date.slice(0, 10) === pop)} onClose={() => setPop(null)}
          onRemove={onRemove ? (e) => { onRemove(e); setPop(null); } : undefined} />
      )}
    </div>
  );
}
