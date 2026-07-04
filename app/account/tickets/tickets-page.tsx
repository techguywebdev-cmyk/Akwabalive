'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Ticket, QrCode, Calendar, MapPin, Users, Clock, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import type { Ticket as TicketType } from '@/lib/supabase/types';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import { events } from '@/lib/data/events';

const C = {
  bg: '#0D0B08', bg2: '#141109', bg3: '#1C1710', bg4: '#242018',
  gold: '#C8922A', goldDim: 'rgba(200,146,42,0.14)', goldBd: 'rgba(200,146,42,0.28)',
  cream: '#F5ECD7', c2: 'rgba(245,236,215,0.55)', c3: 'rgba(245,236,215,0.24)',
  c4: 'rgba(245,236,215,0.08)', bd: 'rgba(245,236,215,0.07)', bd2: 'rgba(245,236,215,0.13)',
  red: '#CE1126', green: '#2D6A4F', greenL: '#4ade80',
  greenDim: 'rgba(45,106,79,0.15)', greenBd: 'rgba(45,106,79,0.35)',
};

function QRCode({ value }: { value: string }) {
  // Deterministic pseudo-QR from string hash
  const hash = value.split('').reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0);
  const cells = Array.from({ length: 49 }, (_, i) => ((hash * (i + 1)) % 7) > 2);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, padding: 12, background: '#fff', borderRadius: 8, width: 120, height: 120 }}>
      {cells.map((on, i) => (
        <div key={i} style={{ background: on ? '#0D0B08' : 'transparent', borderRadius: 1 }} />
      ))}
    </div>
  );
}

function TicketCard({ ticket }: { ticket: TicketType }) {
  const [expanded, setExpanded] = useState(false);
  const ev = events.find(e => e.slug === ticket.event_slug);
  const isUpcoming = new Date(ticket.event_date) >= new Date();
  const ref = `AKW-${ticket.id.slice(0, 8).toUpperCase()}`;

  return (
    <div style={{ background: C.bg2, border: `1px solid ${isUpcoming ? C.goldBd : C.bd}`, borderRadius: 16, overflow: 'hidden', transition: 'all 200ms' }}>
      {/* Top accent */}
      {isUpcoming && (
        <div style={{ height: 3, background: `linear-gradient(to right, ${C.gold}, rgba(200,146,42,0.2))` }} />
      )}

      {/* Event image strip */}
      {ev && (
        <div style={{ position: 'relative', height: 120, backgroundImage: `url(${ev.image})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.5) saturate(0.7)' }}>
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${C.bg2} 0%, transparent 60%)` }} />
          <div style={{ position: 'absolute', top: 12, left: 14, display: 'flex', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '4px 9px', borderRadius: 3, background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBd}` }}>
              {ticket.ticket_tier}
            </span>
            <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '4px 9px', borderRadius: 3, background: isUpcoming ? C.greenDim : C.c4, color: isUpcoming ? C.greenL : C.c3, border: `1px solid ${isUpcoming ? C.greenBd : C.bd}` }}>
              {isUpcoming ? '● Upcoming' : '✓ Attended'}
            </span>
            {ticket.gifted_by && (
              <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '4px 9px', borderRadius: 3, background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBd}` }}>
                🎁 Gifted
              </span>
            )}
          </div>
        </div>
      )}

      <div style={{ padding: '16px 18px' }}>
        <h3 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 20, fontWeight: 400, color: C.cream, lineHeight: 1.15, marginBottom: 10 }}>
          {ticket.event_title}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { icon: Calendar, text: ticket.event_date },
            { icon: Clock,    text: ev?.time ?? '—'  },
            { icon: MapPin,   text: ticket.event_venue },
            { icon: Ticket,   text: `${ticket.quantity} ticket${ticket.quantity > 1 ? 's' : ''}` },
          ].map(({ icon: Icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3 }}>
              <Icon size={11} style={{ color: C.gold, flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: `1px solid ${C.bd}`, marginBottom: expanded ? 16 : 0 }}>
          <div>
            <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.c3, marginBottom: 2 }}>Total paid</p>
            <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 18, color: ticket.total_paid === 0 ? C.greenL : C.cream, letterSpacing: '-0.5px' }}>
              {ticket.total_paid === 0 ? 'FREE' : `₵${ticket.total_paid.toLocaleString()}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setExpanded(e => !e)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '1.5px', textTransform: 'uppercase', border: `1px solid ${C.bd}`, background: 'transparent', color: C.c2, padding: '9px 14px', borderRadius: 7, cursor: 'pointer', transition: 'all 180ms' }}
            >
              <QrCode size={13} />
              {expanded ? 'Hide' : 'Show QR'}
              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          </div>
        </div>

        {/* Expanded QR + ticket details */}
        {expanded && (
          <div style={{ borderTop: `1px solid ${C.bd}`, paddingTop: 20 }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* QR Code */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <QRCode value={ref} />
                <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '1px', color: C.c3, textAlign: 'center' }}>Scan at the door</p>
              </div>

              {/* Ticket details */}
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { label: 'Ref',    value: ref                  },
                    { label: 'Tier',   value: ticket.ticket_tier   },
                    { label: 'Qty',    value: `${ticket.quantity}` },
                    { label: 'Status', value: ticket.status        },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${C.bd}` }}>
                      <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.c3 }}>{row.label}</span>
                      <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: C.cream }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '1.5px', textTransform: 'uppercase', border: `1px solid ${C.bd}`, background: 'transparent', color: C.c2, padding: '9px', borderRadius: 6, cursor: 'pointer' }}>
                    <Share2 size={11} /> Share
                  </button>
                  {ev && (
                    <Link href={`/events/${ev.slug}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '1.5px', textTransform: 'uppercase', border: `1px solid ${C.goldBd}`, background: C.goldDim, color: C.gold, padding: '9px', borderRadius: 6, cursor: 'pointer', textDecoration: 'none' }}>
                      View Event
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Add to calendar */}
            {isUpcoming && ev && (
              <a
                href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${ticket.event_date.replace(/-/g, '')}/${ticket.event_date.replace(/-/g, '')}&details=${encodeURIComponent(`Ticket ref: ${ref}\nVenue: ${ticket.event_venue}`)}&location=${encodeURIComponent(ticket.event_venue + ', Ghana')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', background: C.bg3, border: `1px solid ${C.bd}`, borderRadius: 7, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.c2, textDecoration: 'none' }}
              >
                <Calendar size={12} /> Add to Google Calendar
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyTicketsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = createClient();
  const [tickets,  setTickets]  = useState<TicketType[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<'all' | 'upcoming' | 'past'>('all');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { window.location.href = '/auth'; return; }

    supabase
      .from('tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setTickets((data ?? []) as TicketType[]);
        setLoading(false);
      });
  }, [user, authLoading]);

  const upcoming = tickets.filter(t => new Date(t.event_date) >= new Date());
  const past     = tickets.filter(t => new Date(t.event_date) <  new Date());
  const shown    = filter === 'upcoming' ? upcoming : filter === 'past' ? past : tickets;

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <Nav active="Events" />
      <div style={{ paddingTop: 62, maxWidth: 680, margin: '0 auto', padding: '80px 20px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <Link href={`/u/${profile?.username ?? ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.c3, textDecoration: 'none', marginBottom: 20 }}>
            <ArrowLeft size={12} /> My Profile
          </Link>
          <h1 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 32, fontWeight: 300, color: C.cream, letterSpacing: '-1px', marginBottom: 6 }}>
            My Tickets
          </h1>
          <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c3 }}>
            {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} · {upcoming.length} upcoming
          </p>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {([
            { key: 'all',      label: `All (${tickets.length})`   },
            { key: 'upcoming', label: `Upcoming (${upcoming.length})` },
            { key: 'past',     label: `Past (${past.length})`     },
          ] as { key: typeof filter; label: string }[]).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 999, border: `1px solid ${filter === f.key ? C.goldBd : C.bd}`, background: filter === f.key ? C.goldDim : 'transparent', color: filter === f.key ? C.gold : C.c3, cursor: 'pointer', transition: 'all 180ms' }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Tickets */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: C.c3 }}>Loading…</p>
          </div>
        ) : shown.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Ticket size={40} style={{ color: C.c3, margin: '0 auto 16px', display: 'block', opacity: 0.4 }} />
            <p style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 24, color: C.c2, marginBottom: 8 }}>
              {filter === 'upcoming' ? 'No upcoming events' : filter === 'past' ? 'No past events' : 'No tickets yet'}
            </p>
            <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c3, marginBottom: 20 }}>
              {filter === 'all' ? 'Buy a ticket to get started' : 'Check a different filter'}
            </p>
            <Link href="/events" style={{ display: 'inline-block', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, textDecoration: 'none', border: `1px solid ${C.goldBd}`, padding: '11px 22px', borderRadius: 6, background: C.goldDim }}>
              Browse Events
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {shown.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
