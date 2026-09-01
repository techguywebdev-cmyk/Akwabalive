'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle, XCircle, Loader2, ExternalLink, Link2, AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import { C } from '@/lib/theme';

type ReviewEvent = {
  id: string;
  title: string;
  slug: string;
  date: string;
  date_label: string | null;
  venue: string;
  city: string;
  status: string;
  image_url: string | null;
  source_url: string | null;
  ticket_url: string | null;
  ticket_source: string | null;
  description: string | null;
  created_at: string;
  lineup: string[] | null;
  artist_slugs: string[] | null;
};

export default function ReviewQueuePage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [items, setItems] = useState<ReviewEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      window.location.href = '/auth';
      return;
    }
    load();
  }, [user, authLoading]);

  async function load() {
    setLoading(true);
    setError('');
    // pending_review = suggested / needs human check before going public
    const { data, error: err } = await supabase
      .from('events')
      .select(
        'id, title, slug, date, date_label, venue, city, status, image_url, source_url, ticket_url, ticket_source, description, created_at, lineup, artist_slugs',
      )
      .eq('organizer_id', user!.id)
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false });

    if (err) {
      setError(
        err.message.includes('pending_review')
          ? 'Your events.status check may need pending_review allowed. Use Save for review from Import link.'
          : err.message,
      );
      setItems([]);
    } else {
      setItems((data ?? []) as ReviewEvent[]);
    }
    setLoading(false);
  }

  async function approve(id: string) {
    setBusyId(id);
    setError('');
    const { error: err } = await supabase
      .from('events')
      .update({ status: 'published' })
      .eq('id', id)
      .eq('organizer_id', user!.id);
    if (err) setError(err.message);
    else {
      setItems((list) => list.filter((e) => e.id !== id));
      setNote('Published.');
      setTimeout(() => setNote(''), 2000);
    }
    setBusyId(null);
  }

  async function reject(id: string) {
    if (!confirm('Remove this suggestion? This cannot be undone.')) return;
    setBusyId(id);
    setError('');
    const { error: err } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
      .eq('organizer_id', user!.id);
    if (err) setError(err.message);
    else setItems((list) => list.filter((e) => e.id !== id));
    setBusyId(null);
  }

  async function keepDraft(id: string) {
    setBusyId(id);
    const { error: err } = await supabase
      .from('events')
      .update({ status: 'draft' })
      .eq('id', id)
      .eq('organizer_id', user!.id);
    if (err) setError(err.message);
    else setItems((list) => list.filter((e) => e.id !== id));
    setBusyId(null);
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <Nav active="Events" />
      <div style={{ paddingTop: 62, maxWidth: 720, margin: '0 auto', padding: '24px 16px 80px' }}>
        <Link
          href="/organizer/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--font-dm-mono,monospace)',
            fontSize: 8,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: C.c3,
            textDecoration: 'none',
            marginBottom: 20,
          }}
        >
          <ArrowLeft size={12} /> Dashboard
        </Link>

        <p
          style={{
            fontFamily: 'var(--font-dm-mono,monospace)',
            fontSize: 8,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: C.gold,
            marginBottom: 8,
          }}
        >
          Review queue
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-cormorant,serif)',
            fontSize: 32,
            fontWeight: 400,
            color: C.cream,
            margin: '0 0 8px',
          }}
        >
          Suggested events
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-inter,sans-serif)',
            fontSize: 14,
            color: C.c2,
            lineHeight: 1.5,
            marginBottom: 24,
          }}
        >
          Links you imported as <strong style={{ color: C.cream }}>Save for review</strong> land
          here. Approve to publish, keep as draft, or reject.
        </p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          <Link
            href="/organizer/events/from-link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: C.gold,
              color: C.onAccent,
              padding: '10px 14px',
              borderRadius: 8,
              fontFamily: 'var(--font-dm-mono,monospace)',
              fontSize: 9,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <Link2 size={14} /> Import from link
          </Link>
        </div>

        {note && (
          <p style={{ color: C.greenL, fontSize: 13, marginBottom: 12 }}>{note}</p>
        )}
        {error && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              background: 'rgba(206,17,38,0.1)',
              border: '1px solid rgba(206,17,38,0.25)',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <AlertCircle size={14} style={{ color: C.red, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>{error}</p>
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Loader2 size={22} color={C.gold} className="animate-spin" />
          </div>
        )}

        {!loading && items.length === 0 && (
          <div
            style={{
              padding: 32,
              textAlign: 'center',
              border: `1px solid ${C.bd}`,
              borderRadius: 12,
              background: C.bg2,
              color: C.c2,
              fontSize: 14,
            }}
          >
            Queue is empty. Import a link and choose <em>Save for review</em>.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {items.map((ev) => (
            <div
              key={ev.id}
              style={{
                background: C.bg2,
                border: `1px solid ${C.bd}`,
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', gap: 14, padding: 14 }}>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 10,
                    overflow: 'hidden',
                    background: C.bg3,
                    flexShrink: 0,
                  }}
                >
                  {ev.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ev.image_url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p
                    style={{
                      fontFamily: 'var(--font-dm-mono,monospace)',
                      fontSize: 8,
                      color: C.gold,
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      margin: '0 0 4px',
                    }}
                  >
                    {ev.date_label || ev.date} · {ev.city}
                  </p>
                  <h3
                    style={{
                      fontFamily: 'var(--font-cormorant,serif)',
                      fontSize: 20,
                      fontWeight: 400,
                      color: C.cream,
                      margin: '0 0 4px',
                    }}
                  >
                    {ev.title}
                  </h3>
                  <p style={{ fontSize: 12, color: C.c3, margin: 0 }}>
                    {ev.venue}
                  </p>
                  {ev.lineup && ev.lineup.length > 0 && (
                    <p style={{ fontSize: 11, color: C.c2, margin: '6px 0 0' }}>
                      Lineup: {ev.lineup.join(' · ')}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                    {ev.source_url && (
                      <a
                        href={ev.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: 11,
                          color: C.gold,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <ExternalLink size={11} /> Source
                      </a>
                    )}
                    {ev.ticket_url && (
                      <a
                        href={ev.ticket_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: 11,
                          color: C.c2,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <ExternalLink size={11} /> Tickets
                      </a>
                    )}
                    <Link
                      href={`/organizer/events/${ev.id}`}
                      style={{ fontSize: 11, color: C.c2 }}
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  padding: '12px 14px',
                  borderTop: `1px solid ${C.bd}`,
                }}
              >
                <button
                  type="button"
                  disabled={busyId === ev.id}
                  onClick={() => approve(ev.id)}
                  style={{
                    flex: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    background: C.gold,
                    color: C.onAccent,
                    border: 'none',
                    borderRadius: 8,
                    padding: 12,
                    fontFamily: 'var(--font-dm-mono,monospace)',
                    fontSize: 9,
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {busyId === ev.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle size={14} />
                  )}
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busyId === ev.id}
                  onClick={() => keepDraft(ev.id)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    color: C.c2,
                    border: `1px solid ${C.bd}`,
                    borderRadius: 8,
                    padding: 12,
                    fontFamily: 'var(--font-dm-mono,monospace)',
                    fontSize: 8,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  Draft
                </button>
                <button
                  type="button"
                  disabled={busyId === ev.id}
                  onClick={() => reject(ev.id)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    background: 'transparent',
                    color: '#f87171',
                    border: '1px solid rgba(206,17,38,0.3)',
                    borderRadius: 8,
                    padding: 12,
                    fontFamily: 'var(--font-dm-mono,monospace)',
                    fontSize: 8,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  <XCircle size={13} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
