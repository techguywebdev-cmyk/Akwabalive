'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Globe, Heart, Lock, Plus, Star } from 'lucide-react';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { CAL_SELECT, calendarStats, createCalendar, ownerName, type Calendar, type CalendarStats } from '@/lib/calendars';
import { hiRes } from '@/lib/events/image';
import { T, FONT, GROUND, GRAD, BTN } from '@/lib/thiscene';

type Row = Calendar & { calendar_events: { event_slug: string }[] };
const gradText: React.CSSProperties = { background: GRAD.text, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' };
const eyebrow: React.CSSProperties = { margin: 0, fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.mintText };

/** A calendar as a tile: its flyers fanned on top, name, who made it, likes and stars */
function Tile({ c, flyers, stats }: { c: Row; flyers: string[]; stats?: CalendarStats }) {
  return (
    <Link href={`/c/${c.slug}`} style={{ display: 'block', textDecoration: 'none' }}>
      <span style={{ position: 'relative', display: 'block', aspectRatio: '4 / 3', borderRadius: 18, overflow: 'hidden', background: GRAD.card }}>
        {flyers.slice(0, 3).map((f, i, a) => {
          const off = i - (a.length - 1) / 2;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={f} src={f} alt="" style={{ position: 'absolute', left: '50%', top: '14%', width: '42%', aspectRatio: '3 / 4', objectFit: 'cover', borderRadius: 12, transform: `translateX(calc(-50% + ${off * 46}%)) rotate(${off * 8}deg)`, zIndex: 3 - Math.abs(Math.round(off)), boxShadow: '0 14px 30px -10px rgba(0,0,0,0.8)' }} />
          );
        })}
        {!c.is_public && <span style={{ position: 'absolute', top: 10, left: 10, zIndex: 5, height: 26, padding: '0 9px', borderRadius: 9, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(5,10,8,0.6)', color: T.white, fontFamily: FONT.sans, fontSize: 12, fontWeight: 700 }}><Lock size={12} />Private</span>}
      </span>
      <span style={{ display: 'block', marginTop: 10, fontFamily: FONT.display, fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 3, fontFamily: FONT.sans, fontSize: 13, color: T.text3 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ownerName(c)} · {c.calendar_events.length} shows</span>
        {!!stats?.likes && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Heart size={12} />{stats.likes}</span>}
        {stats?.rating != null && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: T.mintText }}><Star size={12} fill="currentColor" strokeWidth={0} />{Number(stats.rating).toFixed(1)}</span>}
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
  const [stats, setStats] = useState<Record<string, CalendarStats>>({});
  const [flyers, setFlyers] = useState<Record<string, string>>({});
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
      const ev = slugs.length ? await db.from('events').select('slug, image_url').in('slug', slugs.slice(0, 200)) : { data: [] };
      if (!live) return;
      setPopular(p.filter((c) => c.owner_id !== user?.id).slice(0, 12));
      setMine(o);
      setStats(st);
      setFlyers(Object.fromEntries(((ev.data ?? []) as { slug: string; image_url: string | null }[]).filter((e) => e.image_url).map((e) => [e.slug, hiRes(e.image_url, 300) ?? e.image_url!])));
    })();
    return () => { live = false; };
  }, [user, db]);

  const start = async () => {
    if (!user) return router.push('/auth?next=/calendars');
    setBusy(true);
    try { const c = await createCalendar(db, user.id, 'My Detty December', true); router.push(`/c/${c.slug}`); } catch { setBusy(false); }
  };
  const fl = (c: Row) => c.calendar_events.map((e) => flyers[e.event_slug]).filter(Boolean);
  const grid: React.CSSProperties = { marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(46%, 220px), 1fr))', gap: '22px 14px' };

  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed' }}>
      <Nav back="/" />
      <main style={{ maxWidth: 960, margin: '0 auto', padding: 'calc(100px + env(safe-area-inset-top, 0px)) 20px 40px' }}>
        <header style={{ position: 'relative' }}>
          <div aria-hidden style={{ position: 'absolute', inset: '-80px -20px auto', height: 320, background: GRAD.aurora, opacity: 0.5, filter: 'blur(30px)', pointerEvents: 'none' }} />
          <p style={{ ...eyebrow, position: 'relative' }}>Calendars</p>
          <h1 style={{ position: 'relative', margin: '12px 0 0', fontFamily: FONT.display, fontSize: 'clamp(38px, 10.5vw, 64px)', fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.045em', paddingBottom: '0.06em', ...gradText }}>Your season, your line-up.</h1>
          <p style={{ position: 'relative', margin: '14px 0 0', maxWidth: 540, fontFamily: FONT.sans, fontSize: 16.5, lineHeight: 1.55, color: T.text2 }}>
            Put the shows you’re going to in one calendar. Keep it private, or share it and let people like, rate and comment.
          </p>
          <div style={{ position: 'relative', marginTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" onClick={start} disabled={busy} style={{ ...BTN.primary, height: 50, padding: '0 22px', borderRadius: 999, cursor: 'pointer', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8, opacity: busy ? 0.7 : 1 }}>
              <Plus size={18} strokeWidth={2.6} />{busy ? 'Creating…' : 'Start My Detty December'}
            </button>
            <span style={{ fontFamily: FONT.sans, fontSize: 13.5, color: T.text3 }}>Or tap “Add to a calendar” on any event</span>
          </div>
        </header>

        {mine.length > 0 && (
          <section aria-label="Your calendars" style={{ marginTop: 56 }}>
            <p style={eyebrow}>Yours</p>
            <div style={grid}>{mine.map((c) => <Tile key={c.id} c={c} flyers={fl(c)} stats={stats[c.id]} />)}</div>
          </section>
        )}

        <section aria-label="Popular calendars" style={{ marginTop: 56 }}>
          <p style={{ ...eyebrow, display: 'flex', alignItems: 'center', gap: 6 }}><Globe size={12} />Popular now</p>
          {popular.length ? (
            <div style={grid}>{popular.map((c) => <Tile key={c.id} c={c} flyers={fl(c)} stats={stats[c.id]} />)}</div>
          ) : (
            <p style={{ margin: '12px 0 0', fontFamily: FONT.sans, fontSize: 15.5, lineHeight: 1.55, color: T.text2 }}>No public calendars yet. Be the first, and share it with the squad.</p>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
