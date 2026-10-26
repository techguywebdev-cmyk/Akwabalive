'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, ExternalLink, Share2, ScanLine, Eye, EyeOff, Search, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import { Stat, StatusPill, Bar, ghs, card, type EventStatus } from '@/components/organizer/ui';
import { parseDay, longDay } from '@/lib/dates';
import { hiRes } from '@/lib/events/image';
import { T, FONT } from '@/lib/thiscene';

type Ev = {
  id: string; title: string; slug: string; date: string; time: string | null; venue: string; status: string; image_url: string | null;
  listing_type: string | null; ticket_source: string | null;
  ticket_tiers: { id: string; name: string; price: number; quantity: number; sold: number }[];
};
type Row = { ticket_id: string; holder: string; username: string | null; avatar_url: string | null; tier: string; quantity: number; total_paid: number; status: string; checked_in_at: string | null; bought_at: string };

const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const btn: React.CSSProperties = { height: 44, padding: '0 16px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: T.white, fontFamily: FONT.sans, fontSize: 14, fontWeight: 600 };

export default function ManageEventPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [ev, setEv] = useState<Ev | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [missing, setMissing] = useState(false);
  const [q, setQ] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { window.location.href = `/auth?next=${encodeURIComponent(`/organizer/events/${params.id}/manage`)}`; return; }
    (async () => {
      const { data } = await supabase.from('events').select('id, title, slug, date, time, venue, status, image_url, listing_type, ticket_source, ticket_tiers(id, name, price, quantity, sold)').eq('id', params.id).eq('organizer_id', user.id).maybeSingle();
      if (!data) { setMissing(true); return; }
      setEv(data as Ev);
      const { data: t } = await supabase.rpc('organiser_event_tickets', { p_event_id: params.id });
      if (Array.isArray(t)) setRows(t as Row[]);
    })();
  }, [user, authLoading, params.id, supabase]);

  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(''), 2200); };

  async function togglePublish() {
    if (!ev) return;
    const next = ev.status === 'published' ? 'draft' : 'published';
    const { error } = await supabase.from('events').update({ status: next }).eq('id', ev.id);
    if (error) flash(error.message); else { setEv({ ...ev, status: next }); flash(next === 'published' ? 'Event is live' : 'Event hidden from the site'); }
  }
  async function share() {
    if (!ev) return;
    const url = `${window.location.origin}/events/${ev.slug}`;
    try { if (navigator.share) { await navigator.share({ title: ev.title, url }); return; } await navigator.clipboard.writeText(url); flash('Link copied'); } catch { /* cancelled */ }
  }

  if (missing) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Nav active="Dashboard" back="/organizer/dashboard" />
        <main style={{ maxWidth: 560, margin: '0 auto', padding: '120px 20px', textAlign: 'center' }}>
          <p style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 700, color: T.white }}>We couldn’t find that event in your account.</p>
          <Link href="/organizer/dashboard" style={{ ...btn, marginTop: 12 }}>Back to dashboard</Link>
        </main>
      </div>
    );
  }

  const d = ev ? parseDay(ev.date) : null;
  const past = !!d && d.getTime() < new Date(new Date().toDateString()).getTime();
  const status: EventStatus = !ev ? 'draft' : ev.status === 'pending_review' ? 'review' : ev.status !== 'published' ? 'draft' : past ? 'ended' : 'live';
  const hosted = ev?.listing_type !== 'listed';
  const tiers = [...(ev?.ticket_tiers ?? [])].sort((a, b) => a.price - b.price);
  const capacity = tiers.reduce((s, t) => s + (t.quantity || 0), 0);
  const people = rows.reduce((s, r) => s + r.quantity, 0);
  const revenue = rows.reduce((s, r) => s + Number(r.total_paid), 0);
  const checked = rows.filter((r) => r.status === 'used').reduce((s, r) => s + r.quantity, 0);
  const shown = rows.filter((r) => !q || `${r.holder} ${r.username ?? ''} ${r.tier}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div style={{ minHeight: '100vh' }}>
      <Nav active="Dashboard" back="/organizer/dashboard" />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: 'calc(88px + env(safe-area-inset-top, 0px)) 20px 40px' }}>
        <Link href="/organizer/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT.sans, fontSize: 14, color: T.text2, textDecoration: 'none' }}><ArrowLeft size={16} /> Dashboard</Link>

        {!ev ? <div style={{ ...card, height: 120, marginTop: 16 }} /> : (
          <>
            <div style={{ display: 'flex', gap: 16, marginTop: 16, alignItems: 'center' }}>
              <span style={{ width: 84, height: 104, flexShrink: 0, borderRadius: 16, overflow: 'hidden', background: '#06120C' }}>
                {ev.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={hiRes(ev.image_url, 300) ?? ev.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </span>
              <div style={{ minWidth: 0 }}>
                <StatusPill status={status} />
                <h1 style={{ margin: '8px 0 0', fontFamily: FONT.display, fontSize: 'clamp(24px, 6vw, 34px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, color: T.white }}>{ev.title}</h1>
                <p style={{ margin: '6px 0 0', fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>{[d ? longDay(d) : ev.date, ev.time, ev.venue].filter(Boolean).join(' · ')}</p>
              </div>
            </div>

            <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '18px -20px 0', padding: '0 20px' }}>
              {hosted && !past && <Link href={`/organizer/scan?event=${ev.id}`} style={{ ...btn, background: T.mint, color: T.onMint, border: 'none' }}><ScanLine size={18} /> Scan tickets</Link>}
              <Link href={`/organizer/events/${ev.id}`} style={btn}><Pencil size={17} /> Edit</Link>
              <button type="button" onClick={togglePublish} style={btn}>{ev.status === 'published' ? <><EyeOff size={17} /> Unpublish</> : <><Eye size={17} /> Publish</>}</button>
              <button type="button" onClick={share} style={btn}><Share2 size={17} /> Share</button>
              <Link href={`/events/${ev.slug}`} style={btn}><ExternalLink size={17} /> View page</Link>
            </div>
            {note && <p role="status" style={{ margin: '10px 0 0', fontFamily: FONT.sans, fontSize: 14, color: T.mintText }}>{note}</p>}

            {!hosted ? (
              <div style={{ ...card, padding: 18, marginTop: 22 }}>
                <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.5, color: T.text2 }}>
                  This event is <strong style={{ color: T.white }}>listed</strong>: tickets are sold on {ev.ticket_source || 'another site'}, so sales and check-ins aren’t tracked here.
                  Sell your next event on Akwaaba to get MoMo and card payments, live sales here and QR check-in at the door.
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 22 }}>
                  <Stat label="Sold" value={`${people}${capacity ? ` / ${capacity}` : ''}`} note={capacity ? `${Math.max(0, capacity - people)} left` : undefined} />
                  <Stat label="Money in" value={ghs(revenue)} note={revenue > 0 ? 'Before Paystack fees' : undefined} />
                  <Stat label="Checked in" value={String(checked)} note={people ? `${Math.round((checked / people) * 100)}% arrived` : undefined} />
                  <Stat label="Orders" value={String(rows.length)} />
                </div>

                <h2 style={{ margin: '30px 0 12px', fontFamily: FONT.display, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>Ticket types</h2>
                <div style={{ ...card, padding: '4px 16px' }}>
                  {tiers.length ? tiers.map((t, i) => (
                    <div key={t.id} style={{ padding: '14px 0', borderTop: i ? `1px solid ${T.hairline}` : 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, color: T.white }}>{t.name} <span style={{ color: T.text2, fontWeight: 500 }}>· {t.price === 0 ? 'Free' : ghs(t.price)}</span></span>
                        <span style={{ fontFamily: FONT.sans, fontSize: 14, color: T.text2, whiteSpace: 'nowrap' }}>{t.sold} / {t.quantity}</span>
                      </div>
                      <Bar value={t.sold} max={t.quantity} color={t.sold >= t.quantity ? '#F5C451' : T.mint} />
                    </div>
                  )) : <p style={{ fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>No ticket types yet. <Link href={`/organizer/events/${ev.id}`} style={{ color: T.mintText }}>Add them</Link>.</p>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '30px 0 12px' }}>
                  <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>Attendees</h2>
                  <span style={{ fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>{rows.length} order{rows.length === 1 ? '' : 's'}</span>
                </div>
                {rows.length > 4 && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, height: 48, padding: '0 16px', borderRadius: 16, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: T.text2, marginBottom: 10 }}>
                    <Search size={18} />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or ticket" aria-label="Search attendees" style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: T.white, fontFamily: FONT.sans, fontSize: 15 }} />
                  </label>
                )}
                <div style={{ ...card, padding: '2px 16px' }}>
                  {shown.length ? shown.map((r, i) => (
                    <div key={r.ticket_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i ? `1px solid ${T.hairline}` : 'none' }}>
                      <span style={{ width: 38, height: 38, borderRadius: 19, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1F5A3F', color: '#D6FBE6', fontFamily: FONT.sans, fontSize: 14, fontWeight: 700 }}>
                        {r.avatar_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={r.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : r.holder[0]?.toUpperCase()}
                      </span>
                      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.holder}</span>
                        <span style={{ fontFamily: FONT.sans, fontSize: 13, color: T.text2 }}>{r.tier}{r.quantity > 1 ? ` × ${r.quantity}` : ''} · {Number(r.total_paid) === 0 ? 'Free' : ghs(Number(r.total_paid))}</span>
                      </span>
                      {r.status === 'used'
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: T.mint, whiteSpace: 'nowrap' }}><Check size={15} strokeWidth={2.5} /> {r.checked_in_at ? clock(r.checked_in_at) : 'In'}</span>
                        : <span style={{ fontFamily: FONT.sans, fontSize: 13, color: T.text3, whiteSpace: 'nowrap' }}>Not yet</span>}
                    </div>
                  )) : <p style={{ fontFamily: FONT.sans, fontSize: 14, color: T.text2, padding: '8px 0' }}>{rows.length ? 'No one matches that search.' : 'No tickets sold yet. Share the event to get going.'}</p>}
                </div>
              </>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
