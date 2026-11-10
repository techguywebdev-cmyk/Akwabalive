'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Link2, Inbox, ScanLine, ChevronRight, Clapperboard, Video } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import { StatusPill, Bar, ghs, card, type EventStatus } from '@/components/organizer/ui';
import { parseDay, shortDay } from '@/lib/dates';
import { hiRes } from '@/lib/events/image';
import { T, FONT, GRAD } from '@/lib/thiscene';
import { eventCounts, compact, type EventCounts } from '@/lib/events/track';
import { Eye, Users } from 'lucide-react';

type OrgEvent = {
  id: string; title: string; slug: string; date: string; time: string | null; venue: string; status: string;
  image_url: string | null; listing_type: string | null; ticket_source: string | null;
  ticket_tiers: { price: number; quantity: number; sold: number }[];
};
type Stats = { event_id: string; tickets: number; people: number; revenue: number; checked_in: number };

const isPast = (e: OrgEvent) => { const d = parseDay(e.date); return !!d && d.getTime() < new Date(new Date().toDateString()).getTime(); };
const statusOf = (e: OrgEvent): EventStatus => (e.status === 'pending_review' ? 'review' : e.status !== 'published' ? 'draft' : isPast(e) ? 'ended' : 'live');

function EventRow({ ev, st, seen }: { ev: OrgEvent; st?: Stats; seen?: EventCounts }) {
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
        {seen && (seen.seen7d > 0 || seen.going > 0) && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 600, color: T.mintText }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Eye size={13} /> {compact(seen.seen7d)} this week</span>
            {seen.going > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Users size={13} /> {compact(seen.going)} going</span>}
          </span>
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
  const [seen, setSeen] = useState<Record<string, EventCounts>>({});
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
      const slugs = ((data ?? []) as OrgEvent[]).filter((e) => e.status === 'published').map((e) => e.slug).slice(0, 60);
      if (slugs.length) eventCounts(slugs).then(setSeen).catch(() => {});
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
        <h1 style={{ margin: 0, fontFamily: FONT.display, fontSize: 'clamp(30px, 7vw, 40px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.02, background: GRAD.text, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Dashboard</h1>

        {/* The numbers, plain: no boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '18px 12px', marginTop: 22, paddingBottom: 22, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {([
            ['Tickets sold', sold.toLocaleString(), null],
            ['Money in', `₵${Math.round(revenue).toLocaleString()}`, null],
            ['Checked in', checked.toLocaleString(), sold > 0 ? `${Math.round((checked / sold) * 100)}%` : null],
            ['Live events', String(live.length), null],
            ['Seen this week', compact(Object.values(seen).reduce((n, c) => n + c.seen7d, 0)), null],
            ['Going', compact(Object.values(seen).reduce((n, c) => n + c.going, 0)), null],
          ] as [string, string, string | null][]).map(([label, value, note]) => (
            <div key={label} style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: FONT.display, fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: T.white, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
                {note && <span style={{ fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, color: T.mintText }}>{note}</span>}
              </div>
              <div style={{ marginTop: 2, fontFamily: FONT.sans, fontSize: 12.5, color: T.text3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Everything else, as quiet rows */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', columnGap: 18, marginTop: 10 }}>
          {([
            ['/organizer/scan', <ScanLine key="i" size={18} />, 'Scan tickets', 0],
            ['/organizer/events/from-link', <Link2 key="i" size={18} />, 'Add from a link', 0],
            ['/organisers/claim', <Users key="i" size={18} />, 'Claim an event', 0],
            ['/organizer/moments/post', <Video key="i" size={18} />, 'Post a moment', 0],
            ['/organizer/review', <Inbox key="i" size={18} />, 'Review queue', review],
            ['/organizer/moments', <Clapperboard key="i" size={18} />, 'Moments review', 0],
          ] as [string, React.ReactNode, string, number][]).map(([href, icon, label, badge]) => (
            <Link key={href} href={href} style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: 56, textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(123,227,168,0.1)', color: T.mint }}>{icon}</span>
              <span style={{ flex: 1, fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, color: T.white }}>{label}</span>
              {!!badge && <span style={{ minWidth: 22, height: 22, padding: '0 7px', boxSizing: 'border-box', borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: GRAD.mint, color: T.onMint, fontFamily: FONT.sans, fontSize: 12, fontWeight: 800 }}>{badge}</span>}
              <ChevronRight size={17} color="rgba(255,255,255,0.3)" />
            </Link>
          ))}
        </div>

        {/* Your events, with making a new one right where the events are */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 34 }}>
          <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 21, fontWeight: 800, letterSpacing: '-0.025em', color: T.white }}>Your events</h2>
          <Link href="/organizer/events/new" style={{ height: 36, padding: '0 14px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(123,227,168,0.12)', color: T.mintText, fontFamily: FONT.sans, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            <Plus size={16} strokeWidth={2.4} /> New event
          </Link>
        </div>
        <div role="tablist" aria-label="Your events" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginTop: 14, padding: 4, borderRadius: 16, background: 'rgba(255,255,255,0.05)' }}>
          {(['upcoming', 'past', 'drafts'] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} style={{ height: 40, padding: '0 6px', borderRadius: 12, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: FONT.sans, fontSize: 14, fontWeight: 700, background: tab === k ? 'rgba(123,227,168,0.16)' : 'transparent', color: tab === k ? T.mint : T.text2 }}>
              {k === 'upcoming' ? 'Upcoming' : k === 'past' ? 'Past' : 'Drafts'}
              {lists[k].length > 0 && <span style={{ marginLeft: 6, fontWeight: 600, opacity: 0.7 }}>{lists[k].length}</span>}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          {loading ? [0, 1, 2].map((i) => <div key={i} style={{ ...card, height: 96 }} />)
            : shown.length ? shown.map((ev) => <EventRow key={ev.id} ev={ev} st={stats[ev.id]} seen={seen[ev.slug]} />)
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
