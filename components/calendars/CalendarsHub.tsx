'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Globe, Heart, Lock, Plus, Star } from 'lucide-react';
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

type TileEvent = { date: string; img: string | null };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/**
 * A calendar as a little desk calendar: binding on top, the month with the most shows, each show's flyer in its
 * date square. Name, who made it, likes and stars below.
 */
function Tile({ c, evs, stats }: { c: Row; evs: TileEvent[]; stats?: CalendarStats }) {
  // The busiest month (the soonest when tied); this month when it's empty
  const byMonth: Record<string, TileEvent[]> = {};
  for (const e of evs) (byMonth[e.date.slice(0, 7)] ??= []).push(e);
  const months = Object.keys(byMonth).sort();
  const today = new Date().toISOString().slice(0, 10);
  const pick = months.sort((x, y) => byMonth[y].length - byMonth[x].length || x.localeCompare(y))[0] ?? today.slice(0, 7);
  const y = +pick.slice(0, 4), m = +pick.slice(5, 7) - 1;
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const len = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: len }, (_, i) => i + 1)];
  while (cells.length < 42) cells.push(null);
  const day: Record<string, TileEvent> = {};
  for (const e of byMonth[pick] ?? []) if (!day[e.date.slice(0, 10)] || (!day[e.date.slice(0, 10)].img && e.img)) day[e.date.slice(0, 10)] = e;
  const span = Object.keys(byMonth).length;

  return (
    <Link href={`/c/${c.slug}`} style={{ display: 'block', textDecoration: 'none' }}>
      <span style={{ position: 'relative', display: 'block', paddingTop: 7 }}>
        {/* Binding */}
        <span aria-hidden style={{ position: 'absolute', top: 0, left: '24%', width: 8, height: 15, borderRadius: 4, background: 'linear-gradient(180deg, #C9F6DC, #5AD99A)', boxShadow: '0 2px 4px rgba(0,0,0,0.5)', zIndex: 2 }} />
        <span aria-hidden style={{ position: 'absolute', top: 0, right: '24%', width: 8, height: 15, borderRadius: 4, background: 'linear-gradient(180deg, #C9F6DC, #5AD99A)', boxShadow: '0 2px 4px rgba(0,0,0,0.5)', zIndex: 2 }} />
        <span style={{ display: 'block', borderRadius: 18, overflow: 'hidden', background: 'linear-gradient(180deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.035) 100%)', boxShadow: '0 18px 36px -18px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
          {/* Month header */}
          <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6, padding: '12px 12px 8px', background: 'linear-gradient(180deg, rgba(123,227,168,0.16), rgba(123,227,168,0.04))' }}>
            <span style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>
              {MONTHS[m]}{span > 1 && <span style={{ marginLeft: 5, fontFamily: FONT.sans, fontSize: 11, fontWeight: 700, color: T.mintText }}>+{span - 1}</span>}
            </span>
            <span style={{ fontFamily: FONT.sans, fontSize: 11, fontWeight: 700, color: T.text3 }}>{y}</span>
          </span>
          {/* The month, with flyers on the nights out */}
          <span style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 3, padding: '4px 9px 10px' }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, i) => <span key={`w${i}`} style={{ textAlign: 'center', fontFamily: FONT.sans, fontSize: 8.5, fontWeight: 700, color: i >= 5 ? 'rgba(168,240,198,0.6)' : 'rgba(255,255,255,0.28)', paddingBottom: 2 }}>{w}</span>)}
            {cells.map((d, i) => {
              if (d == null) return <span key={i} style={{ aspectRatio: '1' }} />;
              const k = iso(y, m, d);
              const e = day[k];
              if (!e) return <span key={i} style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.display, fontSize: 8.5, fontWeight: 600, color: k === today ? T.mintText : 'rgba(255,255,255,0.3)' }}>{d}</span>;
              return (
                <span key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 5, overflow: 'hidden', background: GRAD.mint, boxShadow: '0 3px 8px -2px rgba(0,0,0,0.6)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {e.img && <img src={e.img} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                </span>
              );
            })}
          </span>
        </span>
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
        {!c.is_public && <Lock size={13} color={T.text3} style={{ flexShrink: 0 }} aria-label="Private" />}
        <span style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 3, fontFamily: FONT.sans, fontSize: 12.5, color: T.text3 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isCurated(c.slug) ? 'Tsacoal' : ownerName(c)} · {c.calendar_events.length} {c.calendar_events.length === 1 ? 'show' : 'shows'}</span>
        {!!stats?.likes && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }}><Heart size={11} />{stats.likes}</span>}
        {stats?.rating != null && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: T.mintText, flexShrink: 0 }}><Star size={11} fill="currentColor" strokeWidth={0} />{Number(stats.rating).toFixed(1)}</span>}
      </span>
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
      const ev = slugs.length ? await db.from('events').select('slug, image_url, date').in('slug', slugs.slice(0, 300)) : { data: [] };
      if (!live) return;
      setOurs(p.filter((c) => isCurated(c.slug)));
      setPopular(p.filter((c) => c.owner_id !== user?.id && !isCurated(c.slug)).slice(0, 12));
      setMine(o.filter((c) => !isCurated(c.slug)));
      setStats(st);
      const evRows = (ev.data ?? []) as { slug: string; image_url: string | null; date: string }[];
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
  const fl = (c: Row): TileEvent[] => c.calendar_events.filter((e) => dates[e.event_slug]).map((e) => ({ date: dates[e.event_slug], img: flyers[e.event_slug] ?? null }));
  const grid: React.CSSProperties = { marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(46%, 220px), 1fr))', gap: '22px 14px' };

  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed', overflowX: 'clip' }}>
      <Nav back="/" />
      <main style={{ maxWidth: 960, margin: '0 auto', padding: 'calc(100px + env(safe-area-inset-top, 0px)) 20px 40px' }}>
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

        {mine.length > 0 && (
          <section aria-label="Your calendars" style={{ marginTop: 56 }}>
            <p style={eyebrow}>Yours</p>
            <div style={grid}>{mine.map((c) => <Tile key={c.id} c={c} evs={fl(c)} stats={stats[c.id]} />)}</div>
          </section>
        )}

        {ours.length > 0 && (
          <section aria-label="Starter calendars from Tsacoal" style={{ marginTop: 56 }}>
            <p style={eyebrow}>Start from one of ours</p>
            <p style={{ margin: '6px 0 0', fontFamily: FONT.sans, fontSize: 14.5, color: T.text2 }}>Open one, tap “Copy to mine”, then add and remove shows.</p>
            <div className="no-scrollbar" style={{ display: 'flex', gap: 14, overflowX: 'auto', margin: '16px -20px 0', padding: '0 20px 4px' }}>
              {ours.map((c) => <div key={c.id} style={{ width: 'min(62vw, 240px)', flexShrink: 0 }}><Tile c={c} evs={fl(c)} stats={stats[c.id]} /></div>)}
            </div>
          </section>
        )}

        <section aria-label="Popular calendars" style={{ marginTop: 56 }}>
          <p style={{ ...eyebrow, display: 'flex', alignItems: 'center', gap: 6 }}><Globe size={12} />Popular now</p>
          {popular.length ? (
            <div style={grid}>{popular.map((c) => <Tile key={c.id} c={c} evs={fl(c)} stats={stats[c.id]} />)}</div>
          ) : (
            <p style={{ margin: '12px 0 0', fontFamily: FONT.sans, fontSize: 15.5, lineHeight: 1.55, color: T.text2 }}>No one’s shared a calendar yet. Be the first, and send it to the squad.</p>
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
