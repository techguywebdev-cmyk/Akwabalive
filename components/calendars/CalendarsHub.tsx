'use client';

import { useEffect, useMemo, useState } from 'react';
import { FlyerPop, type GridEvent } from '@/components/calendars/MonthGrid';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Globe, Heart, Lock, Plus, Star } from 'lucide-react';
import Countdown, { startsAt } from '@/components/events/Countdown';
import { parseDay, shortDay } from '@/lib/dates';
import { listTitle } from '@/lib/titles';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import FlyerWall from '@/components/ui/FlyerWall';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { CAL_SELECT, calendarStats, createCalendar, isCurated, ownerName, type Calendar, type CalendarStats } from '@/lib/calendars';
import { hiRes } from '@/lib/events/image';
import { T, FONT, GROUND, GRAD, BTN } from '@/lib/thiscene';

type Row = Calendar & { calendar_events: { event_slug: string }[] };
const gradText: React.CSSProperties = { background: GRAD.text, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' };
const eyebrow: React.CSSProperties = { margin: 0, fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.mintText };

type TileEvent = { date: string; img: string | null; ev: GridEvent };

function SectionHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 21, fontWeight: 800, letterSpacing: '-0.025em', color: T.white }}>{title}</h2>
      {hint && <p style={{ margin: '3px 0 0', fontFamily: FONT.sans, fontSize: 13.5, color: T.text3 }}>{hint}</p>}
    </div>
  );
}

const todayIso = () => new Date().toISOString().slice(0, 10);
/** "Tonight", "Tomorrow", "In 5 days", "In 6 weeks" */
function until(date: string) {
  const d = Math.round((Date.parse(`${date.slice(0, 10)}T12:00:00Z`) - Date.parse(`${todayIso()}T12:00:00Z`)) / 864e5);
  if (d <= 0) return 'Tonight';
  if (d === 1) return 'Tomorrow';
  if (d < 14) return `In ${d} days`;
  return `In ${Math.round(d / 7)} weeks`;
}

/**
 * A calendar as its own line-up: the name, then its saved nights in date order, each a flyer with its date
 * underneath. The next night's date is mint. Tap a flyer to pop it up; tap the name to open the calendar.
 */
function Tile({ c, evs, stats, onAdd, bare }: { c: Row; evs: TileEvent[]; stats?: CalendarStats; onAdd?: boolean; bare?: boolean }) {
  const today = todayIso();
  const sorted = [...evs].sort((x, y) => x.date.localeCompare(y.date));
  const up = sorted.filter((e) => e.date.slice(0, 10) >= today);
  const list = (up.length ? up : [...sorted].reverse()).slice(0, 8);
  const more = (up.length ? up.length : sorted.length) - list.length;
  const next = up[0];
  const n = c.calendar_events.length;
  const [pop, setPop] = useState<string | null>(null);
  const popEvents = pop ? evs.filter((e) => e.date.slice(0, 10) === pop).map((e) => e.ev) : [];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div>
      <Link href={`/c/${c.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {!c.is_public && <Lock size={13} color={T.text3} style={{ flexShrink: 0 }} aria-label="Private" />}
            <span style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 3, fontFamily: FONT.sans, fontSize: 13, color: T.text3 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {n} {n === 1 ? 'night' : 'nights'}{next ? <> · <span style={{ color: T.mintText, fontWeight: 700 }}>next {until(next.date).toLowerCase()}</span></> : ''}{onAdd ? '' : ` · ${isCurated(c.slug) ? 'Tsacoal' : ownerName(c)}`}
            </span>
            {!!stats?.likes && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }}><Heart size={11} />{stats.likes}</span>}
            {stats?.rating != null && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: T.mintText, flexShrink: 0 }}><Star size={11} fill="currentColor" strokeWidth={0} />{Number(stats.rating).toFixed(1)}</span>}
          </span>
        </span>
        <span aria-hidden style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', color: T.white }}><ArrowRight size={16} /></span>
      </Link>

      {!bare && <div className="ak-noscroll" style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '14px -20px 0', padding: '0 20px 2px' }}>
        {list.map((e) => {
          const d = parseDay(e.date);
          const isNext = e === next;
          return (
            <button key={e.ev.slug} type="button" onClick={() => setPop(e.date.slice(0, 10))} aria-label={`${e.ev.title}${d ? `, ${d.getDate()} ${MON[d.getMonth()]}` : ''}`}
              style={{ flexShrink: 0, width: 92, padding: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ display: 'block', width: 92, height: 115, borderRadius: 14, overflow: 'hidden', background: GRAD.card, boxShadow: isNext ? '0 0 0 2px #7BE3A8, 0 14px 28px -14px rgba(91,217,154,0.6)' : '0 12px 24px -14px rgba(0,0,0,0.8)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {e.img && <img src={e.img} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
              </span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 8 }}>
                <span style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em', color: isNext ? T.mintText : T.white }}>{d ? d.getDate() : '?'}</span>
                <span style={{ fontFamily: FONT.sans, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: isNext ? T.mintText : T.text3 }}>{d ? MON[d.getMonth()] : ''}</span>
              </span>
            </button>
          );
        })}
        {(more > 0 || onAdd || !list.length) && (
          <Link href={`/c/${c.slug}`} aria-label={more > 0 ? `${more} more nights` : 'Add a night'} style={{ flexShrink: 0, width: 92, height: 115, borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(123,227,168,0.08)', color: T.mintText, textDecoration: 'none', fontFamily: FONT.sans, fontSize: 13, fontWeight: 700 }}>
            {more > 0 ? `+${more} more` : <><Plus size={20} strokeWidth={2.4} />Add</>}
          </Link>
        )}
      </div>}
      {pop && popEvents.length > 0 && <FlyerPop day={pop} events={popEvents} onClose={() => setPop(null)} />}
    </div>
  );
}

/** The flyer, blurred, as the card's own colour */
function Tint({ img, strong = false }: { img: string | null | undefined; strong?: boolean }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {img && <img src={img} alt="" aria-hidden style={{ position: 'absolute', inset: '-30%', width: '160%', height: '160%', objectFit: 'cover', filter: 'blur(40px) saturate(1.4)', opacity: strong ? 0.75 : 0.6, pointerEvents: 'none' }} />}
      <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(6,10,8,0.3) 0%, rgba(6,10,8,0.7) 55%, rgba(6,10,8,0.92) 100%)', pointerEvents: 'none' }} />
    </>
  );
}

/** Your next night out, across all your calendars: a pass with the flyer and a live countdown */
function UpNext({ e, img, cal }: { e: GridEvent; img: string | null; cal: Row }) {
  const d = parseDay(e.date);
  const at = startsAt(e.date, e.time);
  const [pop, setPop] = useState(false);
  const where = [d ? shortDay(d) : null, e.time && !/tba/i.test(e.time) ? e.time : null, e.venue && !/to be announced|tba/i.test(e.venue) ? e.venue : null].filter(Boolean).join(' · ');
  return (
    <article className="ak-rise" style={{ position: 'relative', borderRadius: 30, overflow: 'hidden', background: '#0A100D', boxShadow: '0 30px 60px -30px rgba(0,0,0,0.95), inset 0 0 0 1px rgba(255,255,255,0.08)' }}>
      <Tint img={img} strong />
      <div style={{ position: 'relative', display: 'flex', gap: 16, alignItems: 'center', padding: '18px 18px 0' }}>
        <button type="button" onClick={() => setPop(true)} aria-label={`See the ${e.title} flyer`} style={{ flexShrink: 0, width: 104, height: 130, padding: 0, border: 'none', borderRadius: 14, overflow: 'hidden', cursor: 'zoom-in', background: GRAD.card, transform: 'rotate(-4deg)', boxShadow: '0 20px 40px -14px rgba(0,0,0,0.9)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {img && <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ ...eyebrow }}>Your next night out</p>
          <h2 style={{ margin: '7px 0 0', fontFamily: FONT.display, fontSize: 'clamp(22px, 6.4vw, 30px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.05, ...gradText }}>{listTitle(e.title)}</h2>
          <p style={{ margin: '6px 0 0', fontFamily: FONT.sans, fontSize: 13.5, lineHeight: 1.4, color: T.text2 }}>{where}</p>
        </div>
      </div>
      {at && <div style={{ position: 'relative', padding: '16px 18px 0' }}><Countdown at={at} compact /></div>}
      <div aria-hidden style={{ position: 'relative', height: 26, marginTop: 14 }}>
        <span style={{ position: 'absolute', left: -13, top: 0, width: 26, height: 26, borderRadius: 999, background: '#070B09' }} />
        <span style={{ position: 'absolute', right: -13, top: 0, width: 26, height: 26, borderRadius: 999, background: '#070B09' }} />
        <span style={{ position: 'absolute', left: 22, right: 22, top: 12, borderTop: '2px dashed rgba(255,255,255,0.16)' }} />
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '4px 18px 18px' }}>
        <Link href={`/c/${cal.slug}`} style={{ minWidth: 0, fontFamily: FONT.sans, fontSize: 13, color: T.text3, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>On <span style={{ color: T.white, fontWeight: 700 }}>{cal.title}</span></Link>
        <Link href={`/events/${e.slug}`} style={{ flexShrink: 0, height: 40, padding: '0 16px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6, background: GRAD.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>See the event <ArrowRight size={15} /></Link>
      </div>
      {pop && <FlyerPop day={e.date.slice(0, 10)} events={[e]} onClose={() => setPop(false)} />}
    </article>
  );
}

/** One of your calendars: a date tile for its next night, the name, and a few of its flyers */
function CalRow({ c, evs, stats }: { c: Row; evs: TileEvent[]; stats?: CalendarStats }) {
  const today = todayIso();
  const sorted = [...evs].sort((x, y) => x.date.localeCompare(y.date));
  const up = sorted.filter((e) => e.date.slice(0, 10) >= today);
  const next = up[0];
  const d = next ? parseDay(next.date) : null;
  const n = c.calendar_events.length;
  const thumbs = (up.length ? up : sorted).filter((e) => e.img).slice(0, 3);
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return (
    <Link href={`/c/${c.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 12, borderRadius: 22, textDecoration: 'none', background: 'linear-gradient(120deg, rgba(123,227,168,0.09), rgba(255,255,255,0.035) 55%)' }}>
      {/* a tear-off date: the next night */}
      <span style={{ flexShrink: 0, width: 54, height: 60, borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'rgba(6,10,8,0.6)' }}>
        <span style={{ height: 19, display: 'flex', alignItems: 'center', justifyContent: 'center', background: d ? GRAD.mint : 'rgba(255,255,255,0.08)', color: d ? T.onMint : T.text3, fontFamily: FONT.sans, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em' }}>{d ? MON[d.getMonth()] : 'NEW'}</span>
        <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.display, fontSize: 24, fontWeight: 800, letterSpacing: '-0.04em', color: T.white }}>{d ? d.getDate() : <Plus size={20} strokeWidth={2.4} color={T.mint} />}</span>
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: FONT.display, fontSize: 17.5, fontWeight: 800, letterSpacing: '-0.025em', color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
          {!c.is_public && <Lock size={12} color={T.text3} style={{ flexShrink: 0 }} aria-label="Private" />}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, fontFamily: FONT.sans, fontSize: 13, color: T.text3 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {n === 0 ? 'Add your first night' : <>{n} {n === 1 ? 'night' : 'nights'}{next ? <> · <span style={{ color: T.mintText, fontWeight: 700 }}>{until(next.date)}</span></> : ' · all done'}</>}
          </span>
          {!!stats?.likes && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }}><Heart size={11} />{stats.likes}</span>}
        </span>
      </span>
      {thumbs.length > 0 && (
        <span aria-hidden style={{ flexShrink: 0, display: 'flex', alignItems: 'center', paddingRight: 2 }}>
          {thumbs.map((e, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={e.ev.slug} src={e.img!} alt="" loading="lazy" style={{ width: 34, height: 43, objectFit: 'cover', borderRadius: 8, marginLeft: i ? -12 : 0, transform: `rotate(${(i - (thumbs.length - 1) / 2) * 6}deg)`, boxShadow: '0 6px 12px -4px rgba(0,0,0,0.8), 0 0 0 1.5px rgba(10,16,13,0.9)' }} />
          ))}
        </span>
      )}
    </Link>
  );
}

/** Calendars: start yours, see yours, and the popular public ones */
export default function CalendarsHub() {
  const db = useMemo(() => createClient(), []);
  const router = useRouter();
  const { user } = useAuth();
  const [mine, setMine] = useState<Row[]>([]);
  const [popular, setPopular] = useState<Row[]>([]);
  const [events, setEvents] = useState<Record<string, GridEvent>>({});
  const [ours, setOurs] = useState<Row[]>([]);
  const [stats, setStats] = useState<Record<string, CalendarStats>>({});
  const [flyers, setFlyers] = useState<Record<string, string>>({});
  const [dates, setDates] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const sel = `${CAL_SELECT}, calendar_events(event_slug)`;
      const [pub, own] = await Promise.all([
        db.from('calendars').select(sel).eq('is_public', true).order('updated_at', { ascending: false }).limit(40),
        user ? db.from('calendars').select(sel).eq('owner_id', user.id).order('updated_at', { ascending: false }) : Promise.resolve({ data: [] }),
      ]);
      if (!live) return;
      const p = ((pub.data ?? []) as Row[]).filter((c) => c.calendar_events.length > 0);
      const o = (own.data ?? []) as Row[];
      const all = [...p, ...o];
      const st = await calendarStats(db, Array.from(new Set(all.map((c) => c.id))));
      // Popular: likes and ratings first, then the freshest
      const score = (c: Row) => (st[c.id]?.likes ?? 0) * 3 + (st[c.id]?.ratings ?? 0) * 2 + (st[c.id]?.comments ?? 0) + c.calendar_events.length * 0.2;
      p.sort((a, b) => score(b) - score(a));
      const slugs = Array.from(new Set(all.flatMap((c) => c.calendar_events.map((e) => e.event_slug))));
      const ev = slugs.length ? await db.from('events').select('slug, title, date, time, venue, image_url').in('slug', slugs.slice(0, 300)) : { data: [] };
      if (!live) return;
      setOurs(p.filter((c) => isCurated(c.slug)));
      setPopular(p.filter((c) => c.owner_id !== user?.id && !isCurated(c.slug)).slice(0, 12));
      setMine(o.filter((c) => !isCurated(c.slug)));
      setStats(st);
      const evRows = (ev.data ?? []) as GridEvent[];
      setEvents(Object.fromEntries(evRows.map((e) => [e.slug, e])));
      setFlyers(Object.fromEntries(evRows.filter((e) => e.image_url).map((e) => [e.slug, hiRes(e.image_url, 300) ?? e.image_url!])));
      setDates(Object.fromEntries(evRows.map((e) => [e.slug, e.date])));
    })();
    return () => { live = false; };
  }, [user, db]);

  // Starting one: they name it first (anything they like), and pick who sees it
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const start = () => { if (!user) return router.push('/auth?next=/calendars'); setNaming(true); };
  const create = async () => {
    if (!user || !name.trim() || busy) return;
    setBusy(true);
    try { const c = await createCalendar(db, user.id, name, isPublic); router.push(`/c/${c.slug}`); } catch { setBusy(false); }
  };
  // Header: flyers from the public calendars on show (never from someone's private one)
  const wall = Array.from(new Set([...ours, ...popular].flatMap((c) => c.calendar_events.map((e) => flyers[e.event_slug])).filter(Boolean))).slice(0, 10);
  const fl = (c: Row): TileEvent[] => c.calendar_events.filter((e) => dates[e.event_slug]).map((e) => ({ date: dates[e.event_slug], img: flyers[e.event_slug] ?? null, ev: events[e.event_slug] }));
  const stack: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 34, marginTop: 18 };
  // Every night you've saved, across all your calendars, for the one month view
  const myEvents = useMemo(() => {
    const seen = new Set<string>();
    return mine.flatMap((c) => c.calendar_events.map((e) => events[e.event_slug])).filter((e): e is GridEvent => !!e && !seen.has(e.slug) && !!seen.add(e.slug)).sort((x, y) => x.date.localeCompare(y.date));
  }, [mine, events]);
  const upNext = (() => {
    const t = new Date().toISOString().slice(0, 10);
    const e = myEvents.find((x) => x.date.slice(0, 10) >= t);
    const cal = e && mine.find((c) => c.calendar_events.some((x) => x.event_slug === e.slug));
    return e && cal ? { e, cal } : null;
  })();
  const nights = new Set(mine.flatMap((c) => c.calendar_events.map((e) => e.event_slug))).size;

  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed', overflowX: 'clip' }}>
      <Nav back="/" />
      <main style={{ maxWidth: 960, margin: '0 auto', padding: 'calc(100px + env(safe-area-inset-top, 0px)) 20px 40px' }}>
        {mine.length > 0 ? (
          <header>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, maxWidth: 560 }}>
              <div style={{ minWidth: 0 }}>
                <h1 style={{ margin: 0, fontFamily: FONT.display, fontSize: 'clamp(32px, 9vw, 48px)', fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.045em', paddingBottom: '0.06em', ...gradText }}>Your nights out</h1>
                <p style={{ margin: '4px 0 0', fontFamily: FONT.sans, fontSize: 14, color: T.text3 }}>{nights} saved across {mine.length} {mine.length === 1 ? 'calendar' : 'calendars'}</p>
              </div>
              <button type="button" onClick={start} aria-label="Start a new calendar" style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 999, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: GRAD.mint, color: T.onMint }}><Plus size={20} strokeWidth={2.6} /></button>
            </div>
            {upNext && <div style={{ marginTop: 22, maxWidth: 560 }}><UpNext e={upNext.e} img={flyers[upNext.e.slug] ?? null} cal={upNext.cal} /></div>}
          </header>
        ) : (
        <header style={{ position: 'relative', paddingTop: wall.length ? 'min(50vw, 240px)' : 0 }}>
          {wall.length > 0 ? (
            <div aria-hidden style={{ position: 'absolute', top: 'calc(-100px - env(safe-area-inset-top, 0px))', left: '50%', width: '100vw', transform: 'translateX(-50%)', height: 'calc(min(50vw, 240px) + 100px + 190px)', pointerEvents: 'none' }}>
              <FlyerWall images={wall} height="100%" />
            </div>
          ) : (
            <div aria-hidden style={{ position: 'absolute', inset: '-80px -20px auto', height: 320, background: GRAD.aurora, opacity: 0.5, filter: 'blur(30px)', pointerEvents: 'none' }} />
          )}
          <p style={{ ...eyebrow, position: 'relative' }}>Calendars</p>
          <h1 style={{ position: 'relative', margin: '12px 0 0', fontFamily: FONT.display, fontSize: 'clamp(38px, 10.5vw, 64px)', fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.045em', paddingBottom: '0.06em', ...gradText }}>Your season, your line-up.</h1>
          <p style={{ position: 'relative', margin: '14px 0 0', maxWidth: 540, fontFamily: FONT.sans, fontSize: 16.5, lineHeight: 1.55, color: T.text2 }}>
            Put the shows you’re going to in one calendar. Keep it private, or share it and let people like, rate and comment.
          </p>
          <div style={{ position: 'relative', marginTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" onClick={start} disabled={busy} style={{ ...BTN.primary, height: 50, padding: '0 22px', borderRadius: 999, cursor: 'pointer', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8, opacity: busy ? 0.7 : 1 }}>
              <Plus size={18} strokeWidth={2.6} />Start a calendar
            </button>
            <span style={{ fontFamily: FONT.sans, fontSize: 13.5, color: T.text3 }}>Or tap “Add to a calendar” on any event</span>
          </div>
        </header>
        )}

        {mine.length > 0 && (
          <section aria-label="Your calendars" style={{ marginTop: 44 }}>
            <p style={eyebrow}>Your calendars</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14, maxWidth: 560 }}>{mine.map((c) => <CalRow key={c.id} c={c} evs={fl(c)} stats={stats[c.id]} />)}</div>
          </section>
        )}

        {ours.length > 0 && (
          <section aria-label="Starter calendars from Tsacoal" style={{ marginTop: 52 }}>
            <p style={eyebrow}>Start from one of ours</p>
            <div style={stack}>{ours.map((c) => <Tile key={c.id} c={c} evs={fl(c)} stats={stats[c.id]} />)}</div>
          </section>
        )}

        <section aria-label="Popular calendars" style={{ marginTop: 52 }}>
          <p style={eyebrow}>Popular now</p>
          {popular.length ? (
            <div style={stack}>{popular.slice(0, 6).map((c) => <Tile key={c.id} c={c} evs={fl(c)} stats={stats[c.id]} />)}</div>
          ) : (
            <p style={{ margin: '12px 0 0', fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.55, color: T.text2 }}>No one’s shared a calendar yet. Be the first, and send it to the squad.</p>
          )}
        </section>
      </main>
      <Footer />

      {naming && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400 }}>
          <button type="button" aria-label="Close" onClick={() => setNaming(false)} style={{ position: 'absolute', inset: 0, border: 'none', background: 'rgba(0,0,0,0.5)', cursor: 'pointer' }} />
          <section role="dialog" aria-label="Name your calendar" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxWidth: 560, margin: '0 auto', padding: '20px 20px calc(22px + env(safe-area-inset-bottom, 0px))', borderRadius: '24px 24px 0 0', background: 'linear-gradient(180deg, rgba(16,34,25,0.98) 0%, rgba(9,18,13,0.99) 100%)', boxShadow: '0 -20px 60px rgba(0,0,0,0.5)', animation: 'nmUp 280ms cubic-bezier(0.22,1,0.36,1)' }}>
            <style>{'@keyframes nmUp{from{transform:translateY(60px);opacity:0}to{transform:none;opacity:1}}'}</style>
            <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em', color: T.white }}>Name your calendar</p>
            <p style={{ margin: '4px 0 0', fontFamily: FONT.sans, fontSize: 14, color: T.text3 }}>Call it anything. You can change it later.</p>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') create(); }} maxLength={40} placeholder="e.g. Girls’ Detty Dec" aria-label="Calendar name"
              style={{ marginTop: 16, width: '100%', boxSizing: 'border-box', height: 54, padding: '0 16px', borderRadius: 15, border: 'none', outline: 'none', background: 'rgba(255,255,255,0.08)', color: T.white, fontFamily: FONT.display, fontSize: 18, fontWeight: 700 }} />
            <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 10 }}>
              {['My Detty December', 'Christmas week', 'The squad', 'Kumasi nights', 'Birthday month'].map((i) => (
                <button key={i} type="button" onClick={() => setName(i)} style={{ flexShrink: 0, height: 32, padding: '0 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: name === i ? 'rgba(123,227,168,0.16)' : 'rgba(255,255,255,0.06)', color: name === i ? T.mintText : T.text2, fontFamily: FONT.sans, fontSize: 13, fontWeight: 600 }}>{i}</button>
              ))}
            </div>
            <div role="radiogroup" aria-label="Who can see it" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
              {([[true, Globe, 'Public', 'Anyone with the link'], [false, Lock, 'Private', 'Only you']] as const).map(([v, I, l, d]) => (
                <button key={l} type="button" role="radio" aria-checked={isPublic === v} onClick={() => setIsPublic(v)} style={{ padding: '12px 14px', borderRadius: 14, border: 'none', cursor: 'pointer', textAlign: 'left', background: isPublic === v ? 'rgba(123,227,168,0.14)' : 'rgba(255,255,255,0.05)', color: isPublic === v ? T.mintText : T.text2 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT.sans, fontSize: 14.5, fontWeight: 700 }}><I size={15} />{l}</span>
                  <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 12.5, color: T.text3 }}>{d}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={create} disabled={busy || !name.trim()} style={{ ...BTN.primary, marginTop: 18, width: '100%', height: 50, borderRadius: 999, cursor: 'pointer', fontSize: 15, opacity: busy || !name.trim() ? 0.6 : 1 }}>
              {busy ? 'Creating…' : 'Create calendar'}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
