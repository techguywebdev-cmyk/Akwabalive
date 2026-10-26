'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Pencil, Clock, X, RefreshCw, ExternalLink, Link2, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import { card, ghs } from '@/components/organizer/ui';
import { parseDay, shortDay } from '@/lib/dates';
import { hiRes } from '@/lib/events/image';
import { T, FONT } from '@/lib/thiscene';

type Item = {
  id: string; title: string; date: string; time: string | null; venue: string; city: string; image_url: string | null;
  source_url: string | null; ticket_url: string | null; ticket_source: string | null; description: string | null;
  ticket_tiers: { name: string; price: number; is_available: boolean | null }[];
};

const pill: React.CSSProperties = { height: 44, padding: '0 16px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap', fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: T.white };
const mint: React.CSSProperties = { ...pill, background: T.mint, color: T.onMint, border: 'none' };

function ReviewCard({ ev, busy, onApprove, onLater, onReject }: { ev: Item; busy: boolean; onApprove: () => void; onLater: () => void; onReject: () => void }) {
  const [confirmReject, setConfirmReject] = useState(false);
  const d = parseDay(ev.date);
  const tiers = ev.ticket_tiers.filter((t) => t.is_available !== false).sort((a, b) => a.price - b.price);
  const prices = tiers.length ? tiers.map((t) => `${t.name} ${t.price === 0 ? 'Free' : ghs(t.price)}`).join(' · ') : 'No prices found';
  return (
    <article style={{ ...card, padding: 14, display: 'flex', flexDirection: 'column', gap: 14, opacity: busy ? 0.5 : 1, transition: 'opacity 200ms ease' }}>
      <div style={{ display: 'flex', gap: 14 }}>
        <a href={ev.image_url ?? undefined} target="_blank" rel="noopener noreferrer" aria-label="Open flyer" style={{ width: 92, height: 115, flexShrink: 0, borderRadius: 14, overflow: 'hidden', background: '#06120C', display: 'block' }}>
          {ev.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hiRes(ev.image_url, 300) ?? ev.image_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </a>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 600, color: T.mintText }}>{d ? shortDay(d) : ev.date}{ev.time && !/tba/i.test(ev.time) ? ` · ${ev.time.toLowerCase()}` : ''}</span>
          <h3 style={{ margin: 0, fontFamily: FONT.display, fontSize: 17, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.2, color: T.white, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{ev.title}</h3>
          <span style={{ fontFamily: FONT.sans, fontSize: 13, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.venue}</span>
          <span style={{ fontFamily: FONT.sans, fontSize: 13, color: tiers.length ? 'rgba(255,255,255,0.85)' : T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prices}</span>
          {(ev.source_url || ev.ticket_url) && (
            <a href={ev.source_url || ev.ticket_url!} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 600, color: T.mintText, textDecoration: 'none' }}>
              From {ev.ticket_source || 'source'} <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>
      {ev.description && <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 13.5, lineHeight: 1.45, color: T.text2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{ev.description}</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" disabled={busy} onClick={onApprove} style={{ ...mint, flex: 1 }}><Check size={17} strokeWidth={2.4} /> Approve</button>
        <Link href={`/organizer/events/${ev.id}`} style={pill} aria-label="Edit before approving"><Pencil size={16} /></Link>
        <button type="button" disabled={busy} onClick={onLater} style={pill} aria-label="Keep as draft" title="Keep as draft"><Clock size={16} /></button>
        {confirmReject ? (
          <button type="button" disabled={busy} onClick={onReject} onBlur={() => setConfirmReject(false)} autoFocus style={{ ...pill, background: 'rgba(255,107,107,0.16)', borderColor: 'rgba(255,107,107,0.5)', color: '#FF8A8A' }}>Delete it</button>
        ) : (
          <button type="button" disabled={busy} onClick={() => setConfirmReject(true)} style={pill} aria-label="Reject"><X size={17} /></button>
        )}
      </div>
    </article>
  );
}

export default function ReviewQueuePage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [showLinks, setShowLinks] = useState(false);
  const [links, setLinks] = useState('');
  const [adding, setAdding] = useState(false);

  const token = async () => (await supabase.auth.getSession()).data.session?.access_token;

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error: e } = await supabase.from('events')
      .select('id, title, date, time, venue, city, image_url, source_url, ticket_url, ticket_source, description, ticket_tiers(name, price, is_available)')
      .eq('organizer_id', user.id).eq('status', 'pending_review').order('date', { ascending: true });
    if (e) setError(e.message); else setItems((data ?? []) as Item[]);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { window.location.href = `/auth?next=${encodeURIComponent('/organizer/review')}`; return; }
    load();
  }, [user, authLoading, load]);

  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(''), 4000); };

  async function setStatus(id: string, status: 'published' | 'draft', msg: string) {
    setBusy(id); setError('');
    const { error: e } = await supabase.from('events').update({ status }).eq('id', id).eq('organizer_id', user!.id);
    setBusy(null);
    if (e) setError(e.message); else { setItems((l) => l.filter((x) => x.id !== id)); flash(msg); }
  }
  async function reject(id: string) {
    setBusy(id); setError('');
    const { error: e } = await supabase.from('events').delete().eq('id', id).eq('organizer_id', user!.id);
    setBusy(null);
    if (e) setError(e.message); else { setItems((l) => l.filter((x) => x.id !== id)); flash('Removed'); }
  }
  async function approveAll() {
    setError('');
    const { error: e } = await supabase.from('events').update({ status: 'published' }).in('id', items.map((x) => x.id)).eq('organizer_id', user!.id);
    if (e) setError(e.message); else { flash(`${items.length} events published`); setItems([]); }
  }
  async function importNow() {
    setImporting(true); setError('');
    try {
      const t = await token();
      const res = await fetch('/api/events/cron/import-events', { method: 'POST', headers: t ? { Authorization: `Bearer ${t}` } : {} });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || 'Import failed');
      flash(j.added.length ? `${j.added.length} new event${j.added.length === 1 ? '' : 's'} found` : 'No new events right now. Checked again tomorrow morning.');
      await load();
    } catch (e: any) { setError(e.message); } finally { setImporting(false); }
  }
  async function addLinks() {
    const urls = links.split(/\s+/).map((s) => s.trim()).filter((s) => /^https?:\/\//.test(s));
    if (!urls.length) { setError('Paste at least one link starting with https://'); return; }
    setAdding(true); setError('');
    try {
      const t = await token();
      const res = await fetch('/api/events/ingest/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: JSON.stringify({ urls, forceReview: true }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Could not read those links');
      const ok = (j.results || []).filter((r: any) => r.ok).length;
      flash(`${ok} of ${urls.length} link${urls.length === 1 ? '' : 's'} added`);
      setLinks('');
      await load();
    } catch (e: any) { setError(e.message); } finally { setAdding(false); }
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Nav active="Dashboard" back="/organizer/dashboard" />
      <main style={{ maxWidth: 680, margin: '0 auto', padding: 'calc(88px + env(safe-area-inset-top, 0px)) 20px 40px' }}>
        <Link href="/organizer/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT.sans, fontSize: 14, color: T.text2, textDecoration: 'none' }}><ArrowLeft size={16} /> Dashboard</Link>
        <h1 style={{ margin: '12px 0 0', fontFamily: FONT.display, fontSize: 'clamp(30px, 7vw, 40px)', fontWeight: 800, letterSpacing: '-0.035em', color: T.white }}>Review queue</h1>
        <p style={{ margin: '6px 0 0', fontFamily: FONT.sans, fontSize: 14.5, lineHeight: 1.5, color: T.text2 }}>
          Events found on Egotickets, AllEvents and Eventbrite wait here. Nothing goes on the site until you approve it.
        </p>

        <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
          <button type="button" onClick={importNow} disabled={importing} style={mint}><RefreshCw size={17} className={importing ? 'animate-spin' : undefined} /> {importing ? 'Checking sites…' : 'Find new events'}</button>
          {items.length > 1 && <button type="button" onClick={approveAll} style={pill}><Check size={17} /> Approve all {items.length}</button>}
        </div>
        {(note || error) && <p role={error ? 'alert' : 'status'} style={{ margin: '12px 0 0', padding: '10px 14px', borderRadius: 14, background: error ? 'rgba(255,138,138,0.12)' : 'rgba(123,227,168,0.12)', color: error ? T.danger : T.mintText, fontFamily: FONT.sans, fontSize: 14 }}>{error || note}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
          {loading ? [0, 1].map((i) => <div key={i} style={{ ...card, height: 200 }} />)
            : items.length ? items.map((ev) => (
              <ReviewCard key={ev.id} ev={ev} busy={busy === ev.id}
                onApprove={() => setStatus(ev.id, 'published', 'Published')}
                onLater={() => setStatus(ev.id, 'draft', 'Moved to drafts')}
                onReject={() => reject(ev.id)} />
            )) : (
              <div style={{ ...card, padding: '40px 20px', textAlign: 'center' }}>
                <span style={{ display: 'inline-flex', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', background: 'rgba(123,227,168,0.12)', color: T.mint }}><Check size={28} /></span>
                <p style={{ margin: '14px 0 0', fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: T.white }}>All caught up</p>
                <p style={{ margin: '6px 0 0', fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>New events from ticket sites arrive every morning.</p>
              </div>
            )}
        </div>

        {/* Paste links */}
        <section style={{ ...card, marginTop: 22, padding: 16 }}>
          <button type="button" onClick={() => setShowLinks((v) => !v)} aria-expanded={showLinks} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: T.white, textAlign: 'left' }}>
            <Link2 size={19} color={T.mint} />
            <span style={{ flex: 1, fontFamily: FONT.display, fontSize: 16, fontWeight: 700 }}>Add events from links</span>
            <ChevronDown size={19} style={{ transform: showLinks ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }} />
          </button>
          {showLinks && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 13.5, lineHeight: 1.45, color: T.text2 }}>Paste Instagram, X or ticket-site links, one per line. Akwaaba reads the flyer and details and adds them here.</p>
              <textarea value={links} onChange={(e) => setLinks(e.target.value)} rows={4} placeholder={'https://www.instagram.com/p/…\nhttps://egotickets.com/events/…'} style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: T.white, fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.5, outline: 'none', resize: 'vertical' }} />
              <button type="button" onClick={addLinks} disabled={adding} style={{ ...mint, alignSelf: 'flex-start' }}>{adding ? 'Reading links…' : 'Add to queue'}</button>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
