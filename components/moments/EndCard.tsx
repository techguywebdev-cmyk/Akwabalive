'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Check, ChevronUp, Plus, RotateCcw, Share2, Ticket } from 'lucide-react';
import { C, G, R } from '@/lib/theme';
import type { GhanaEvent } from '@/lib/types';
import { daysUntil } from '@/lib/moments/series';
import type { Moment } from './types';
import { formatCount } from './types';
import { mono, sans, serif } from './parts';

const AUTO_NEXT_SECONDS = 5;

const pill: React.CSSProperties = {
  height: 40, padding: '0 14px', borderRadius: R.chip, cursor: 'pointer',
  ...G.overlay, border: '1px solid rgba(255,255,255,0.18)', color: C.cream,
  display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: sans, fontSize: 13, fontWeight: 600, textDecoration: 'none',
};

/** Shown when a moment finishes: replay, "I was there", next edition, and up next. */
export default function EndCard({
  moment, next, goingCount, iWasThere, reminded, signedIn, upNext,
  onReplay, onShare, onToggleThere, onToggleRemind, onNext,
}: {
  moment: Moment;
  next: GhanaEvent | null;
  goingCount: number;
  iWasThere: boolean;
  reminded: boolean;
  signedIn: boolean;
  upNext: Moment | null;
  onReplay: () => void;
  onShare: () => void;
  onToggleThere: () => void;
  onToggleRemind: () => void;
  onNext: () => void;
}) {
  const [left, setLeft] = useState(AUTO_NEXT_SECONDS);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!upNext || held) return;
    if (left <= 0) { onNext(); return; }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, held, upNext, onNext]);

  const days = next ? daysUntil(next.date) : null;
  const d = next ? new Date(`${next.date}T00:00:00`) : null;
  const dateLabel = d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    : next?.dateLabel;
  const ticketHref = next ? (next.ticketUrl || `/events/${next.slug}?tickets=1`) : '#';

  return (
    <div
      onPointerDown={() => setHeld(true)}
      style={{ position: 'absolute', inset: 0, zIndex: 22, overflow: 'hidden' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://img.youtube.com/vi/${moment.youtube_id}/hqdefault.jpg`}
        alt=""
        style={{ position: 'absolute', inset: -40, width: 'calc(100% + 80px)', height: 'calc(100% + 80px)', objectFit: 'cover', filter: 'blur(28px)' }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,6,4,0.70)' }} />

      <div
        className="no-scrollbar"
        style={{
          position: 'absolute', inset: 0, overflowY: 'auto',
          padding: 'calc(76px + env(safe-area-inset-top, 0px)) 16px calc(16px + env(safe-area-inset-bottom, 0px))',
          display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 560, margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: C.goldText }}>You just watched</span>
          <h2 style={{ fontFamily: serif, fontSize: 34, fontWeight: 500, lineHeight: 1.05, color: '#FFFDF6' }}>{moment.title}</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            <button type="button" onClick={onReplay} style={pill}><RotateCcw size={16} /> Replay</button>
            {moment.event_slug && (
              signedIn ? (
                <button
                  type="button"
                  onClick={onToggleThere}
                  aria-pressed={iWasThere}
                  style={iWasThere ? { ...pill, background: C.goldDim, border: `1px solid ${C.goldBd}`, color: C.goldText } : pill}
                >
                  {iWasThere ? <><Check size={16} /> On your profile</> : <><Plus size={16} /> I was there</>}
                </button>
              ) : (
                <Link href="/auth" style={pill}><Plus size={16} /> I was there</Link>
              )
            )}
            <button type="button" onClick={onShare} style={pill}><Share2 size={16} /> Share</button>
          </div>
        </div>

        {next && (
          <div style={{ borderRadius: R.card + 2, overflow: 'hidden', ...G.sheet, border: `1px solid ${C.goldBd}` }}>
            <div style={{ position: 'relative', height: 150, background: C.bg3 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={next.image} alt="" style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} />
              <span style={{ position: 'absolute', left: 12, top: 12, fontFamily: mono, fontSize: 10, letterSpacing: '1.8px', textTransform: 'uppercase', padding: '5px 10px', borderRadius: R.chip, background: C.gold, color: C.onAccent }}>
                Next edition
              </span>
              {days != null && days >= 0 && (
                <span style={{ position: 'absolute', right: 12, top: 12, fontFamily: mono, fontSize: 11, padding: '5px 10px', borderRadius: R.chip, ...G.overlay, color: C.cream, border: '1px solid rgba(255,255,255,0.18)' }}>
                  {days === 0 ? 'Today' : `${days} ${days === 1 ? 'day' : 'days'} to go`}
                </span>
              )}
            </div>
            <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <h3 style={{ fontFamily: serif, fontSize: 28, fontWeight: 500, lineHeight: 1.05, color: C.cream }}>{next.title}</h3>
                <p style={{ fontFamily: mono, fontSize: 11, color: C.c2, marginTop: 4 }}>{dateLabel} · {next.venue}</p>
              </div>
              {goingCount > 0 && (
                <p style={{ fontFamily: sans, fontSize: 13, color: C.c2 }}><b style={{ color: C.cream }}>{formatCount(goingCount)} going</b></p>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <a
                  href={ticketHref}
                  {...(next.ticketUrl ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  style={{ flex: 1, height: 50, borderRadius: R.btn, background: C.gold, color: C.onAccent, fontFamily: sans, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}
                >
                  <Ticket size={17} />
                  {next.price === 0 ? 'RSVP free' : `Tickets from ₵${next.price.toLocaleString()}`}
                </a>
                {signedIn ? (
                  <button
                    type="button"
                    onClick={onToggleRemind}
                    aria-pressed={reminded}
                    aria-label={reminded ? 'Saved to dream events' : 'Remind me'}
                    style={{
                      width: 50, height: 50, flexShrink: 0, borderRadius: R.btn, cursor: 'pointer', padding: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `1px solid ${reminded ? C.greenBd : C.bd2}`, background: reminded ? C.greenDim : 'transparent', color: reminded ? '#86EFAC' : C.cream,
                    }}
                  >
                    <Bell size={19} fill={reminded ? '#86EFAC' : 'none'} />
                  </button>
                ) : null}
              </div>
              {reminded && <p style={{ fontFamily: sans, fontSize: 12, color: '#86EFAC' }}>Saved to your dream events.</p>}
            </div>
          </div>
        )}

        {upNext && (
          <button
            type="button"
            onClick={onNext}
            style={{
              marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: R.card, cursor: 'pointer', textAlign: 'left',
              ...G.overlay, border: '1px solid rgba(255,255,255,0.16)', color: C.cream,
            }}
          >
            <span style={{ position: 'relative', width: 92, height: 60, flexShrink: 0, borderRadius: 10, overflow: 'hidden', background: C.bg3 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://img.youtube.com/vi/${upNext.youtube_id}/mqdefault.jpg`} alt="" style={{ width: 92, height: 60, objectFit: 'cover', display: 'block' }} />
              {!held && (
                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
                  <span style={{ width: 30, height: 30, borderRadius: 15, border: `2px solid ${C.cream}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mono, fontSize: 12 }}>{left}</span>
                </span>
              )}
            </span>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '1.8px', textTransform: 'uppercase', color: C.goldText }}>Up next</span>
              <span style={{ fontFamily: sans, fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{upNext.title}</span>
              <span style={{ fontFamily: sans, fontSize: 12, color: C.c2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{upNext.event_name}{upNext.year ? ` · ${upNext.year}` : ''}</span>
            </span>
            <ChevronUp size={20} style={{ flexShrink: 0, marginRight: 4 }} />
          </button>
        )}
      </div>
    </div>
  );
}
