'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, Globe, Heart, Lock, MessageSquareText, Plus, Search, Settings2, Share2, Star } from 'lucide-react';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import FeedComments from '@/components/events/FeedComments';
import MonthGrid from '@/components/calendars/MonthGrid';
import SearchSheet from '@/components/search/SearchSheet';
import CalendarSheet from '@/components/calendars/CalendarSheet';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { useCalendarComments } from '@/hooks/useCalendarComments';
import { CAL_SELECT, createCalendar, isCurated, ownerName, setInCalendar, type Calendar } from '@/lib/calendars';
import { parseDay, shortDay } from '@/lib/dates';
import { hiRes } from '@/lib/events/image';
import { listTitle } from '@/lib/titles';
import { T, FONT, GROUND, GRAD, BTN } from '@/lib/thiscene';

type Ev = { slug: string; title: string; date: string; time: string | null; venue: string | null; city: string | null; image_url: string | null };
const EV_SELECT = 'slug, title, date, time, venue, city, image_url';

const gradText: React.CSSProperties = { background: GRAD.text, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' };
const eyebrow: React.CSSProperties = { margin: 0, fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.mintText };
const iconBtn = (on = false): React.CSSProperties => ({
  minWidth: 48, height: 48, padding: '0 14px', borderRadius: 15, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  background: on ? 'rgba(123,227,168,0.16)' : 'rgba(255,255,255,0.07)', color: on ? T.mintText : T.white, fontFamily: FONT.sans, fontSize: 14.5, fontWeight: 700,
});
const img = (e: Ev, w = 500) => (e.image_url ? hiRes(e.image_url, w) ?? e.image_url : null);
const todayIso = () => new Date().toISOString().slice(0, 10);

function Avatar({ c, size = 30 }: { c: Calendar; size?: number }) {
  const name = ownerName(c);
  if (isCurated(c.slug)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
        <rect x="1" y="1" width="22" height="22" rx="7" fill="#7BE3A8" />
        <path d="M10.5 5.5v9.5a3.2 3.2 0 0 0 3.2 3.2h1.8" fill="none" stroke="#03130B" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M7.5 9.5h8" fill="none" stroke="#03130B" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }
  const url = c.profiles?.avatar_url;
  // eslint-disable-next-line @next/next/no-img-element
  if (url) return <img src={url} alt="" width={size} height={size} style={{ width: size, height: size, borderRadius: size * 0.32, objectFit: 'cover', flexShrink: 0 }} />;
  return <span aria-hidden style={{ width: size, height: size, borderRadius: size * 0.32, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: GRAD.mint, color: T.onMint, fontFamily: FONT.display, fontSize: size * 0.42, fontWeight: 800 }}>{name.charAt(0).toUpperCase()}</span>;
}

/** Someone's calendar: their line-up of shows, to like, rate, comment on, share or copy */
export default function CalendarClient({ slug }: { slug: string }) {
  const db = useMemo(() => createClient(), []);
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [cal, setCal] = useState<Calendar | null>(null);
  const [missing, setMissing] = useState(false);
  const [events, setEvents] = useState<Ev[]>([]);
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [ratings, setRatings] = useState<{ user_id: string; stars: number }[]>([]);
  const [chat, setChat] = useState(false);
  // From a comment notification: open the comments straight away
  useEffect(() => { if (new URLSearchParams(window.location.search).get('comments') === '1') setChat(true); }, []);
  const [finding, setFinding] = useState(false);
  const [findDay, setFindDay] = useState<string | undefined>();
  // Taken out from the calendar grid: a few seconds to put it back
  const [undo, setUndo] = useState<Ev | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: '', description: '' });
  const [picks, setPicks] = useState<Ev[]>([]);
  const [copied, setCopied] = useState('');
  const { comments, send, edit, remove } = useCalendarComments(cal?.id);

  const mine = !!user && cal?.owner_id === user.id;

  // The calendar, its shows, likes and ratings. Waits for sign-in so the owner can open a private one.
  useEffect(() => {
    if (authLoading) return;
    let live = true;
    (async () => {
      const { data } = await db.from('calendars').select(`${CAL_SELECT}, calendar_events(event_slug, added_at)`).eq('slug', slug).maybeSingle();
      if (!live) return;
      if (!data) { setMissing(true); return; }
      const c = data as Calendar & { calendar_events: { event_slug: string }[] };
      setCal(c);
      setDraft({ title: c.title, description: c.description ?? '' });
      const slugs = c.calendar_events.map((e) => e.event_slug);
      const [ev, lk, rt] = await Promise.all([
        slugs.length ? db.from('events').select(EV_SELECT).in('slug', slugs).order('date') : Promise.resolve({ data: [] }),
        db.from('calendar_likes').select('user_id').eq('calendar_id', c.id),
        db.from('calendar_ratings').select('user_id, stars').eq('calendar_id', c.id),
      ]);
      if (!live) return;
      setEvents((ev.data ?? []) as Ev[]);
      const ls = (lk.data ?? []) as { user_id: string }[];
      setLikes(ls.length);
      setLiked(!!user && ls.some((l) => l.user_id === user.id));
      setRatings((rt.data ?? []) as { user_id: string; stars: number }[]);
    })();
    return () => { live = false; };
  }, [slug, user, authLoading, db]);

  // The owner's quick picks: the season's big nights not in the calendar yet
  useEffect(() => {
    if (!mine) return;
    db.from('events').select(EV_SELECT).eq('status', 'published').eq('is_hot', true).gte('date', todayIso()).order('date').limit(14)
      .then(({ data }) => setPicks((data ?? []) as Ev[]));
  }, [mine, db]);

  const avg = ratings.length ? ratings.reduce((s, r) => s + r.stars, 0) / ratings.length : 0;
  const myStars = ratings.find((r) => r.user_id === user?.id)?.stars ?? 0;
  const wall = events.filter((e) => e.image_url).slice(0, 8);
  const first = parseDay(events[0]?.date), last = parseDay(events[events.length - 1]?.date);
  const pickList = picks.filter((p) => !events.some((e) => e.slug === p.slug)).slice(0, 8);

  const needSignIn = () => router.push(`/auth?next=/c/${slug}`);
  const toggleLike = async () => {
    if (!user || !cal) return needSignIn();
    const on = !liked;
    setLiked(on); setLikes((n) => n + (on ? 1 : -1));
    if (on) await db.from('calendar_likes').upsert({ calendar_id: cal.id, user_id: user.id });
    else await db.from('calendar_likes').delete().eq('calendar_id', cal.id).eq('user_id', user.id);
  };
  const rate = async (stars: number) => {
    if (!user || !cal) return needSignIn();
    setRatings((prev) => [...prev.filter((r) => r.user_id !== user.id), { user_id: user.id, stars }]);
    await db.from('calendar_ratings').upsert({ calendar_id: cal.id, user_id: user.id, stars });
  };
  const share = async () => {
    if (!cal) return;
    const url = `${window.location.origin}/c/${cal.slug}`;
    const text = `${cal.title}: ${events.length} ${events.length === 1 ? 'show' : 'shows'} on my calendar. Who’s coming?`;
    try {
      if (navigator.share) await navigator.share({ title: cal.title, text, url });
      else { await navigator.clipboard.writeText(url); setCopied('Link copied'); setTimeout(() => setCopied(''), 2200); }
    } catch { /* closed */ }
  };
  const makeCopy = async () => {
    if (!user || !cal) return needSignIn();
    const c = await createCalendar(db, user.id, cal.title, true);
    if (events.length) await db.from('calendar_events').insert(events.map((e) => ({ calendar_id: c.id, event_slug: e.slug })));
    router.push(`/c/${c.slug}`);
  };
  const saveEdit = async () => {
    if (!cal || !draft.title.trim()) return;
    const next = { title: draft.title.trim(), description: draft.description.trim() || null };
    setCal({ ...cal, ...next }); setEditing(false);
    await db.from('calendars').update({ ...next, updated_at: new Date().toISOString() }).eq('id', cal.id);
  };
  const setPrivacy = async (isPublic: boolean) => {
    if (!cal) return;
    setCal({ ...cal, is_public: isPublic });
    await db.from('calendars').update({ is_public: isPublic }).eq('id', cal.id);
  };
  const add = async (e: Ev) => {
    if (!cal) return;
    setEvents((prev) => [...prev, e].sort((a, b) => a.date.localeCompare(b.date)));
    await setInCalendar(db, cal.id, e.slug, true);
  };
  const drop = async (e: Ev) => {
    if (!cal) return;
    setEvents((prev) => prev.filter((x) => x.slug !== e.slug));
    await setInCalendar(db, cal.id, e.slug, false);
  };

  if (missing) {
    return (
      <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed' }}>
        <Nav back="/calendars" />
        <main style={{ maxWidth: 560, margin: '0 auto', padding: 'calc(140px + env(safe-area-inset-top, 0px)) 20px 80px' }}>
          <h1 style={{ margin: 0, fontFamily: FONT.display, fontSize: 34, fontWeight: 800, letterSpacing: '-0.035em', ...gradText }}>This calendar is private or gone.</h1>
          <p style={{ margin: '12px 0 0', fontFamily: FONT.sans, fontSize: 16, lineHeight: 1.55, color: T.text2 }}>If it’s yours, sign in to see it. Or start your own.</p>
          <Link href="/calendars" style={{ ...BTN.primary, marginTop: 24, height: 50, padding: '0 22px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', textDecoration: 'none', fontSize: 15 }}>Make a calendar</Link>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed', overflowX: 'clip' }}>
      <Nav back="/calendars" />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: 'calc(92px + env(safe-area-inset-top, 0px)) 20px 40px' }}>
        {/* Hero: a wall of the calendar's flyers behind the name, fading into the page */}
        <header style={{ position: 'relative', paddingTop: wall.length ? 'min(62vw, 300px)' : 20 }}>
          {wall.length > 0 ? (
            <div aria-hidden style={{ position: 'absolute', top: 'calc(-92px - env(safe-area-inset-top, 0px))', left: '50%', width: '100vw', maxWidth: 1100, transform: 'translateX(-50%)', height: 'calc(min(62vw, 300px) + 92px + 150px)', overflow: 'hidden', pointerEvents: 'none', WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 50%, transparent 96%)', maskImage: 'linear-gradient(180deg, #000 0%, #000 50%, transparent 96%)' }}>
              <div style={{ position: 'absolute', inset: '-12% -18%', display: 'flex', gap: 10, transform: 'rotate(-8deg)', animation: 'wallIn 900ms cubic-bezier(0.22,1,0.36,1) both' }}>
                {[0, 1, 2, 3, 4].map((col) => (
                  <div key={col} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, transform: `translateY(${[-30, 40, -60, 20, -10][col]}px)` }}>
                    {[0, 1, 2].map((row) => {
                      const e = wall[(col * 3 + row + col) % wall.length];
                      // eslint-disable-next-line @next/next/no-img-element
                      return <img key={row} src={img(e, 360)!} alt="" style={{ width: '100%', aspectRatio: '4 / 5', objectFit: 'cover', borderRadius: 16, display: 'block', boxShadow: '0 16px 36px -14px rgba(0,0,0,0.8)' }} />;
                    })}
                  </div>
                ))}
              </div>
              {/* Dim enough for the nav up top, then dissolve into the page under the title */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,13,10,0.78) 0%, rgba(8,13,10,0.42) 24%, rgba(8,13,10,0.55) 48%, rgba(8,13,10,0.88) 72%, rgba(8,13,10,0.95) 100%)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(70% 50% at 20% 85%, rgba(70,220,150,0.18) 0%, rgba(70,220,150,0) 70%)' }} />
              <style>{'@keyframes wallIn{from{opacity:0;transform:rotate(-8deg) scale(1.06)}to{opacity:1;transform:rotate(-8deg) scale(1)}}'}</style>
            </div>
          ) : (
            <div aria-hidden style={{ position: 'absolute', inset: '-60px -20px auto', height: 340, background: GRAD.aurora, opacity: 0.55, filter: 'blur(30px)', pointerEvents: 'none' }} />
          )}
          <div style={{ position: 'relative' }}>
            <p style={{ ...eyebrow, display: 'flex', alignItems: 'center', gap: 7 }}>
              {cal?.is_public === false ? <Lock size={12} /> : <Globe size={12} />}{cal?.is_public === false ? 'Private calendar' : 'Calendar'}
            </p>
            <h1 style={{ margin: '12px 0 0', fontFamily: FONT.display, fontSize: 'clamp(38px, 10.5vw, 60px)', fontWeight: 800, lineHeight: 1.0, letterSpacing: '-0.045em', paddingBottom: '0.06em', ...gradText }}>{cal?.title ?? ' '}</h1>
            {cal?.description && <p style={{ margin: '10px 0 0', maxWidth: 560, fontFamily: FONT.sans, fontSize: 16, lineHeight: 1.55, color: T.text2 }}>{cal.description}</p>}
            {cal && (
              <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar c={cal} size={38} />
                <div style={{ minWidth: 0 }}>
                  {cal.profiles?.username && !isCurated(cal.slug)
                    ? <Link href={`/u/${cal.profiles.username}`} style={{ display: 'block', fontFamily: FONT.sans, fontSize: 15, fontWeight: 700, color: T.white, textDecoration: 'none' }}>{ownerName(cal)}</Link>
                    : <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 15, fontWeight: 700, color: T.white }}>{ownerName(cal)}</span>}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, fontFamily: FONT.sans, fontSize: 13, color: T.text3, flexWrap: 'wrap' }}>
                    <span>{events.length} {events.length === 1 ? 'show' : 'shows'}</span>
                    {first && <><span aria-hidden>·</span><span>{first === last || !last ? shortDay(first) : `${shortDay(first).replace(/^\S+ /, '')} – ${shortDay(last).replace(/^\S+ /, '')}`}</span></>}
                    {ratings.length > 0 && <><span aria-hidden>·</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: T.mintText, fontWeight: 700 }}><Star size={12} fill="currentColor" strokeWidth={0} />{avg.toFixed(1)}</span></>}
                  </span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* One quiet row: react on the left, your own move on the right */}
        {cal && (
          <section aria-label="React" style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" onClick={toggleLike} aria-pressed={liked} aria-label={liked ? 'Unlike' : 'Like'} style={iconBtn(liked)}>
                <Heart size={19} fill={liked ? 'currentColor' : 'none'} />{likes > 0 && <span>{likes}</span>}
              </button>
              <button type="button" onClick={() => (user ? setChat(true) : needSignIn())} aria-label="Comments" style={iconBtn()}>
                <MessageSquareText size={19} />{comments.length > 0 && <span>{comments.length}</span>}
              </button>
              <button type="button" onClick={share} aria-label="Share link" style={iconBtn()}><Share2 size={18} /></button>
              <span style={{ flex: 1 }} />
              {copied && <span style={{ fontFamily: FONT.sans, fontSize: 13, color: T.mintText }}>{copied}</span>}
              {mine
                ? <button type="button" onClick={() => setEditing(true)} aria-label="Calendar settings" style={iconBtn()}><Settings2 size={19} /></button>
                : <button type="button" onClick={makeCopy} style={{ ...iconBtn(), padding: '0 16px', fontSize: 14 }}><Copy size={16} />Copy to mine</button>}
            </div>
            {!mine && (
              <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: FONT.sans, fontSize: 13.5, color: T.text3 }}>{myStars ? 'Your rating' : 'Rate this line-up'}</span>
                <div role="radiogroup" aria-label="Rate this calendar" style={{ display: 'flex', gap: 2 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={myStars === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => rate(n)}
                      style={{ width: 28, height: 28, border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: myStars >= n ? T.mint : 'rgba(255,255,255,0.2)', transition: 'color 150ms ease' }}>
                      <Star size={20} fill="currentColor" strokeWidth={0} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Owner settings: name, note, who can see it */}
        {editing && cal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 400 }}>
            <button type="button" aria-label="Close" onClick={() => setEditing(false)} style={{ position: 'absolute', inset: 0, border: 'none', background: 'rgba(0,0,0,0.5)', cursor: 'pointer' }} />
            <section role="dialog" aria-label="Calendar settings" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxWidth: 560, margin: '0 auto', padding: '20px 20px calc(22px + env(safe-area-inset-bottom, 0px))', borderRadius: '24px 24px 0 0', background: 'linear-gradient(180deg, rgba(16,34,25,0.98) 0%, rgba(9,18,13,0.99) 100%)', boxShadow: '0 -20px 60px rgba(0,0,0,0.5)', animation: 'csUp 280ms cubic-bezier(0.22,1,0.36,1)' }}>
              <style>{'@keyframes csUp{from{transform:translateY(60px);opacity:0}to{transform:none;opacity:1}}'}</style>
              <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 21, fontWeight: 800, letterSpacing: '-0.025em', color: T.white }}>Calendar settings</p>
              <label style={{ display: 'block', marginTop: 18, fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.text3 }}>Name</label>
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={80}
                style={{ marginTop: 8, width: '100%', boxSizing: 'border-box', height: 50, padding: '0 16px', borderRadius: 14, border: 'none', outline: 'none', background: 'rgba(255,255,255,0.08)', color: T.white, fontFamily: FONT.sans, fontSize: 16, fontWeight: 600 }} />
              <label style={{ display: 'block', marginTop: 16, fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.text3 }}>About it</label>
              <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} maxLength={400} rows={2} placeholder="What’s the plan? (optional)"
                style={{ marginTop: 8, width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: 14, border: 'none', outline: 'none', resize: 'none', background: 'rgba(255,255,255,0.08)', color: T.white, fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.5 }} />
              <div role="radiogroup" aria-label="Who can see it" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
                {([[true, Globe, 'Public', 'Anyone with the link'], [false, Lock, 'Private', 'Only you']] as const).map(([v, I, l, d]) => (
                  <button key={l} type="button" role="radio" aria-checked={cal.is_public === v} onClick={() => setPrivacy(v)} style={{ padding: '12px 14px', borderRadius: 14, border: 'none', cursor: 'pointer', textAlign: 'left', background: cal.is_public === v ? 'rgba(123,227,168,0.14)' : 'rgba(255,255,255,0.05)', color: cal.is_public === v ? T.mintText : T.text2 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT.sans, fontSize: 14.5, fontWeight: 700 }}><I size={15} />{l}</span>
                    <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 12.5, color: T.text3 }}>{d}</span>
                  </button>
                ))}
              </div>
              <button type="button" onClick={saveEdit} disabled={!draft.title.trim()} style={{ ...BTN.primary, marginTop: 18, width: '100%', height: 50, borderRadius: 999, cursor: 'pointer', fontSize: 15 }}>Save</button>
            </section>
          </div>
        )}

        {/* The shows, as a month calendar */}
        <section aria-label="Shows" style={{ marginTop: 44 }}>
          {cal && !events.length && (
            <p style={{ margin: '0 0 16px', fontFamily: FONT.sans, fontSize: 16, lineHeight: 1.55, color: T.text2 }}>{mine ? 'Nothing in it yet. Find shows to add, or tap “Add to a calendar” on any event.' : 'Nothing in this calendar yet.'}</p>
          )}
          {mine && (
            <button type="button" onClick={() => { setFindDay(undefined); setFinding(true); }} style={{ ...BTN.primary, marginBottom: 26, height: 50, padding: '0 22px', borderRadius: 999, cursor: 'pointer', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Search size={18} strokeWidth={2.4} />Find shows to add
            </button>
          )}
          {cal && (
            <MonthGrid
              events={events}
              onAddDay={mine ? (d) => { setFindDay(d); setFinding(true); } : undefined}
              onRemove={mine ? (g) => {
                const e = events.find((x) => x.slug === g.slug);
                if (!e) return;
                drop(e); setUndo(e);
                if (undoTimer.current) clearTimeout(undoTimer.current);
                undoTimer.current = setTimeout(() => setUndo(null), 5000);
              } : undefined}
              renderSheet={(pick) => <CalendarSheet events={events} title={cal.title} owner={ownerName(cal)} slug={cal.slug} isPublic={cal.is_public} onPick={pick} />}
            />
          )}
        </section>

        {/* Owner: one-tap adds from the season's big nights */}
        {mine && pickList.length > 0 && (
          <section aria-label="Add the big nights" style={{ marginTop: 52 }}>
            <p style={eyebrow}>Add the big nights</p>
            <div className="no-scrollbar" style={{ marginTop: 14, display: 'flex', gap: 12, overflowX: 'auto', margin: '14px -20px 0', padding: '0 20px' }}>
              {pickList.map((e) => (
                <button key={e.slug} type="button" onClick={() => add(e)} style={{ flexShrink: 0, width: 132, padding: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ position: 'relative', display: 'block', width: 132, height: 170, borderRadius: 16, overflow: 'hidden', background: GRAD.card }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {img(e, 300) && <img src={img(e, 300)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    <span style={{ position: 'absolute', right: 8, bottom: 8, width: 32, height: 32, borderRadius: 10, background: GRAD.mint, color: T.onMint, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 18px rgba(0,0,0,0.4)' }}><Plus size={18} strokeWidth={2.6} /></span>
                  </span>
                  <span style={{ display: 'block', marginTop: 8, fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 700, color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{listTitle(e.title)}</span>
                  <span style={{ display: 'block', marginTop: 1, fontFamily: FONT.sans, fontSize: 12.5, color: T.text3 }}>{shortDay(parseDay(e.date)!)}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Viewers: make your own */}
        {cal && !mine && (
          <section style={{ marginTop: 72, position: 'relative' }}>
            <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 'clamp(28px, 7.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.04, ...gradText }}>Make your own calendar.</h2>
            <p style={{ margin: '10px 0 0', fontFamily: FONT.sans, fontSize: 16, lineHeight: 1.55, color: T.text2 }}>Line up your shows, keep it to yourself or share it with the squad.</p>
            <Link href="/calendars" style={{ ...BTN.primary, marginTop: 20, height: 50, padding: '0 22px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', textDecoration: 'none', fontSize: 15 }}>Start one</Link>
          </section>
        )}
      </main>
      <Footer />

      {undo && (
        <div role="status" style={{ position: 'fixed', left: '50%', bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))', transform: 'translateX(-50%)', zIndex: 420, maxWidth: 'calc(100vw - 32px)', display: 'flex', alignItems: 'center', gap: 14, padding: '10px 10px 10px 16px', borderRadius: 16, background: 'rgba(22,34,28,0.96)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', boxShadow: '0 14px 40px rgba(0,0,0,0.55)', animation: 'udIn 220ms cubic-bezier(0.22,1,0.36,1)' }}>
          <style>{'@keyframes udIn{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}'}</style>
          <span style={{ minWidth: 0, fontFamily: FONT.sans, fontSize: 14, color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Removed {undo.title}</span>
          <button type="button" onClick={() => { add(undo); setUndo(null); }} style={{ flexShrink: 0, height: 34, padding: '0 14px', borderRadius: 11, border: 'none', cursor: 'pointer', background: 'rgba(123,227,168,0.16)', color: T.mintText, fontFamily: FONT.sans, fontSize: 14, fontWeight: 700 }}>Undo</button>
        </div>
      )}

      {finding && cal && (
        <SearchSheet
          title={`Add to ${cal.title}`}
          day={findDay}
          onClose={() => setFinding(false)}
          isIn={(slug) => events.some((e) => e.slug === slug)}
          onToggle={(f) => { const ev = { ...f } as Ev; if (events.some((e) => e.slug === f.slug)) drop(ev); else add(ev); }}
        />
      )}

      {chat && cal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400 }}>
          <button type="button" aria-label="Close comments" onClick={() => setChat(false)} style={{ position: 'absolute', inset: 0, border: 'none', background: 'rgba(0,0,0,0.5)', cursor: 'pointer' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxWidth: 640, margin: '0 auto', height: '100%' }}>
            <FeedComments
              height={Math.round((typeof window !== 'undefined' ? window.innerHeight : 800) * 0.72)}
              title={cal.title}
              comments={comments}
              onSend={(uid, text, p, parentId) => send(uid, text, p ?? (profile ? { username: profile.username, full_name: profile.full_name, avatar_url: profile.avatar_url } : undefined), parentId)}
              onEdit={edit}
              onDelete={remove}
              onClose={() => setChat(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
