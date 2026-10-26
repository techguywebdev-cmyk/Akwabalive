'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Link2, Inbox, ScanLine, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import { Stat, StatusPill, Bar, QuickAction, ghs, card, type EventStatus } from '@/components/organizer/ui';
import { parseDay, shortDay } from '@/lib/dates';
import { hiRes } from '@/lib/events/image';
import { T, FONT } from '@/lib/thiscene';

type OrgEvent = {
  id: string; title: string; slug: string; date: string; time: string | null; venue: string; status: string;
  image_url: string | null; listing_type: string | null; ticket_source: string | null;
  ticket_tiers: { price: number; quantity: number; sold: number }[];
};
type Stats = { event_id: string; tickets: number; people: number; revenue: number; checked_in: number };

const isPast = (e: OrgEvent) => { const d = parseDay(e.date); return !!d && d.getTime() < new Date(new Date().toDateString()).getTime(); };
const statusOf = (e: OrgEvent): EventStatus => (e.status === 'pending_review' ? 'review' : e.status !== 'published' ? 'draft' : isPast(e) ? 'ended' : 'live');

function EventRow({ ev, st }: { ev: OrgEvent; st?: Stats }) {
  const d = parseDay(ev.date);
  const hosted = ev.listing_type !== 'listed';
  const capacity = ev.ticket_tiers.reduce((s, t) => s + (t.quantity || 0), 0);
  const sold = st?.people ?? ev.ticket_tiers.reduce((s, t) => s + (t.sold || 0), 0);
  return (
    <Link href={`/organizer/events/${ev.id}/manage`} style={{ ...card, display: 'flex', alignItems: 'stretch', overflow: 'hidden', textDecoration: 'none', color: T.white }}>
      <span style={{ position: 'relative', width: 78, flexShrink: 0, background: '#06120C' }}>
        {ev.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hiRes(ev.image_url, 300) ?? ev.image_url} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </span>
      <span style={{ flex: 1, minWidth: 0, padding: '13px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusPill status={statusOf(ev)} />
          <span style={{ fontFamily: FONT.sans, fontSize: 12.5, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d ? shortDay(d) : ev.date}</span>
        </span>
        <span style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</span>
        {hosted && capacity > 0 ? (
          <span style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Bar value={sold} max={capacity} />
            <span style={{ fontFamily: FONT.sans, fontSize: 12.5, color: T.text2 }}>{sold} / {capacity} sold{st && st.revenue > 0 ? ` · ${ghs(st.revenue)}` : ''}</span>
          </span>
        ) : (
          <span style={{ fontFamily: FONT.sans, fontSize: 12.5, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hosted ? 'No ticket types yet' : `Listed · tickets on ${ev.ticket_source || 'another site'}`}</span>
        )}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', paddingRight: 12, color: T.text3 }}><ChevronRight size={20} /></span>
    </Link>
  );
}

export default function OrganizerDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [events, setEvents] = useState<OrgEvent[]>([]);
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'past' | 'drafts'>('upcoming');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { window.location.href = `/auth?next=${encodeURIComponent('/organizer/dashboard')}`; return; }
    (async () => {
      const [{ data }, { data: s }] = await Promise.all([
        supabase.from('events').select('id, title, slug, date, time, venue, status, image_url, listing_type, ticket_source, ticket_tiers(price, quantity, sold)').eq('organizer_id', user.id).order('date', { ascending: true }),
        supabase.rpc('organiser_event_stats'),
      ]);
      setEvents((data ?? []) as OrgEvent[]);
      if (Array.isArray(s)) setStats(Object.fromEntries((s as Stats[]).map((x) => [x.event_id, x])));
      setLoading(false);
    })();
  }, [user, authLoading, supabase]);

  const all = Object.values(stats);
  const sold = all.reduce((n, s) => n + s.people, 0);
  const revenue = all.reduce((n, s) => n + Number(s.revenue), 0);
  const checked = all.reduce((n, s) => n + s.checked_in, 0);
  const live = events.filter((e) => statusOf(e) === 'live');
  const review = events.filter((e) => e.status === 'pending_review').length;
  const lists = {
    upcoming: live,
    past: events.filter((e) => e.status === 'published' && isPast(e)).reverse(),
    drafts: events.filter((e) => e.status !== 'published'),
  };
  const shown = lists[tab];
  const first = (profile?.full_name || profile?.username || '').split(' ')[0];

  return (
    <div style={{ minHeight: '100vh' }}>
      <Nav active="Dashboard" />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: 'calc(88px + env(safe-area-inset-top, 0px)) 20px 40px' }}>
        <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>Organiser</p>
        <h1 style={{ margin: '4px 0 0', fontFamily: FONT.display, fontSize: 'clamp(32px, 7vw, 44px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.02, color: T.white }}>
          {first ? `Hi ${first}` : 'Your events'}
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 22 }}>
          <Stat label="Tickets sold" value={sold.toLocaleString()} />
          <Stat label="Money in" value={ghs(revenue)} note={revenue > 0 ? 'Before Paystack fees' : undefined} />
          <Stat label="Checked in" value={checked.toLocaleString()} note={sold > 0 ? `${Math.round((checked / sold) * 100)}% of tickets` : undefined} />
          <Stat label="Live events" value={String(live.length)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginTop: 14 }}>
          <QuickAction primary href="/organizer/events/new" icon={<Plus size={22} strokeWidth={2.2} />} label="Create event" />
          <QuickAction href="/organizer/scan" icon={<ScanLine size={22} strokeWidth={2} />} label="Scan tickets" />
          <QuickAction href="/organizer/events/from-link" icon={<Link2 size={22} strokeWidth={2} />} label="Add from a link" />
          <QuickAction href="/organizer/review" icon={<Inbox size={22} strokeWidth={2} />} label="Review queue" badge={review} />
        </div>

        <div role="tablist" aria-label="Your events" style={{ display: 'inline-flex', marginTop: 30, padding: 4, borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {(['upcoming', 'past', 'drafts'] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} style={{ height: 38, padding: '0 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, background: tab === k ? T.white : 'transparent', color: tab === k ? T.onMint : T.text2 }}>
              {k === 'upcoming' ? 'Upcoming' : k === 'past' ? 'Past' : 'Drafts & review'}{lists[k].length ? ` · ${lists[k].length}` : ''}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          {loading ? [0, 1, 2].map((i) => <div key={i} style={{ ...card, height: 96 }} />)
            : shown.length ? shown.map((ev) => <EventRow key={ev.id} ev={ev} st={stats[ev.id]} />)
            : (
              <div style={{ ...card, padding: '36px 20px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 19, fontWeight: 700, color: T.white }}>{tab === 'upcoming' ? 'No live events' : tab === 'past' ? 'No past events yet' : 'No drafts'}</p>
                <p style={{ margin: '6px 0 0', fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>Create an event to sell tickets with MoMo and card, or add one from a link.</p>
              </div>
            )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
