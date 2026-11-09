'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Check, Globe, Lock, Plus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { createCalendar, myCalendars, setInCalendar, type Calendar } from '@/lib/calendars';
import { T, FONT, GRAD, BTN } from '@/lib/thiscene';

const IDEAS = ['My Detty December', 'Christmas week', 'Owambe season', 'Shows with the squad'];

/**
 * "Add to a calendar": tick the calendars this event goes in, or start a new one (public or private).
 * Opens as a sheet from the bottom.
 */
export default function AddToCalendar({ eventSlug, eventTitle, onClose }: { eventSlug: string; eventTitle: string; onClose: () => void }) {
  const { user } = useAuth();
  const db = createClient();
  const [cals, setCals] = useState<(Calendar & { calendar_events: { event_slug: string }[] })[] | null>(null);
  const [making, setMaking] = useState(false);
  const [title, setTitle] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<Calendar | null>(null);

  useEffect(() => {
    if (!user) return;
    myCalendars(db, user.id).then((c) => { setCals(c); if (!c.length) setMaking(true); }).catch(() => setCals([]));
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const has = (c: { calendar_events: { event_slug: string }[] }) => c.calendar_events.some((e) => e.event_slug === eventSlug);
  const toggle = async (c: Calendar & { calendar_events: { event_slug: string }[] }) => {
    const on = !has(c);
    setCals((prev) => prev!.map((x) => (x.id === c.id ? { ...x, calendar_events: on ? [...x.calendar_events, { event_slug: eventSlug }] : x.calendar_events.filter((e) => e.event_slug !== eventSlug) } : x)));
    await setInCalendar(db, c.id, eventSlug, on);
  };
  const create = async () => {
    if (!user || !title.trim() || busy) return;
    setBusy(true);
    try {
      const c = await createCalendar(db, user.id, title, isPublic, eventSlug);
      setCals((prev) => [{ ...c, calendar_events: [{ event_slug: eventSlug }] }, ...(prev ?? [])]);
      setMade(c);
      setMaking(false);
    } catch { /* stays open to retry */ } finally { setBusy(false); }
  };

  const sheet = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400 }}>
      <button type="button" aria-label="Close" onClick={onClose} style={{ position: 'absolute', inset: 0, border: 'none', background: 'rgba(0,0,0,0.5)', cursor: 'pointer' }} />
      <section role="dialog" aria-label="Add to a calendar" style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, maxWidth: 560, margin: '0 auto', maxHeight: '86vh', overflowY: 'auto',
        padding: '18px 20px calc(22px + env(safe-area-inset-bottom, 0px))', borderRadius: '24px 24px 0 0',
        background: 'linear-gradient(180deg, rgba(16,34,25,0.98) 0%, rgba(9,18,13,0.99) 100%)', boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
        animation: 'atcUp 280ms cubic-bezier(0.22,1,0.36,1)',
      }}>
        <style>{'@keyframes atcUp{from{transform:translateY(60px);opacity:0}to{transform:none;opacity:1}}'}</style>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 21, fontWeight: 800, letterSpacing: '-0.025em', color: T.white }}>Add to a calendar</p>
            <p style={{ margin: '3px 0 0', fontFamily: FONT.sans, fontSize: 13.5, color: T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{eventTitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ width: 36, height: 36, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.08)', color: T.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        {!user ? (
          <div style={{ marginTop: 22 }}>
            <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.5, color: T.text }}>Make your own calendar of the shows you’re going to, like “My Detty December”, and share it with your friends.</p>
            <Link href={`/auth?next=/events/${eventSlug}`} style={{ ...BTN.primary, marginTop: 18, height: 50, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: 15 }}>Sign in to start one</Link>
          </div>
        ) : (
          <>
            {made && (
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, fontFamily: FONT.sans, fontSize: 14, color: T.mintText }}>
                <Check size={16} /> Added to {made.title}. <Link href={`/c/${made.slug}`} style={{ color: T.white, fontWeight: 700 }}>Open it</Link>
              </div>
            )}

            {cals && cals.length > 0 && (
              <ul style={{ listStyle: 'none', margin: '18px 0 0', padding: 0, display: 'grid', gap: 8 }}>
                {cals.map((c) => {
                  const on = has(c);
                  return (
                    <li key={c.id}>
                      <button type="button" onClick={() => toggle(c)} aria-pressed={on} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 16, border: 'none', cursor: 'pointer', textAlign: 'left', background: on ? 'rgba(123,227,168,0.14)' : 'rgba(255,255,255,0.05)' }}>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 15.5, fontWeight: 700, color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2, fontFamily: FONT.sans, fontSize: 12.5, color: T.text3 }}>
                            {c.is_public ? <Globe size={12} /> : <Lock size={12} />}{c.is_public ? 'Public' : 'Private'} · {c.calendar_events.length} {c.calendar_events.length === 1 ? 'event' : 'events'}
                          </span>
                        </span>
                        <span style={{ width: 28, height: 28, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? GRAD.mint : 'rgba(255,255,255,0.08)', color: on ? T.onMint : T.text3 }}>
                          {on ? <Check size={16} strokeWidth={3} /> : <Plus size={16} />}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {making ? (
              <div style={{ marginTop: 20 }}>
                <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.mintText }}>New calendar</p>
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} aria-label="Calendar name" placeholder="Name it anything, e.g. Owambe szn"
                  style={{ marginTop: 10, width: '100%', height: 50, padding: '0 16px', borderRadius: 14, border: 'none', outline: 'none', background: 'rgba(255,255,255,0.07)', color: T.white, fontFamily: FONT.sans, fontSize: 16, boxSizing: 'border-box' }} />
                <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 10 }}>
                  {IDEAS.map((i) => (
                    <button key={i} type="button" onClick={() => setTitle(i)} style={{ flexShrink: 0, height: 32, padding: '0 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: title === i ? 'rgba(123,227,168,0.16)' : 'rgba(255,255,255,0.06)', color: title === i ? T.mintText : T.text2, fontFamily: FONT.sans, fontSize: 13, fontWeight: 600 }}>{i}</button>
                  ))}
                </div>
                <div role="radiogroup" aria-label="Who can see it" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
                  {([[true, Globe, 'Public', 'Anyone with the link'], [false, Lock, 'Private', 'Only you']] as const).map(([v, I, l, d]) => (
                    <button key={l} type="button" role="radio" aria-checked={isPublic === v} onClick={() => setIsPublic(v)} style={{ padding: '12px 14px', borderRadius: 14, border: 'none', cursor: 'pointer', textAlign: 'left', background: isPublic === v ? 'rgba(123,227,168,0.14)' : 'rgba(255,255,255,0.05)', color: isPublic === v ? T.mintText : T.text2 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT.sans, fontSize: 14.5, fontWeight: 700 }}><I size={15} />{l}</span>
                      <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 12.5, color: T.text3 }}>{d}</span>
                    </button>
                  ))}
                </div>
                <button type="button" onClick={create} disabled={busy || !title.trim()} style={{ ...BTN.primary, marginTop: 16, width: '100%', height: 50, borderRadius: 999, cursor: 'pointer', fontSize: 15, opacity: busy ? 0.7 : 1 }}>
                  {busy ? 'Creating…' : 'Create and add'}
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setMaking(true)} style={{ marginTop: 14, height: 46, padding: '0 16px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.07)', color: T.white, fontFamily: FONT.sans, fontSize: 14.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Plus size={17} /> New calendar
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
  return typeof document !== 'undefined' ? createPortal(sheet, document.body) : null;
}
