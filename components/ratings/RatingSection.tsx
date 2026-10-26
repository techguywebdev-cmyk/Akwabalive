'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { BadgeCheck, X, PenLine } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { BTN } from '@/components/events/CardParts';
import { ASPECTS, fmtScore, type AspectKey, type RatingSummary } from '@/lib/ratings';
import { Stars, StarInput } from '@/components/ratings/Stars';
import { T, FONT, EASE } from '@/lib/thiscene';

type Status = { can_rate: boolean; reason?: string; verified?: boolean; event_date?: string; rating?: Record<string, unknown> | null };
type Review = { id: string; username: string | null; name: string | null; avatar_url: string | null; overall: number; review: string | null; verified: boolean; created_at: string };

const OVERALL_WORDS = ['', 'Poor', 'Not great', 'Good', 'Great', 'Unforgettable'];

/* ── Rate sheet ─────────────────────────────────────────────────────── */

function RateSheet({ slug, title, status, onClose, onSaved }: { slug: string; title: string; status: Status; onClose: () => void; onSaved: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const prev = (status.rating ?? {}) as Record<string, number | string | null>;
  const [overall, setOverall] = useState(Number(prev.overall ?? 0));
  const [aspects, setAspects] = useState<Record<AspectKey, number>>({
    performance: Number(prev.performance ?? 0), sound: Number(prev.sound ?? 0), organisation: Number(prev.organisation ?? 0),
    vibe: Number(prev.vibe ?? 0), value: Number(prev.value ?? 0),
  });
  const [review, setReview] = useState(String(prev.review ?? ''));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [shown, setShown] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(raf); document.body.style.overflow = old; window.removeEventListener('keydown', onKey); };
  }, []);

  async function save() {
    if (!overall) { setErr('Tap the stars to give an overall rating.'); return; }
    setBusy(true); setErr('');
    const { data, error } = await supabase.rpc('rate_event', {
      p_slug: slug, p_overall: overall, p_performance: aspects.performance, p_sound: aspects.sound, p_organisation: aspects.organisation,
      p_vibe: aspects.vibe, p_value: aspects.value, p_review: review,
    });
    setBusy(false);
    if (error || !data?.ok) { setErr(data?.reason === 'not_yet' ? 'You can rate this once the event has happened.' : 'Could not save your rating. Try again.'); return; }
    onSaved();
  }

  return createPortal(
    <div role="dialog" aria-modal aria-label={`Rate ${title}`} style={{ position: 'fixed', inset: 0, zIndex: 330 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', opacity: shown ? 1 : 0, transition: 'opacity 280ms ease' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, maxWidth: 560, margin: '0 auto', maxHeight: '92svh', overflowY: 'auto',
        background: 'linear-gradient(180deg, #0B2619 0%, #05130C 100%)', borderRadius: '26px 26px 0 0', borderTop: `1px solid ${T.hairlineStrong}`,
        padding: '10px 20px calc(24px + env(safe-area-inset-bottom, 0px))', transform: shown ? 'none' : 'translateY(100%)', transition: `transform 420ms ${EASE.sheet}`,
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 13, color: T.text3 }}>Rate the show</p>
            <h2 style={{ margin: '2px 0 0', fontFamily: FONT.display, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ width: 40, height: 40, borderRadius: 20, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: T.white, cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ marginTop: 22, textAlign: 'center' }}>
          <StarInput value={overall} onChange={setOverall} label="Overall rating" />
          <p style={{ margin: '8px 0 0', minHeight: 22, fontFamily: FONT.display, fontSize: 17, fontWeight: 700, color: overall ? T.white : T.text3 }}>{overall ? OVERALL_WORDS[overall] : 'How was it overall?'}</p>
        </div>

        <div style={{ marginTop: 18, borderTop: `1px solid ${T.hairline}` }}>
          {ASPECTS.map((a) => (
            <div key={a.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: `1px solid ${T.hairline}` }}>
              <span style={{ fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, color: T.text }}>{a.label}</span>
              <StarInput size={22} value={aspects[a.key]} onChange={(v) => setAspects((x) => ({ ...x, [a.key]: v }))} label={a.label} />
            </div>
          ))}
        </div>

        <textarea value={review} onChange={(e) => setReview(e.target.value)} maxLength={600} rows={3} placeholder="Tell people what it was like (optional)"
          style={{ width: '100%', boxSizing: 'border-box', marginTop: 16, padding: '14px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: T.white, fontFamily: FONT.sans, fontSize: 16, lineHeight: 1.45, outline: 'none', resize: 'none' }} />
        <p style={{ margin: '6px 0 0', display: 'flex', justifyContent: 'space-between', fontFamily: FONT.sans, fontSize: 12, color: T.text3 }}>
          <span>{status.verified ? 'Shown as a verified attendee' : 'Shown as a ticket holder'}</span><span>{review.length}/600</span>
        </p>

        {err && <p role="alert" style={{ margin: '12px 0 0', fontFamily: FONT.sans, fontSize: 14, color: T.danger }}>{err}</p>}
        <button type="button" onClick={save} disabled={busy} style={{ ...BTN.primary, width: '100%', marginTop: 18, opacity: busy ? 0.6 : 1 }}>
          {busy ? 'Saving…' : status.rating ? 'Update rating' : 'Post rating'}
        </button>
      </div>
    </div>,
    document.body,
  );
}

/* ── Section on the event page ──────────────────────────────────────── */

const ago = (iso: string) => {
  const d = (Date.now() - new Date(iso).getTime()) / 86400000;
  return d < 1 ? 'Today' : d < 2 ? 'Yesterday' : d < 30 ? `${Math.floor(d)} days ago` : new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * Ratings for one event: the score, five quick averages, the spread, reviews, and — for ticket
 * holders once the event has happened — a button to rate it. Hidden before the event unless
 * someone has already rated it.
 */
export default function RatingSection({ slug, title, past }: { slug: string; title: string; past: boolean }) {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [sum, setSum] = useState<RatingSummary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [open, setOpen] = useState(false);
  const [thanks, setThanks] = useState(false);

  const load = useCallback(async () => {
    const [{ data: s }, { data: r }] = await Promise.all([
      supabase.rpc('event_rating_summaries', { p_slugs: [slug] }),
      supabase.rpc('event_reviews', { p_slug: slug, p_limit: 20 }),
    ]);
    const row = (s ?? [])[0] as RatingSummary | undefined;
    setSum(row ? { ...row, overall: Number(row.overall) } : null);
    setReviews((r ?? []) as Review[]);
    if (user) {
      const { data: st } = await supabase.rpc('my_rating_status', { p_slug: slug });
      setStatus(st as Status);
    } else setStatus({ can_rate: false, reason: 'signed_out' });
  }, [supabase, slug, user]);

  useEffect(() => { load(); }, [load]);
  // /events/<slug>?rate=1 (from My tickets) opens the sheet straight away
  useEffect(() => {
    if (status?.can_rate && new URLSearchParams(window.location.search).get('rate') === '1') {
      setOpen(true);
      document.getElementById('ratings')?.scrollIntoView({ block: 'start' });
    }
  }, [status?.can_rate]);

  if (!past && !sum) return null;
  const count = sum?.ratings ?? 0;
  const mine = status?.rating;

  return (
    <section id="ratings" style={{ marginTop: 34, scrollMarginTop: 90 }}>
      <h2 style={{ margin: '0 0 14px', fontFamily: FONT.display, fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.text3 }}>Ratings</h2>

      {count > 0 && sum ? (
        <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 52, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: T.white }}>{fmtScore(sum.overall)}</p>
            <div style={{ marginTop: 6 }}><Stars value={sum.overall} size={15} /></div>
            <p style={{ margin: '6px 0 0', fontFamily: FONT.sans, fontSize: 12, color: T.text3 }}>{count} rating{count === 1 ? '' : 's'}</p>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {sum.dist.map((n, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '3px 0' }}>
                <span style={{ width: 10, fontFamily: FONT.sans, fontSize: 12, color: T.text3, textAlign: 'right' }}>{5 - i}</span>
                <span style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <span style={{ display: 'block', height: '100%', width: `${count ? (n / count) * 100 : 0}%`, borderRadius: 3, background: '#F5C451' }} />
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.55, color: T.text2 }}>
          No ratings yet. {status?.can_rate ? 'You were there — be the first to rate it.' : 'People with tickets can rate it after the show.'}
        </p>
      )}

      {count > 0 && sum && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: '14px 12px', marginTop: 20 }}>
          {ASPECTS.filter((a) => sum[a.key] != null).map((a) => (
            <div key={a.key}>
              <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 20, fontWeight: 800, color: T.white }}>{fmtScore(sum[a.key])}</p>
              <p style={{ margin: '1px 0 0', fontFamily: FONT.sans, fontSize: 12, color: T.text3 }}>{a.label}</p>
            </div>
          ))}
        </div>
      )}

      {status?.can_rate && (
        <button type="button" onClick={() => setOpen(true)} style={{ ...(mine ? BTN.secondary : BTN.primary), width: '100%', marginTop: 20, height: 48 }}>
          <PenLine size={17} /> {mine ? `Your rating: ${mine.overall}★ · Edit` : 'Rate this show'}
        </button>
      )}
      {thanks && <p style={{ margin: '10px 0 0', textAlign: 'center', fontFamily: FONT.sans, fontSize: 14, color: T.mintText }}>Thanks — your rating is live.</p>}
      {past && status?.reason === 'signed_out' && (
        <p style={{ margin: '14px 0 0', fontFamily: FONT.sans, fontSize: 14, color: T.text3 }}>
          Went with an Akwaaba ticket? <Link href={`/auth?next=${encodeURIComponent(`/events/${slug}?rate=1`)}`} style={{ color: T.mintText, fontWeight: 600, textDecoration: 'none' }}>Sign in to rate it</Link>
        </p>
      )}

      {reviews.some((r) => r.review) && (
        <ul style={{ listStyle: 'none', margin: '24px 0 0', padding: 0 }}>
          {reviews.filter((r) => r.review).map((r) => (
            <li key={r.id} style={{ padding: '14px 0', borderTop: `1px solid ${T.hairline}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 32, height: 32, borderRadius: 16, overflow: 'hidden', flexShrink: 0, background: '#1F5A3F', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.sans, fontSize: 13, fontWeight: 700, color: '#D6FBE6' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.avatar_url ? <img src={r.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (r.name ?? '?')[0]?.toUpperCase()}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: T.white }}>
                    {r.username ? <Link href={`/u/${r.username}`} style={{ color: 'inherit', textDecoration: 'none' }}>{r.name}</Link> : r.name}
                    {r.verified && <BadgeCheck size={15} color={T.mint} aria-label="Verified attendee" />}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <Stars value={r.overall} size={12} />
                    <span style={{ fontFamily: FONT.sans, fontSize: 12, color: T.text3 }}>{ago(r.created_at)}</span>
                  </span>
                </span>
              </div>
              <p style={{ margin: '10px 0 0', fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.55, color: 'rgba(255,255,255,0.82)', whiteSpace: 'pre-wrap' }}>{r.review}</p>
            </li>
          ))}
        </ul>
      )}

      {open && status && (
        <RateSheet slug={slug} title={title} status={status} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); setThanks(true); load(); }} />
      )}
    </section>
  );
}
