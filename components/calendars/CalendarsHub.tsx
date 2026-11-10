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

/**
 * A calendar as a wallet card: its next nights fanned out like tickets in a hand, coloured by the flyer on top,
 * with the name, how many nights, and how soon the next one is. Tap a flyer to pop it up; tap the card to open it.
 */
function Tile({ c, evs, stats }: { c: Row; evs: TileEvent[]; stats?: CalendarStats }) {
  const today = todayIso();
  const sorted = [...evs].sort((x, y) => x.date.localeCompare(y.date));
  const up = sorted.filter((e) => e.date.slice(0, 10) >= today);
  const pool = (up.length ? up : [...sorted].reverse()).filter((e) => e.img);
  const fan = pool.slice(0, 3);
  const next = up[0];
  const n = c.calendar_events.length;
  const [pop, setPop] = useState<string | null>(null);
  const popEvents = pop ? evs.filter((e) => e.date.slice(0, 10) === pop).map((e) => e.ev) : [];
  // The next night sits in the middle, on top; the two after it lean out behind
  const place = fan.length === 1 ? [{ x: 0, r: 0, z: 2, s: 1.06 }]
    : fan.length === 2 ? [{ x: -30, r: -6, z: 2, s: 1.04 }, { x: 34, r: 7, z: 1, s: 0.94 }]
      : [{ x: 0, r: 0, z: 3, s: 1.08 }, { x: -64, r: -10, z: 1, s: 0.92 }, { x: 64, r: 10, z: 2, s: 0.92 }];
  const nd = next ? parseDay(next.date) : null;

  return (
    <>
      <Link href={`/c/${c.slug}`} style={{ position: 'relative', display: 'block', borderRadius: 28, overflow: 'hidden', textDecoration: 'none', background: '#0A100D', boxShadow: '0 26px 50px -28px rgba(0,0,0,0.95), inset 0 0 0 1px rgba(255,255,255,0.07)' }}>
        <Tint img={fan[0]?.img} />
        <span style={{ position: 'relative', display: 'block', padding: '16px 16px 18px' }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 26 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT.display, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.mintText }}>
              {!c.is_public && <Lock size={11} aria-label="Private" />}{n} {n === 1 ? 'night' : 'nights'}
            </span>
            {next && <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.12)', fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, color: T.white }}>{until(next.date)}</span>}
          </span>

          {/* The fan of flyers */}
          <span style={{ position: 'relative', display: 'block', height: 176, marginTop: 10 }}>
            {fan.length === 0 ? (
              <span style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
                <span style={{ width: 46, height: 46, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(123,227,168,0.14)', color: T.mint }}><Plus size={20} strokeWidth={2.4} /></span>
                <span style={{ fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: T.text2 }}>No nights yet</span>
              </span>
            ) : fan.map((e, i) => (
              <span key={e.ev.slug} role="button" tabIndex={0} aria-label={`See the ${e.ev.title} flyer`}
                onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); setPop(e.date.slice(0, 10)); }}
                onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.stopPropagation(); setPop(e.date.slice(0, 10)); } }}
                style={{ position: 'absolute', left: '50%', top: 12, width: 116, height: 145, marginLeft: -58, borderRadius: 14, overflow: 'hidden', zIndex: place[i].z, cursor: 'zoom-in', transform: `translateX(${place[i].x}px) rotate(${place[i].r}deg) scale(${place[i].s})`, boxShadow: '0 18px 34px -12px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.08)', filter: i === 0 ? 'none' : 'brightness(0.78)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.img!} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </span>
            ))}
            {pool.length > 3 && <span style={{ position: 'absolute', right: 0, bottom: 0, zIndex: 4, padding: '3px 9px', borderRadius: 999, background: 'rgba(6,10,8,0.8)', fontFamily: FONT.sans, fontSize: 11.5, fontWeight: 700, color: T.white }}>+{pool.length - 3}</span>}
          </span>

          <span style={{ display: 'block', marginTop: 12, fontFamily: FONT.display, fontSize: 21, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
          <span style={{ display: 'block', marginTop: 4, fontFamily: FONT.sans, fontSize: 13, color: 'rgba(255,255,255,0.62)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {next ? <>Next: {listTitle(next.ev.title)}{nd ? ` · ${shortDay(nd)}` : ''}</> : n ? 'All done for now' : 'Add your first night'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, fontFamily: FONT.sans, fontSize: 12.5, color: T.text3 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isCurated(c.slug) ? 'By Tsacoal' : `By ${ownerName(c)}`}</span>
            {!!stats?.likes && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }}><Heart size={11} />{stats.likes}</span>}
            {stats?.rating != null && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: T.mintText, flexShrink: 0 }}><Star size={11} fill="currentColor" strokeWidth={0} />{Number(stats.rating).toFixed(1)}</span>}
          </span>
        </span>
      </Link>
      {pop && popEvents.length > 0 && <FlyerPop day={pop} events={popEvents} onClose={() => setPop(null)} />}
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
  // Every section is the same swipeable row of tiles
  const row: React.CSSProperties = { display: 'flex', gap: 14, overflowX: 'auto', margin: '14px -20px 0', padding: '0 20px 6px', scrollSnapType: 'x mandatory', scrollPaddingLeft: 20 };
  const cell: React.CSSProperties = { width: 'min(76vw, 300px)', flexShrink: 0, scrollSnapAlign: 'start' };
  // The soonest night across your own calendars
  const upNext = (() => {
    const t = todayIso();
    let best: { e: GridEvent; cal: Row } | null = null;
    for (const c of mine) for (const ce of c.calendar_events) {
      const e = events[ce.event_slug];
      if (e && e.date.slice(0, 10) >= t && (!best || e.date < best.e.date)) best = { e, cal: c };
    }
    return best;
  })();
  const nights = new Set(mine.flatMap((c) => c.calendar_events.map((e) => e.event_slug))).size;

  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed', overflowX: 'clip' }}>
      <Nav back="/" />
      <main style={{ maxWidth: 960, margin: '0 auto', padding: 'calc(100px + env(safe-area-inset-top, 0px)) 20px 40px' }}>
        {mine.length > 0 ? (
          <header>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <p style={eyebrow}>Calendars</p>
                <h1 style={{ margin: '10px 0 0', fontFamily: FONT.display, fontSize: 'clamp(34px, 9.5vw, 54px)', fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.045em', paddingBottom: '0.06em', ...gradText }}>Your nights out</h1>
                <p style={{ margin: '6px 0 0', fontFamily: FONT.sans, fontSize: 14.5, color: T.text3 }}>{nights} {nights === 1 ? 'night' : 'nights'} saved across {mine.length} {mine.length === 1 ? 'calendar' : 'calendars'}</p>
              </div>
              <button type="button" onClick={start} aria-label="Start a new calendar" style={{ flexShrink: 0, height: 42, padding: '0 16px', borderRadius: 999, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(123,227,168,0.12)', color: T.mintText, fontFamily: FONT.sans, fontSize: 14, fontWeight: 700 }}>
                <Plus size={16} strokeWidth={2.4} />New
              </button>
            </div>
            {upNext && <div style={{ marginTop: 24, maxWidth: 560 }}><UpNext e={upNext.e} img={flyers[upNext.e.slug] ?? null} cal={upNext.cal} /></div>}
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
          <section aria-label="Your calendars" style={{ marginTop: 40 }}>
            <SectionHead title="Your calendars" />
            <div className="ak-noscroll" style={row}>
              {mine.map((c) => <div key={c.id} style={cell}><Tile c={c} evs={fl(c)} stats={stats[c.id]} /></div>)}
              <button type="button" onClick={start} aria-label="Start a new calendar"
                style={{ ...cell, width: 150, alignSelf: 'stretch', minHeight: 180, borderRadius: 28, border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'linear-gradient(160deg, rgba(123,227,168,0.14) 0%, rgba(255,255,255,0.03) 100%)', color: T.white }}>
                <span style={{ width: 44, height: 44, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', background: GRAD.mint, color: T.onMint }}><Plus size={20} strokeWidth={2.4} /></span>
                <span style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 700 }}>New calendar</span>
              </button>
            </div>
          </section>
        )}

        {ours.length > 0 && (
          <section aria-label="Starter calendars from Tsacoal" style={{ marginTop: 44 }}>
            <SectionHead title="Start from one of ours" hint="Copy one, then make it yours" />
            <div className="ak-noscroll" style={row}>
              {ours.map((c) => <div key={c.id} style={cell}><Tile c={c} evs={fl(c)} stats={stats[c.id]} /></div>)}
            </div>
          </section>
        )}

        <section aria-label="Popular calendars" style={{ marginTop: 44 }}>
          <SectionHead title="Popular now" hint="Shared by people on Tsacoal" />
          {popular.length ? (
            <div className="ak-noscroll" style={row}>
              {popular.map((c) => <div key={c.id} style={cell}><Tile c={c} evs={fl(c)} stats={stats[c.id]} /></div>)}
            </div>
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
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') create(); }} maxLength={80} placeholder="e.g. Owambe szn with the girls" aria-label="Calendar name"
              style={{ marginTop: 16, width: '100%', boxSizing: 'border-box', height: 54, padding: '0 16px', borderRadius: 15, border: 'none', outline: 'none', background: 'rgba(255,255,255,0.08)', color: T.white, fontFamily: FONT.display, fontSize: 18, fontWeight: 700 }} />
            <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 10 }}>
              {['My Detty December', 'Christmas week', 'Shows with the squad', 'Kumasi nights', 'Birthday month'].map((i) => (
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
