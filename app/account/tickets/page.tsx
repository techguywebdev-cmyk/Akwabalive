'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import type { Ticket } from '@/lib/supabase/types';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import QrCode from '@/components/tickets/QrCode';
import { Icon } from '@/components/ui/Icon';
import { BTN } from '@/components/events/CardParts';
import { parseDay, shortDay, longDay } from '@/lib/dates';
import { hiRes } from '@/lib/events/image';
import { T, FONT, EASE } from '@/lib/thiscene';

type EventInfo = { slug: string; image_url: string | null; time: string | null; city: string | null };

const today = () => new Date(new Date().toDateString()).getTime();
const isPast = (t: Ticket) => { const d = parseDay(t.event_date); return !!d && d.getTime() < today(); };
const refOf = (t: Ticket) => `AKW-${t.id.slice(0, 8).toUpperCase()}`;

/* ── Full-screen pass with the QR code ─────────────────────────────── */
function Pass({ ticket, ev, qrKey, holder, onClose }: { ticket: Ticket; ev?: EventInfo; qrKey?: string; holder: string; onClose: () => void }) {
  const [shown, setShown] = useState(false);
  const d = parseDay(ticket.event_date);
  const used = ticket.status === 'used';
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(t); document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const url = qrKey && typeof window !== 'undefined' ? `${window.location.origin}/t/${ticket.id}?k=${qrKey}` : '';

  return (
    <div role="dialog" aria-modal="true" aria-label={`Ticket for ${ticket.event_title}`} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(1,4,3,0.94)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', overflowY: 'auto', opacity: shown ? 1 : 0, transition: 'opacity 240ms ease' }}>
      <div style={{ maxWidth: 420, margin: '0 auto', padding: 'calc(16px + env(safe-area-inset-top, 0px)) 16px calc(28px + env(safe-area-inset-bottom, 0px))', transform: shown ? 'none' : 'translateY(24px)', transition: `transform 320ms ${EASE.sheet}` }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button type="button" aria-label="Close" onClick={onClose} style={{ width: 44, height: 44, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: T.white, cursor: 'pointer' }}>
            <Icon name="close" size={20} />
          </button>
        </div>

        <article style={{ borderRadius: 28, overflow: 'hidden', background: '#0B1F15', boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}>
          {/* Flyer strip */}
          <div style={{ position: 'relative', height: 150, background: '#06120C' }}>
            {ev?.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hiRes(ev.image_url, 900) ?? ev.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }} />
            )}
            <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(11,31,21,0) 30%, #0B1F15 100%)' }} />
          </div>

          <div style={{ padding: '0 22px 22px', marginTop: -26, position: 'relative' }}>
            <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 26, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em', color: T.white }}>{ticket.event_title}</h2>
            <p style={{ margin: '8px 0 0', fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>
              {[d ? longDay(d) : ticket.event_date, ev?.time].filter(Boolean).join(' · ')}
            </p>
            <p style={{ margin: '2px 0 0', fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>{ticket.event_venue}</p>
          </div>

          {/* Perforation */}
          <div aria-hidden style={{ position: 'relative', height: 0, borderTop: '2px dashed rgba(255,255,255,0.14)', margin: '0 18px' }}>
            <span style={{ position: 'absolute', left: -32, top: -13, width: 24, height: 24, borderRadius: 12, background: '#020504' }} />
            <span style={{ position: 'absolute', right: -32, top: -13, width: 24, height: 24, borderRadius: 12, background: '#020504' }} />
          </div>

          <div style={{ padding: '24px 22px 26px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            {url ? (
              <div style={{ position: 'relative', padding: 14, borderRadius: 20, background: '#fff' }}>
                <QrCode value={url} size={232} label={`QR code for ticket ${refOf(ticket)}`} />
                {used && (
                  <div style={{ position: 'absolute', inset: 0, borderRadius: 20, background: 'rgba(255,255,255,0.86)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ padding: '8px 16px', borderRadius: 999, background: '#03130B', color: T.mint, fontFamily: FONT.display, fontSize: 15, fontWeight: 700 }}>Checked in</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ width: 260, height: 260, borderRadius: 20, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box', textAlign: 'center', fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.5, color: T.text2 }}>
                Your QR code is being set up. Show your ticket reference at the door for now.
              </div>
            )}
            <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 13, color: T.text2, textAlign: 'center' }}>
              {used ? 'This ticket has been used.' : 'Turn your screen brightness up and show this at the door.'}
            </p>
          </div>

          <dl style={{ margin: 0, padding: '0 22px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              ['Name', holder || '—'],
              ['Ticket', `${ticket.ticket_tier}${ticket.quantity > 1 ? ` × ${ticket.quantity}` : ''}`],
              ['Reference', refOf(ticket)],
              ['Paid', ticket.total_paid === 0 ? 'Free' : `GH₵ ${Number(ticket.total_paid).toLocaleString()}`],
            ].map(([k, v]) => (
              <div key={k}>
                <dt style={{ fontFamily: FONT.sans, fontSize: 12, color: T.text3 }}>{k}</dt>
                <dd style={{ margin: '3px 0 0', fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, color: T.white, overflowWrap: 'anywhere' }}>{v}</dd>
              </div>
            ))}
          </dl>
        </article>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <Link href={`/events/${ticket.event_slug}`} onClick={onClose} style={{ ...BTN.secondary, flex: 1 }}>Event details</Link>
          {d && !isPast(ticket) && (
            <a
              href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ticket.event_title)}&dates=${ticket.event_date.slice(0, 10).replace(/-/g, '')}/${ticket.event_date.slice(0, 10).replace(/-/g, '')}&details=${encodeURIComponent(`Ticket ${refOf(ticket)}`)}&location=${encodeURIComponent(`${ticket.event_venue}, Ghana`)}`}
              target="_blank" rel="noopener noreferrer" style={{ ...BTN.secondary, flex: 1 }}
            >
              <Icon name="calendarAdd" size={18} /> Calendar
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── One ticket in the list ────────────────────────────────────────── */
function TicketRow({ ticket, ev, onOpen }: { ticket: Ticket; ev?: EventInfo; onOpen: () => void }) {
  const d = parseDay(ticket.event_date);
  const past = isPast(ticket);
  return (
    <button type="button" onClick={onOpen} style={{ display: 'flex', alignItems: 'stretch', gap: 0, width: '100%', padding: 0, textAlign: 'left', cursor: 'pointer', borderRadius: 22, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: T.white, opacity: past ? 0.7 : 1 }}>
      <span style={{ width: 96, flexShrink: 0, background: '#06120C', position: 'relative' }}>
        {ev?.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hiRes(ev.image_url, 400) ?? ev.image_url} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </span>
      <span style={{ flex: 1, minWidth: 0, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 600, color: past ? T.text3 : T.mintText }}>{d ? shortDay(d) : ticket.event_date}{ev?.time ? ` · ${ev.time.toLowerCase()}` : ''}</span>
        <span style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.event_title}</span>
        <span style={{ fontFamily: FONT.sans, fontSize: 13, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.ticket_tier}{ticket.quantity > 1 ? ` × ${ticket.quantity}` : ''} · {ticket.event_venue}</span>
      </span>
      <span style={{ display: 'flex', alignItems: 'center', padding: '0 16px 0 4px', color: past ? T.text3 : T.mint }}>
        <Icon name={ticket.status === 'used' ? 'check' : 'ticket'} size={22} />
      </span>
    </button>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */
export default function MyTicketsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [events, setEvents] = useState<Record<string, EventInfo>>({});
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [open, setOpen] = useState<Ticket | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { window.location.href = `/auth?next=${encodeURIComponent('/account/tickets')}`; return; }
    (async () => {
      const { data } = await supabase.from('tickets').select('*').or(`user_id.eq.${user.id},gifted_to.eq.${user.id}`).order('event_date', { ascending: true });
      const list = (data ?? []) as Ticket[];
      setTickets(list);
      const slugs = Array.from(new Set(list.map((t) => t.event_slug)));
      if (slugs.length) {
        const { data: evs } = await supabase.from('events').select('slug, image_url, time, city').in('slug', slugs);
        setEvents(Object.fromEntries((evs ?? []).map((e: EventInfo) => [e.slug, e])));
      }
      // Signed QR keys (made in the database; empty until the ticket QR migration is applied)
      const { data: k } = await supabase.rpc('my_ticket_keys');
      if (Array.isArray(k)) setKeys(Object.fromEntries(k.map((r: { ticket_id: string; qr_key: string }) => [r.ticket_id, r.qr_key])));
      setLoading(false);
    })();
  }, [user, authLoading, supabase]);

  const upcoming = tickets.filter((t) => !isPast(t));
  const past = tickets.filter(isPast).reverse();
  const shown = tab === 'upcoming' ? upcoming : past;
  const holder = profile?.full_name || profile?.username || '';
  const close = useCallback(() => setOpen(null), []);

  // Open straight to a ticket after buying: /account/tickets?open=<id>
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('open');
    if (id && tickets.length) { const t = tickets.find((x) => x.id === id); if (t) setOpen(t); }
  }, [tickets]);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Nav active="My tickets" />
      <main style={{ maxWidth: 640, margin: '0 auto', padding: 'calc(88px + env(safe-area-inset-top, 0px)) 20px 40px' }}>
        <h1 style={{ margin: 0, fontFamily: FONT.display, fontSize: 'clamp(34px, 8vw, 48px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1, color: T.white }}>My tickets</h1>

        <div role="tablist" aria-label="Upcoming or past" style={{ display: 'inline-flex', marginTop: 20, padding: 4, borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {(['upcoming', 'past'] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} style={{ height: 40, padding: '0 18px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, background: tab === k ? T.white : 'transparent', color: tab === k ? T.onMint : T.text2 }}>
              {k === 'upcoming' ? `Upcoming${upcoming.length ? ` · ${upcoming.length}` : ''}` : `Past${past.length ? ` · ${past.length}` : ''}`}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 22 }}>
          {loading ? (
            [0, 1].map((i) => <div key={i} style={{ height: 96, borderRadius: 22, background: 'rgba(255,255,255,0.04)' }} />)
          ) : shown.length ? (
            shown.map((t) => (
              <div key={t.id}>
                <TicketRow ticket={t} ev={events[t.event_slug]} onOpen={() => setOpen(t)} />
                {tab === 'past' && (
                  <Link href={`/events/${t.event_slug}?rate=1`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: '10px 0 4px 6px', fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: '#F5C451', textDecoration: 'none' }}>
                    ★ Rate this show
                  </Link>
                )}
              </div>
            ))
          ) : (
            <div style={{ padding: '56px 8px', textAlign: 'center' }}>
              <span style={{ display: 'inline-flex', width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', background: 'rgba(123,227,168,0.1)', color: T.mint }}><Icon name="ticket" size={28} /></span>
              <p style={{ margin: '16px 0 0', fontFamily: FONT.display, fontSize: 22, fontWeight: 700, color: T.white }}>{tab === 'upcoming' ? 'No upcoming tickets' : 'No past tickets yet'}</p>
              <p style={{ margin: '6px 0 20px', fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>Tickets you buy or RSVP to on Akwaaba show up here with a QR code for the door.</p>
              <Link href="/" style={BTN.primary}>Find events</Link>
            </div>
          )}
        </div>
      </main>
      <Footer />

      {open && <Pass ticket={open} ev={events[open.event_slug]} qrKey={keys[open.id]} holder={holder} onClose={close} />}
    </div>
  );
}
