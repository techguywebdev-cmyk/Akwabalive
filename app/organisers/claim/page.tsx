'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Search, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import Nav from '@/components/layout/Nav';
import { parseDay, shortDay } from '@/lib/dates';
import { T, FONT, GROUND, GRAD } from '@/lib/thiscene';

type Ev = { id: string; slug: string; title: string; date: string; venue: string; image_url: string | null };
const ROLES = ['Organiser', 'Promoter', 'Venue', 'Artist or artist team', 'SRC / committee'];

const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 16, background: '#0D1210', border: 'none', outline: 'none', color: T.white, fontFamily: FONT.sans, fontSize: 16 };
const label: React.CSSProperties = { display: 'block', margin: '18px 0 8px 2px', fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.text3 };

/** Claim an event we imported: tell us who you are and how we can tell it's yours; we move it to your account */
export default function ClaimPage() {
  const { user, loading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [ev, setEv] = useState<Ev | null>(null);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Ev[]>([]);
  const [soon, setSoon] = useState<Ev[]>([]);
  const [role, setRole] = useState(ROLES[0]);
  const [proof, setProof] = useState('');
  const [contact, setContact] = useState('');
  const [state, setState] = useState<'' | 'sending' | 'sent' | 'already'>('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) { window.location.href = `/auth?mode=signup&next=${encodeURIComponent(window.location.pathname + window.location.search)}`; return; }
    const slug = new URLSearchParams(window.location.search).get('event');
    if (slug) supabase.from('events').select('id, slug, title, date, venue, image_url').eq('slug', slug).maybeSingle().then(({ data }) => data && setEv(data as Ev));
  }, [user, loading, supabase]);

  useEffect(() => {
    if (!ev || !user) return;
    supabase.from('event_claims').select('status').eq('event_id', ev.id).eq('user_id', user.id).maybeSingle().then(({ data }) => { if (data) setState(data.status === 'pending' ? 'sent' : 'already'); });
  }, [ev, user, supabase]);

  useEffect(() => {
    if (!user) return;
    supabase.from('events').select('id, slug, title, date, venue, image_url').eq('status', 'published').eq('listing_type', 'listed')
      .not('image_url', 'is', null)
      .gte('date', new Date().toISOString().slice(0, 10)).order('date').limit(12)
      .then(({ data }) => setSoon((data ?? []) as Ev[]));
  }, [user, supabase]);

  useEffect(() => {
    if (ev || q.trim().length < 2) { setFound([]); return; }
    const t = setTimeout(() => {
      supabase.from('events').select('id, slug, title, date, venue, image_url').eq('status', 'published').eq('listing_type', 'listed')
        .gte('date', new Date().toISOString().slice(0, 10)).ilike('title', `%${q.trim()}%`).order('date').limit(8)
        .then(({ data }) => setFound((data ?? []) as Ev[]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, ev, supabase]);

  async function send() {
    if (!ev || !user) return;
    if (proof.trim().length < 6) { setErr('Tell us how we can check it’s yours.'); return; }
    setErr(''); setState('sending');
    const { error } = await supabase.from('event_claims').insert({ event_id: ev.id, user_id: user.id, role, proof: proof.trim(), contact: contact.trim() || null });
    if (error) { setState(''); setErr(/duplicate/i.test(error.message) ? 'You’ve already asked to claim this event.' : 'Couldn’t send that. Try again.'); return; }
    setState('sent');
  }

  const d = ev ? parseDay(ev.date) : null;
  const shown = q.trim().length >= 2 ? found : soon;
  return (
    <div style={{ minHeight: '100svh', background: GROUND }}>
      <Nav back="/organisers" />
      <main style={{ maxWidth: 620, margin: '0 auto', padding: 'calc(92px + env(safe-area-inset-top, 0px)) 20px 60px' }}>
        <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.mintText }}><BadgeCheck size={14} /> Claim an event</p>
        <h1 style={{ margin: '8px 0 0', fontFamily: FONT.display, fontSize: 'clamp(32px, 9vw, 44px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, background: GRAD.text, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{ev ? 'Make it yours' : 'Is this your event?'}</h1>

        {!ev ? (
          <>
            <ol style={{ listStyle: 'none', margin: '18px 0 0', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[['Find it', 'Search or tap your flyer'], ['Show us', 'Tell us how it’s yours'], ['It’s yours', 'Edit, sell tickets, see views']].map(([a, b], i) => (
                <li key={a}>
                  <span style={{ display: 'inline-grid', placeItems: 'center', width: 22, height: 22, borderRadius: 999, background: GRAD.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 11.5, fontWeight: 800 }}>{i + 1}</span>
                  <span style={{ display: 'block', marginTop: 8, fontFamily: FONT.display, fontSize: 14, fontWeight: 700, color: T.white }}>{a}</span>
                  <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 12.5, lineHeight: 1.35, color: T.text3 }}>{b}</span>
                </li>
              ))}
            </ol>

            <div style={{ position: 'relative', marginTop: 24 }}>
              <Search size={18} color={T.text3} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)' }} />
              <input id="q" aria-label="Find your event" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your event" style={{ ...field, paddingLeft: 48, borderRadius: 999, background: 'rgba(255,255,255,0.06)' }} />
            </div>

            <p style={{ ...label, margin: '24px 0 10px 2px' }}>{q.trim().length >= 2 ? (found.length ? `${found.length} found` : 'Nothing found') : 'Coming up on TsaCoal'}</p>
            {shown.length > 0 ? (
              <div className="ak-fade" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: 10 }}>
                {shown.map((e) => <FlyerTile key={e.id} e={e} onPick={() => { setEv(e); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />)}
              </div>
            ) : q.trim().length < 2 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: 10 }}>
                {Array.from({ length: 6 }).map((_, i) => <span key={i} className="ak-sk" style={{ aspectRatio: '4 / 5', borderRadius: 14 }} />)}
              </div>
            ) : null}

            <p style={{ margin: '26px 2px 0', fontFamily: FONT.sans, fontSize: 14, color: T.text2, textAlign: 'center' }}>Not on TsaCoal yet? <Link href="/organizer/events/new" style={{ color: T.mintText, fontWeight: 600, textDecoration: 'none' }}>List it yourself</Link></p>
          </>
        ) : (
          <>
            <div className="ak-pop" style={{ marginTop: 20, display: 'flex', gap: 16, alignItems: 'center' }}>
              <Flyer src={ev.image_url} w={112} />
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15, color: T.white }}>{ev.title}</p>
                <p style={{ margin: '6px 0 0', fontFamily: FONT.sans, fontSize: 13.5, color: T.text2 }}>{[d ? shortDay(d) : ev.date, ev.venue].filter(Boolean).join(' · ')}</p>
                {!state && <button type="button" onClick={() => setEv(null)} style={{ marginTop: 10, padding: 0, border: 'none', background: 'none', color: T.mintText, fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Not this one</button>}
              </div>
            </div>

            {state === 'sent' ? (
              <div className="ak-rise" style={{ marginTop: 28, textAlign: 'center' }}>
                <span style={{ display: 'inline-grid', placeItems: 'center', width: 52, height: 52, borderRadius: 999, background: GRAD.mint }}><Check size={24} color={T.onMint} /></span>
                <p style={{ margin: '14px 0 0', fontFamily: FONT.display, fontSize: 20, fontWeight: 800, color: T.white }}>Request sent</p>
                <p style={{ margin: '6px auto 0', maxWidth: 340, fontFamily: FONT.sans, fontSize: 14.5, lineHeight: 1.5, color: T.text2 }}>We’ll check and move it to your account, usually within a day. It’ll show up on your dashboard.</p>
                <Link href="/organizer/dashboard" style={{ display: 'inline-block', marginTop: 16, color: T.mintText, fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Go to your dashboard</Link>
              </div>
            ) : state === 'already' ? (
              <p style={{ marginTop: 24, fontFamily: FONT.sans, fontSize: 14.5, color: T.text2 }}>We’ve already looked at your request for this event. <Link href="/organizer/dashboard" style={{ color: T.mintText }}>Go to your dashboard</Link>.</p>
            ) : (
              <div style={{ marginTop: 10 }}>
                <label style={label}>You are the</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ROLES.map((r) => (
                    <button key={r} type="button" onClick={() => setRole(r)} aria-pressed={role === r} style={{ height: 38, padding: '0 14px', borderRadius: 999, cursor: 'pointer', fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 600, border: 'none', background: role === r ? GRAD.mint : 'rgba(255,255,255,0.06)', color: role === r ? T.onMint : T.text }}>{r}</button>
                  ))}
                </div>
                <label htmlFor="proof" style={label}>How can we tell it’s yours?</label>
                <textarea id="proof" value={proof} onChange={(e) => setProof(e.target.value)} rows={3} placeholder="The Instagram page that posted the flyer, your ticket page, or the number on the flyer" style={{ ...field, resize: 'vertical', lineHeight: 1.5 }} />
                <label htmlFor="contact" style={label}>Phone or WhatsApp <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>· optional</span></label>
                <input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} inputMode="tel" placeholder="024 000 0000" style={field} />
                {err && <p role="alert" style={{ margin: '12px 2px 0', fontFamily: FONT.sans, fontSize: 14, color: '#FF8A7A' }}>{err}</p>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginTop: 24 }}>
                  <span style={{ fontFamily: FONT.sans, fontSize: 12.5, lineHeight: 1.4, color: T.text3 }}>Usually checked within a day</span>
                  <button type="button" onClick={send} disabled={state === 'sending'} style={{ flexShrink: 0, height: 46, padding: '0 24px', borderRadius: 999, border: 'none', cursor: 'pointer', background: GRAD.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 15, fontWeight: 700, opacity: state === 'sending' ? 0.7 : 1 }}>
                    {state === 'sending' ? 'Sending…' : 'Claim it'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

/** Whole flyer, never cropped: contained over a blurred copy of itself */
function Flyer({ src, w }: { src: string | null; w?: number }) {
  return (
    <span style={{ position: 'relative', display: 'block', width: w ?? '100%', flexShrink: 0, aspectRatio: '4 / 5', borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
      {src && <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(14px) brightness(0.55)', transform: 'scale(1.2)' }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
      </>}
    </span>
  );
}

function FlyerTile({ e, onPick }: { e: Ev; onPick: () => void }) {
  const d = parseDay(e.date);
  return (
    <button type="button" onClick={onPick} aria-label={`Claim ${e.title}`} style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', minWidth: 0 }}>
      <Flyer src={e.image_url} />
      <span style={{ display: 'block', marginTop: 7, fontFamily: FONT.display, fontSize: 13, fontWeight: 700, lineHeight: 1.2, color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
      <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 11.5, color: T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d ? shortDay(d) : e.date}</span>
    </button>
  );
}
