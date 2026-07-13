'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus, TrendingUp, Ticket, Users, Eye,
  Calendar, MapPin, MoreVertical, Edit,
  Trash2, BarChart2, CheckCircle, Clock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';

const C = {
  bg: '#0D0B08', bg2: '#141109', bg3: '#1C1710', bg4: '#242018',
  gold: '#C8922A', goldDim: 'rgba(200,146,42,0.14)', goldBd: 'rgba(200,146,42,0.28)',
  cream: '#F5ECD7', c2: 'rgba(245,236,215,0.55)', c3: 'rgba(245,236,215,0.24)',
  c4: 'rgba(245,236,215,0.08)', bd: 'rgba(245,236,215,0.07)', bd2: 'rgba(245,236,215,0.13)',
  red: '#CE1126', green: '#2D6A4F', greenL: '#4ade80',
  greenDim: 'rgba(45,106,79,0.15)', greenBd: 'rgba(45,106,79,0.35)',
};

interface OrgEvent {
  id: string;
  title: string;
  slug: string;
  date: string;
  date_label: string;
  time: string;
  venue: string;
  city: string;
  category: string;
  status: string;
  image_url: string | null;
  created_at: string;
  ticket_tiers: { price: number; quantity: number; sold: number }[];
}

export default function OrganizerDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [events,  setEvents]  = useState<OrgEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { window.location.href = '/auth'; return; }
    loadEvents();
  }, [user, authLoading]);

  async function loadEvents() {
    const { data } = await supabase
      .from('events')
      .select('*, ticket_tiers(*)')
      .eq('organizer_id', user!.id)
      .order('created_at', { ascending: false });
    setEvents((data ?? []) as OrgEvent[]);
    setLoading(false);
  }

  async function deleteEvent(id: string) {
    if (!confirm('Delete this event? This cannot be undone.')) return;
    setDeleting(id);
    await supabase.from('events').delete().eq('id', id);
    setEvents(e => e.filter(ev => ev.id !== id));
    setDeleting(null);
  }

  async function togglePublish(ev: OrgEvent) {
    const newStatus = ev.status === 'published' ? 'draft' : 'published';
    await supabase.from('events').update({ status: newStatus }).eq('id', ev.id);
    setEvents(evs => evs.map(e => e.id === ev.id ? { ...e, status: newStatus } : e));
  }

  // Stats
  const totalRevenue  = events.flatMap(e => e.ticket_tiers).reduce((s, t) => s + (t.price * t.sold), 0);
  const totalTickets  = events.flatMap(e => e.ticket_tiers).reduce((s, t) => s + t.sold, 0);
  const publishedCount = events.filter(e => e.status === 'published').length;
  const totalViews    = events.length * 0; // placeholder until views tracking added

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <Nav active="Events" />
      <div style={{ paddingTop: 62 }}>

        {/* Header */}
        <div style={{ background: C.bg2, borderBottom: `1px solid ${C.bd}`, padding: '28px 20px 24px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'block', width: 16, height: 1, background: C.gold }} />
                  Organizer Dashboard
                </p>
                <h1 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 28, fontWeight: 300, color: C.cream, letterSpacing: '-0.5px' }}>
                  {profile?.full_name ?? 'Your Events'}
                </h1>
              </div>
              <Link href="/organizer/events/new"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.gold, color: '#0D0B08', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700, padding: '12px 20px', borderRadius: 8, textDecoration: 'none', flexShrink: 0 }}>
                <Plus size={14} /> Create Event
              </Link>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 24 }}>
              {[
                { icon: Ticket,    label: 'Tickets Sold',    value: totalTickets,                   color: C.gold  },
                { icon: TrendingUp, label: 'Total Revenue',  value: `₵${totalRevenue.toLocaleString()}`, color: C.greenL },
                { icon: Calendar,  label: 'Live Events',     value: publishedCount,                 color: C.gold  },
                { icon: BarChart2, label: 'Total Events',    value: events.length,                  color: C.c2   },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} style={{ background: C.bg3, border: `1px solid ${C.bd}`, borderRadius: 12, padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Icon size={14} style={{ color, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.c3 }}>{label}</span>
                  </div>
                  <p style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 28, fontWeight: 400, color: C.cream, letterSpacing: '-1px', lineHeight: 1 }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Events list */}
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px 80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 22, fontWeight: 400, color: C.cream }}>
              Your Events
            </h2>
            <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, color: C.c3 }}>
              {events.length} total
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: C.c3 }}>Loading…</p>
            </div>
          ) : events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 20px', background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 16 }}>
              <Calendar size={40} style={{ color: C.c3, margin: '0 auto 16px', display: 'block', opacity: 0.4 }} />
              <p style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 24, color: C.c2, marginBottom: 8 }}>No events yet</p>
              <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c3, marginBottom: 24, maxWidth: 280, margin: '0 auto 24px', lineHeight: 1.6 }}>
                Create your first event and start selling tickets to thousands of Ghanaians.
              </p>
              <Link href="/organizer/events/new"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.gold, color: '#0D0B08', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700, padding: '13px 24px', borderRadius: 8, textDecoration: 'none' }}>
                <Plus size={14} /> Create First Event
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {events.map(ev => {
                const totalSold     = ev.ticket_tiers.reduce((s, t) => s + t.sold, 0);
                const totalCapacity = ev.ticket_tiers.reduce((s, t) => s + t.quantity, 0);
                const revenue       = ev.ticket_tiers.reduce((s, t) => s + (t.price * t.sold), 0);
                const pct           = totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0;

                return (
                  <div key={ev.id} style={{ background: C.bg2, border: `1px solid ${ev.status === 'published' ? C.goldBd : C.bd}`, borderRadius: 14, overflow: 'hidden' }}>
                    {ev.status === 'published' && (
                      <div style={{ height: 2, background: `linear-gradient(to right, ${C.gold}, rgba(200,146,42,0.2))` }} />
                    )}
                    <div style={{ display: 'flex', gap: 0 }}>
                      {/* Image */}
                      <div style={{ width: 90, flexShrink: 0, backgroundImage: ev.image_url ? `url(${ev.image_url})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', background: ev.image_url ? undefined : C.bg3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {!ev.image_url && <Calendar size={20} style={{ color: C.c3, opacity: 0.4 }} />}
                      </div>

                      <div style={{ flex: 1, padding: '16px 18px', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                              <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 3, background: ev.status === 'published' ? C.greenDim : C.c4, color: ev.status === 'published' ? C.greenL : C.c3, border: `1px solid ${ev.status === 'published' ? C.greenBd : C.bd}` }}>
                                {ev.status === 'published' ? '● Live' : '○ Draft'}
                              </span>
                              <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1px', textTransform: 'uppercase', color: C.c3 }}>{ev.category}</span>
                            </div>
                            <h3 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 18, fontWeight: 400, color: C.cream, lineHeight: 1.2, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {ev.title}
                            </h3>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3 }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={10} style={{ color: C.gold }} />{ev.date_label || ev.date}</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={10} style={{ color: C.gold }} />{ev.venue}</span>
                            </div>
                          </div>
                        </div>

                        {/* Sales stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                          {[
                            { label: 'Sold',    value: totalSold    },
                            { label: 'Revenue', value: `₵${revenue.toLocaleString()}` },
                            { label: 'Fill',    value: `${pct}%`    },
                          ].map(stat => (
                            <div key={stat.label} style={{ background: C.bg3, borderRadius: 8, padding: '8px 10px' }}>
                              <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.c3, marginBottom: 3 }}>{stat.label}</p>
                              <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 14, color: C.cream, letterSpacing: '-0.5px' }}>{stat.value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Progress bar */}
                        {totalCapacity > 0 && (
                          <div style={{ height: 3, background: C.bd, borderRadius: 2, marginBottom: 14, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? C.red : pct > 50 ? C.gold : C.green, borderRadius: 2, transition: 'width 600ms ease' }} />
                          </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            onClick={() => togglePublish(ev)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '1.5px', textTransform: 'uppercase', border: `1px solid ${ev.status === 'published' ? C.bd : C.goldBd}`, background: ev.status === 'published' ? 'transparent' : C.goldDim, color: ev.status === 'published' ? C.c3 : C.gold, padding: '8px 14px', borderRadius: 6, cursor: 'pointer', transition: 'all 180ms' }}>
                            {ev.status === 'published' ? <><Clock size={11} /> Unpublish</> : <><CheckCircle size={11} /> Publish</>}
                          </button>
                          <Link href={`/organizer/events/${ev.id}`}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '1.5px', textTransform: 'uppercase', border: `1px solid ${C.bd}`, background: 'transparent', color: C.c2, padding: '8px 14px', borderRadius: 6, textDecoration: 'none' }}>
                            <Edit size={11} /> Edit
                          </Link>
                          {ev.status === 'published' && (
                            <Link href={`/events/${ev.slug}`}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '1.5px', textTransform: 'uppercase', border: `1px solid ${C.bd}`, background: 'transparent', color: C.c2, padding: '8px 14px', borderRadius: 6, textDecoration: 'none' }}>
                              <Eye size={11} /> View
                            </Link>
                          )}
                          <button
                            onClick={() => deleteEvent(ev.id)}
                            disabled={deleting === ev.id}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '1.5px', textTransform: 'uppercase', border: '1px solid rgba(206,17,38,0.2)', background: 'transparent', color: 'rgba(206,17,38,0.6)', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', marginLeft: 'auto' }}>
                            <Trash2 size={11} /> {deleting === ev.id ? '…' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
