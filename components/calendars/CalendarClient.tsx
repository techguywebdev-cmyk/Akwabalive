'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, Globe, Heart, Lock, MessageSquareText, Pencil, Plus, Share2, Star, X } from 'lucide-react';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import FeedComments from '@/components/events/FeedComments';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { useCalendarComments } from '@/hooks/useCalendarComments';
import { CAL_SELECT, createCalendar, ownerName, setInCalendar, type Calendar } from '@/lib/calendars';
import { parseDay, longDay, shortDay } from '@/lib/dates';
import { hiRes } from '@/lib/events/image';
import { listTitle } from '@/lib/titles';
import { T, FONT, GROUND, GRAD, BTN } from '@/lib/thiscene';

type Ev = { slug: string; title: string; date: string; time: string | null; venue: string | null; city: string | null; image_url: string | null };
const EV_SELECT = 'slug, title, date, time, venue, city, image_url';

const gradText: React.CSSProperties = { background: GRAD.text, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' };
const eyebrow: React.CSSProperties = { margin: 0, fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.mintText };
const softBtn = (on = false): React.CSSProperties => ({
  height: 44, padding: '0 15px', borderRadius: 15, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7,
  background: on ? 'rgba(123,227,168,0.16)' : 'rgba(255,255,255,0.07)', color: on ? T.mintText : T.white, fontFamily: FONT.sans, fontSize: 14, fontWeight: 700,
});
const img = (e: Ev, w = 500) => (e.image_url ? hiRes(e.image_url, w) ?? e.image_url : null);
const todayIso = () => new Date().toISOString().slice(0, 10);

function Avatar({ c, size = 30 }: { c: Calendar; size?: number }) {
  const name = ownerName(c);
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

  const groups = useMemo((): [string, Ev[]][] => {
    const m = new Map<string, Ev[]>();
    for (const e of events) { const k = e.date.slice(0, 10); m.set(k, [...(m.get(k) ?? []), e]); }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [events]);
  const avg = ratings.length ? ratings.reduce((s, r) => s + r.stars, 0) / ratings.length : 0;
  const myStars = ratings.find((r) => r.user_id === user?.id)?.stars ?? 0;
  const flyers = events.filter((e) => e.image_url).slice(0, 4);
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
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed' }}>
      <Nav back="/calendars" />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: 'calc(92px + env(safe-area-inset-top, 0px)) 20px 40px' }}>
        {/* Hero: a fan of the flyers in it, the name, who made it */}
        <header style={{ position: 'relative' }}>
          <div aria-hidden style={{ position: 'absolute', inset: '-60px -20px auto', height: 340, background: GRAD.aurora, opacity: 0.55, filter: 'blur(30px)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', height: flyers.length ? 210 : 40, marginBottom: 6 }}>
            {flyers.map((e, i) => {
              const n = flyers.length, mid = (n - 1) / 2, off = i - mid;
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={e.slug} src={img(e, 400)!} alt="" style={{
                  position: 'absolute', left: '50%', top: 10 + Math.abs(off) * 10, width: 128, height: 170, objectFit: 'cover', borderRadius: 16,
                  transform: `translateX(calc(-50% + ${off * 74}px)) rotate(${off * 7}deg)`, zIndex: 10 - Math.abs(Math.round(off)),
                  boxShadow: '0 22px 50px -16px rgba(0,0,0,0.8)',
                }} />
              );
            })}
          </div>
          <div style={{ position: 'relative' }}>
            <p style={{ ...eyebrow, display: 'flex', alignItems: 'center', gap: 8 }}>
              {cal?.is_public === false ? <><Lock size={12} /> Private calendar</> : <><Globe size={12} /> Calendar</>}
              {first && <span style={{ color: T.text3, letterSpacing: '0.08em' }}>{first === last || !last ? shortDay(first) : `${shortDay(first)} – ${shortDay(last)}`}</span>}
            </p>
            {editing ? (
              <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={80} aria-label="Name"
                  style={{ height: 52, padding: '0 16px', borderRadius: 14, border: 'none', outline: 'none', background: 'rgba(255,255,255,0.08)', color: T.white, fontFamily: FONT.display, fontSize: 20, fontWeight: 800 }} />
                <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} maxLength={400} rows={3} aria-label="About" placeholder="What’s the plan? (optional)"
                  style={{ padding: '12px 16px', borderRadius: 14, border: 'none', outline: 'none', resize: 'vertical', background: 'rgba(255,255,255,0.08)', color: T.white, fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.5 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={saveEdit} style={{ ...BTN.primary, height: 44, padding: '0 20px', borderRadius: 999, cursor: 'pointer', fontSize: 14 }}>Save</button>
                  <button type="button" onClick={() => setEditing(false)} style={softBtn()}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h1 style={{ margin: '12px 0 0', fontFamily: FONT.display, fontSize: 'clamp(36px, 10vw, 58px)', fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.045em', paddingBottom: '0.06em', ...gradText }}>{cal?.title ?? ' '}</h1>
                {cal?.description && <p style={{ margin: '12px 0 0', maxWidth: 560, fontFamily: FONT.sans, fontSize: 16, lineHeight: 1.55, color: T.text2 }}>{cal.description}</p>}
              </>
            )}
            {cal && (
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>
                <Avatar c={cal} />
                <span>By {cal.profiles?.username ? <Link href={`/u/${cal.profiles.username}`} style={{ color: T.white, fontWeight: 700, textDecoration: 'none' }}>{ownerName(cal)}</Link> : <b style={{ color: T.white }}>{ownerName(cal)}</b>}</span>
                <span style={{ color: T.text3 }}>· {events.length} {events.length === 1 ? 'show' : 'shows'}</span>
              </div>
            )}
          </div>
        </header>

        {/* Like, rate, talk, share */}
        {cal && (
          <section aria-label="React" style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={toggleLike} aria-pressed={liked} style={softBtn(liked)}><Heart size={17} fill={liked ? 'currentColor' : 'none'} />{likes || 'Like'}</button>
              <button type="button" onClick={() => (user ? setChat(true) : needSignIn())} style={softBtn()}><MessageSquareText size={17} />{comments.length || 'Comment'}</button>
              <button type="button" onClick={share} style={softBtn()}><Share2 size={17} />{copied || 'Share'}</button>
              {!mine && <button type="button" onClick={makeCopy} style={softBtn()}><Copy size={16} />Copy to mine</button>}
              {mine && !editing && <button type="button" onClick={() => setEditing(true)} style={softBtn()}><Pencil size={16} />Edit</button>}
            </div>
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div role="radiogroup" aria-label="Rate this calendar" style={{ display: 'flex', gap: 2 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={myStars === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => !mine && rate(n)} disabled={mine}
                    style={{ width: 34, height: 34, border: 'none', background: 'none', padding: 0, cursor: mine ? 'default' : 'pointer', color: (myStars || Math.round(avg)) >= n ? T.mint : 'rgba(255,255,255,0.22)' }}>
                    <Star size={24} fill="currentColor" strokeWidth={0} />
                  </button>
                ))}
              </div>
              <span style={{ fontFamily: FONT.sans, fontSize: 13.5, color: T.text3 }}>
                {ratings.length ? <><b style={{ color: T.white }}>{avg.toFixed(1)}</b> from {ratings.length} {ratings.length === 1 ? 'rating' : 'ratings'}</> : mine ? 'Ratings show here' : 'Be the first to rate it'}
                {myStars > 0 && !mine && ' · yours saved'}
              </span>
            </div>
            {mine && (
              <div role="radiogroup" aria-label="Who can see it" style={{ marginTop: 16, display: 'inline-flex', padding: 4, borderRadius: 15, background: 'rgba(255,255,255,0.06)' }}>
                {([[true, Globe, 'Public'], [false, Lock, 'Private']] as const).map(([v, I, l]) => (
                  <button key={l} type="button" role="radio" aria-checked={cal.is_public === v} onClick={() => setPrivacy(v)} style={{ height: 36, padding: '0 14px', borderRadius: 11, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, background: cal.is_public === v ? 'rgba(123,227,168,0.18)' : 'transparent', color: cal.is_public === v ? T.mintText : T.text2, fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 700 }}>
                    <I size={14} />{l}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* The shows, night by night */}
        <section aria-label="Shows" style={{ marginTop: 44 }}>
          {cal && !events.length && (
            <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 16, lineHeight: 1.55, color: T.text2 }}>{mine ? 'Nothing in it yet. Add the big nights below, or tap “Add to a calendar” on any event.' : 'Nothing in this calendar yet.'}</p>
          )}
          {groups.map(([day, list]) => {
            const d = parseDay(day)!;
            const past = day < todayIso();
            return (
              <div key={day} style={{ marginTop: 28, opacity: past ? 0.5 : 1 }}>
                <p style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontFamily: FONT.display, fontSize: 30, fontWeight: 800, letterSpacing: '-0.04em', color: T.white }}>{d.getDate()}</span>
                  <span style={{ fontFamily: FONT.sans, fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.mintText }}>{longDay(d).replace(/^\S+ \d+ /, '')} · {longDay(d).split(' ')[0]}</span>
                </p>
                <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 6 }}>
                  {list.map((e) => (
                    <li key={e.slug} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Link href={`/events/${e.slug}`} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0', textDecoration: 'none' }}>
                        {img(e, 200)
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={img(e, 200)!} alt="" width={54} height={68} style={{ width: 54, height: 68, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
                          : <span style={{ width: 54, height: 68, borderRadius: 12, flexShrink: 0, background: GRAD.card }} />}
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 17, fontWeight: 700, letterSpacing: '-0.015em', color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{listTitle(e.title)}</span>
                          <span style={{ display: 'block', marginTop: 3, fontFamily: FONT.sans, fontSize: 13.5, color: T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[e.time, e.venue].filter(Boolean).join(' · ')}</span>
                        </span>
                      </Link>
                      {mine && <button type="button" onClick={() => drop(e)} aria-label={`Remove ${e.title}`} style={{ width: 36, height: 36, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.06)', color: T.text3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={16} /></button>}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
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
