'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';
import Countdown, { startsAt } from '@/components/events/Countdown';
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
 * A calendar as your wallet of nights out: the next one is a full pass with a live countdown,
 * the rest are passes stacked underneath, each tinted by its own flyer; tap one to open it.
 * Nights gone by become a row of flyers at the end.
 * (old note:
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


  const upcoming = events.filter((e) => e.date >= today);
  const been = events.filter((e) => e.date < today).reverse();
  const [open, setOpen] = useState<string | null>(null);
  const openSlug = open ?? nextSlug ?? null;

  const where = (e: GridEvent) => [e.time && !/tba/i.test(e.time) ? e.time : null, e.venue && !/to be announced|tba/i.test(e.venue) ? e.venue : null].filter(Boolean).join(' · ') || 'Details soon';
  const flyerOf = (e: GridEvent, w = 600) => (e.image_url ? hiRes(e.image_url, w) ?? e.image_url : null);
  const Faces = ({ slug, size = 22 }: { slug: string; size?: number }) => {
    const g = going[slug];
    if (!g?.n) return null;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        {g.faces.map((f, j) => f.avatar
          // eslint-disable-next-line @next/next/no-img-element
          ? <img key={f.id} src={f.avatar} alt="" style={{ width: size, height: size, borderRadius: 999, objectFit: 'cover', marginLeft: j ? -7 : 0, border: '2px solid rgba(10,16,13,0.9)' }} />
          : <span key={f.id} aria-hidden style={{ width: size, height: size, borderRadius: 999, marginLeft: j ? -7 : 0, border: '2px solid rgba(10,16,13,0.9)', background: FACE_BG[j % 4], display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.display, fontSize: size * 0.46, fontWeight: 800, color: '#08120C' }}>{f.name.charAt(0).toUpperCase()}</span>)}
        <span style={{ marginLeft: 7, fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 700, color: T.mintText }}>{g.n} going</span>
      </span>
    );
  };
  // The flyer, blurred, as each pass's own colour
  const Tint = ({ e, strong = false }: { e: GridEvent; strong?: boolean }) => {
    const f = flyerOf(e, 200);
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {f && <img src={f} alt="" aria-hidden style={{ position: 'absolute', inset: '-30%', width: '160%', height: '160%', objectFit: 'cover', filter: `blur(${strong ? 46 : 34}px) saturate(1.4)`, opacity: strong ? 0.75 : 0.6, pointerEvents: 'none' }} />}
        <span aria-hidden style={{ position: 'absolute', inset: 0, background: strong ? 'linear-gradient(180deg, rgba(6,10,8,0.35) 0%, rgba(6,10,8,0.72) 55%, rgba(6,10,8,0.9) 100%)' : 'linear-gradient(90deg, rgba(6,10,8,0.55), rgba(6,10,8,0.82))', pointerEvents: 'none' }} />
      </>
    );
  };

  return (
    <div>
      {upcoming.length > 0 && (() => {
        const e = upcoming.find((x) => x.slug === openSlug) ?? upcoming[0];
        const d = parseDay(e.date);
        const isNext = e.slug === nextSlug;
        const at = startsAt(e.date, e.time);
        const dateLine = d ? `${WD[d.getDay()].charAt(0) + WD[d.getDay()].slice(1).toLowerCase()} ${d.getDate()} ${MONTH[d.getMonth()]}` : e.date;
        const rest = upcoming.filter((x) => x.slug !== e.slug);
        return (
          <>
            <div id="pass-open" key={e.slug}>
                    <article className="ak-fade" style={{ position: 'relative', borderRadius: 30, overflow: 'hidden', background: '#0A100D', boxShadow: '0 -10px 30px -12px rgba(0,0,0,0.6), 0 30px 60px -30px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(255,255,255,0.08)' }}>
                      <Tint e={e} strong />
                      <div style={{ position: 'relative', padding: '18px 18px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <span style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.mintText }}>{isNext ? 'Up next' : 'You’re going'}</span>
                          <span style={{ padding: '5px 11px', borderRadius: 999, background: 'rgba(255,255,255,0.1)', fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 700, color: T.white }}>{until(e.date)}</span>
                        </div>
                        {/* the whole flyer, never cropped */}
                        <button type="button" onClick={() => setPop(e.date.slice(0, 10))} aria-label={`See the ${e.title} flyer`} style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: 14, padding: 0, border: 'none', background: 'none', cursor: 'zoom-in' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {flyerOf(e) && <img src={flyerOf(e)!} alt="" style={{ display: 'block', maxWidth: '100%', maxHeight: 'min(62vw, 340px)', borderRadius: 16, boxShadow: '0 24px 50px -18px rgba(0,0,0,0.85)' }} />}
                        </button>
                        <h3 style={{ margin: '18px 0 0', fontFamily: FONT.display, fontSize: 'clamp(24px, 7vw, 30px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.05, background: GRAD.text, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{listTitle(e.title)}</h3>
                        <p style={{ margin: '6px 0 0', fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>{dateLine} · {where(e)}</p>
                        {at && <div style={{ marginTop: 16 }}><Countdown at={at} compact /></div>}
                      </div>
                      {/* perforation */}
                      <div aria-hidden style={{ position: 'relative', height: 26, marginTop: 16 }}>
                        <span style={{ position: 'absolute', left: -13, top: 0, width: 26, height: 26, borderRadius: 999, background: '#070B09' }} />
                        <span style={{ position: 'absolute', right: -13, top: 0, width: 26, height: 26, borderRadius: 999, background: '#070B09' }} />
                        <span style={{ position: 'absolute', left: 22, right: 22, top: 12, borderTop: '2px dashed rgba(255,255,255,0.16)' }} />
                      </div>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '4px 18px 18px' }}>
                        <span style={{ minWidth: 0 }}>{going[e.slug]?.n ? <Faces slug={e.slug} /> : <span style={{ fontFamily: FONT.sans, fontSize: 13, color: T.text3 }}>Tell your people</span>}</span>
                        <Link href={`/events/${e.slug}`} style={{ flexShrink: 0, height: 40, padding: '0 16px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6, background: GRAD.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                          See the event <ArrowRight size={15} />
                        </Link>
                      </div>
                    </article>
            </div>

            {/* The rest: just the flyers, each with its date and how far away it is */}
            {rest.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(30%, 150px), 1fr))', gap: 10, marginTop: 22 }}>
                {rest.map((x, j) => {
                  const xd = parseDay(x.date);
                  const f = flyerOf(x, 360);
                  return (
                    <button key={x.slug} type="button" className="ak-rise" aria-label={`${x.title}, ${xd ? `${xd.getDate()} ${MONTH[xd.getMonth()]}` : x.date}`}
                      onClick={() => { setOpen(x.slug); requestAnimationFrame(() => document.getElementById('pass-open')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }}
                      style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', animationDelay: `${Math.min(j, 9) * 40}ms` }}>
                      <span style={{ position: 'relative', display: 'block', aspectRatio: '4 / 5', borderRadius: 16, overflow: 'hidden', background: GRAD.card, boxShadow: '0 16px 30px -18px rgba(0,0,0,0.9)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {f && <img src={f} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6, marginTop: 8, padding: '0 2px' }}>
                        <span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                          <span style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 800, letterSpacing: '-0.04em', color: T.white }}>{xd ? xd.getDate() : '?'}</span>
                          <span style={{ fontFamily: FONT.sans, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.1em', color: T.mintText }}>{xd ? MON[xd.getMonth()] : ''}</span>
                        </span>
                        <span style={{ fontFamily: FONT.sans, fontSize: 11.5, fontWeight: 600, color: T.text3, whiteSpace: 'nowrap' }}>{until(x.date)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        );
      })()}

      {onAdd && (
        <button type="button" onClick={onAdd} style={{ marginTop: 16, height: 44, padding: '0 16px', borderRadius: 999, border: 'none', background: 'rgba(123,227,168,0.1)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, color: T.mintText, fontFamily: FONT.sans, fontSize: 14, fontWeight: 700 }}>
          <Plus size={17} strokeWidth={2.4} /> Add a night
        </button>
      )}

      {/* Nights gone by: a quiet row of flyers */}
      {been.length > 0 && (
        <section aria-label="Been" style={{ marginTop: 34 }}>
          <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.text3 }}>Been · {been.length} {been.length === 1 ? 'night' : 'nights'}</p>
          <div className="no-scrollbar" style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '12px -20px 0', padding: '0 20px' }}>
            {been.map((e) => (
              <button key={e.slug} type="button" onClick={() => setPop(e.date.slice(0, 10))} aria-label={e.title} style={{ flexShrink: 0, width: 84, padding: 0, border: 'none', background: 'none', cursor: 'pointer', opacity: 0.7 }}>
                <span style={{ display: 'block', width: 84, height: 105, borderRadius: 14, overflow: 'hidden', background: GRAD.card }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {flyerOf(e, 200) && <img src={flyerOf(e, 200)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.4)' }} />}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {pop && (
        <FlyerPop day={pop} events={events.filter((e) => e.date.slice(0, 10) === pop)} onClose={() => setPop(null)}
          onRemove={onRemove ? (e) => { onRemove(e); setPop(null); } : undefined} />
      )}
    </div>
  );
}
