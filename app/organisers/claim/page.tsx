'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Search, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import Nav from '@/components/layout/Nav';
import { parseDay, shortDay } from '@/lib/dates';
import { T, FONT, GROUND } from '@/lib/thiscene';

type Ev = { id: string; slug: string; title: string; date: string; venue: string; image_url: string | null };
const ROLES = ['Organiser', 'Promoter', 'Venue', 'Artist or artist team', 'SRC / committee'];

const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 16, background: '#0D1210', border: `1px solid ${T.hairlineStrong}`, outline: 'none', color: T.white, fontFamily: FONT.sans, fontSize: 16 };
const label: React.CSSProperties = { display: 'block', margin: '18px 0 8px 2px', fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.text3 };

/** Claim an event we imported: tell us who you are and how we can tell it's yours; we move it to your account */
export default function ClaimPage() {
  const { user, loading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [ev, setEv] = useState<Ev | null>(null);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Ev[]>([]);
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
  return (
    <div style={{ minHeight: '100svh', background: GROUND }}>
      <Nav back="/organisers" />
      <main style={{ maxWidth: 560, margin: '0 auto', padding: 'calc(92px + env(safe-area-inset-top, 0px)) 20px 60px' }}>
        <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.mintText }}><BadgeCheck size={14} /> Claim an event</p>
        <h1 style={{ margin: '8px 0 0', fontFamily: FONT.display, fontSize: 'clamp(30px, 8vw, 40px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.02, color: T.white }}>Is this your event?</h1>
        <p style={{ margin: '10px 0 0', fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.55, color: T.text2 }}>Once we’ve checked, it moves to your account: you can edit it, add tickets and see who’s seen it.</p>

        {!ev ? (
          <>
            <label htmlFor="q" style={label}>Find your event</label>
            <div style={{ position: 'relative' }}>
              <Search size={18} color={T.text3} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
              <input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Event name" style={{ ...field, paddingLeft: 46 }} />
            </div>
            <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
              {found.map((e) => <EventCard key={e.id} e={e} onPick={() => setEv(e)} />)}
              {q.trim().length >= 2 && !found.length && <p style={{ margin: '6px 2px', fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>Not on Akwaaba yet? <Link href="/organizer/events/new" style={{ color: T.mintText }}>List it</Link>.</p>}
            </div>
          </>
        ) : (
          <>
            <div style={{ marginTop: 22 }}><EventCard e={ev} sub={[d ? shortDay(d) : ev.date, ev.venue].filter(Boolean).join(' · ')} onPick={state ? undefined : () => setEv(null)} pickLabel="Change" /></div>
            {state === 'sent' ? (
              <div style={{ marginTop: 18, padding: '18px 18px', borderRadius: 20, background: 'rgba(123,227,168,0.08)', border: '1px solid rgba(123,227,168,0.25)' }}>
                <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT.display, fontSize: 17, fontWeight: 700, color: T.white }}><Check size={18} color={T.mintText} /> Request sent</p>
                <p style={{ margin: '6px 0 0', fontFamily: FONT.sans, fontSize: 14.5, lineHeight: 1.5, color: T.text2 }}>We’ll check and move it to your account, usually within a day. It’ll show up on your organiser dashboard.</p>
              </div>
            ) : state === 'already' ? (
              <p style={{ marginTop: 18, fontFamily: FONT.sans, fontSize: 14.5, color: T.text2 }}>We’ve already looked at your request for this event. <Link href="/organizer/dashboard" style={{ color: T.mintText }}>Go to your dashboard</Link>.</p>
            ) : (
              <>
                <label style={label}>You are the</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ROLES.map((r) => (
                    <button key={r} type="button" onClick={() => setRole(r)} aria-pressed={role === r} style={{ height: 40, padding: '0 14px', borderRadius: 999, cursor: 'pointer', fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, border: role === r ? 'none' : `1px solid ${T.hairlineStrong}`, background: role === r ? T.mint : 'transparent', color: role === r ? T.onMint : T.text }}>{r}</button>
                  ))}
                </div>
                <label htmlFor="proof" style={label}>How can we tell it’s yours?</label>
                <textarea id="proof" value={proof} onChange={(e) => setProof(e.target.value)} rows={3} placeholder="Your Instagram page that posted the flyer, your ticket page, or the number on the flyer" style={{ ...field, resize: 'vertical', lineHeight: 1.5 }} />
                <label htmlFor="contact" style={label}>Phone or WhatsApp (optional)</label>
                <input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} inputMode="tel" placeholder="024 000 0000" style={field} />
                {err && <p role="alert" style={{ margin: '12px 2px 0', fontFamily: FONT.sans, fontSize: 14, color: '#FF8A7A' }}>{err}</p>}
                <button type="button" onClick={send} disabled={state === 'sending'} style={{ marginTop: 22, width: '100%', height: 54, borderRadius: 999, border: 'none', cursor: 'pointer', background: T.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 15.5, fontWeight: 700 }}>
                  {state === 'sending' ? 'Sending…' : 'Claim this event'}
                </button>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function EventCard({ e, sub, onPick, pickLabel = 'This one' }: { e: Ev; sub?: string; onPick?: () => void; pickLabel?: string }) {
  const d = parseDay(e.date);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 18, background: T.surface, border: `1px solid ${T.hairline}` }}>
      <span style={{ width: 52, height: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.06)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {e.image_url && <img src={e.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 15.5, fontWeight: 700, color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
        <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 13, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub ?? [d ? shortDay(d) : e.date, e.venue].filter(Boolean).join(' · ')}</span>
      </span>
      {onPick && <button type="button" onClick={onPick} style={{ flexShrink: 0, height: 36, padding: '0 14px', borderRadius: 18, border: `1px solid ${T.hairlineStrong}`, background: 'transparent', color: T.white, fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>{pickLabel}</button>}
    </div>
  );
}
