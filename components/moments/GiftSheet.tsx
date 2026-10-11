'use client';

import { useState } from 'react';
import { Check, Gift, Loader2, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { C, G, R } from '@/lib/theme';
import type { GhanaEvent } from '@/lib/types';
import { confirmTicket, payWithPaystack } from '@/lib/payments/client';
import type { Comment } from './types';
import { mono, sans, serif } from './parts';

const METHODS = [
  { key: 'momo', label: 'Mobile money', channels: ['mobile_money'] },
  { key: 'card', label: 'Card', channels: ['card'] },
] as const;

/**
 * Buy a real ticket for the next edition and send it to a commenter.
 * Paid through Paystack; the server issues the ticket into the recipient's account.
 */
export default function GiftSheet({
  comment, next, user, onClose,
}: {
  comment: Comment; next: GhanaEvent; user: User; onClose: () => void;
}) {
  const tiers = (next.tiers ?? []).filter((t) => t.price > 0);
  const [tierIdx, setTierIdx] = useState(() => Math.max(0, tiers.findIndex((t) => t.quantity - t.sold > 0)));
  const [method, setMethod] = useState<(typeof METHODS)[number]['key']>('momo');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sentRef, setSentRef] = useState('');

  const name = comment.profiles?.full_name || comment.profiles?.username || 'them';
  const first = name.split(' ')[0];
  const tier = tiers[tierIdx];

  async function pay() {
    if (!tier || !user.email) return;
    setError('');
    setBusy(true);
    try {
      const reference = await payWithPaystack({
        email: user.email,
        amountGhs: tier.price,
        label: `Gift: ${next.title} — ${tier.name}`,
        refPrefix: 'AKW-GIFT',
        channels: [...(METHODS.find((m) => m.key === method)?.channels ?? [])],
        metadata: {
          user_id: user.id,
          gift_to: comment.user_id,
          event_slug: next.slug,
          tier_id: tier.id,
          quantity: 1,
          custom_fields: [
            { display_name: 'Gift for', variable_name: 'gift_for', value: comment.profiles?.username ?? comment.user_id },
            { display_name: 'Ticket', variable_name: 'ticket', value: `${next.title} — ${tier.name}` },
          ],
        },
      });
      if (!reference) { setBusy(false); return; }
      const r = await confirmTicket({ reference });
      setSentRef(r);
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const d = new Date(`${next.date}T00:00:00`);
  const dateLabel = Number.isNaN(d.getTime()) ? next.dateLabel : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <>
      <button type="button" aria-label="Close" onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 60, ...G.scrim, border: 'none', cursor: 'pointer' }} />
      <section
        aria-label="Gift a ticket"
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 61, maxHeight: '88%', overflowY: 'auto',
          margin: '0 auto', maxWidth: 560,
          ...G.sheet, border: `1px solid ${C.bd2}`, borderBottom: 'none', borderRadius: `${R.sheet}px ${R.sheet}px 0 0`,
          padding: '10px 20px calc(18px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 6 }}>
          <span style={{ width: 40, height: 4, borderRadius: 2, background: C.bd2 }} />
        </div>

        {!sentRef ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: C.goldText, marginBottom: 4 }}>Gift a ticket</p>
                <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 500, lineHeight: 1.1, color: C.cream }}>Bring {first} to {next.title}</h2>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 22, ...G.raised, border: `1px solid ${C.bd}`, color: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ borderRadius: R.card - 4, border: `1px solid ${C.bd}`, ...G.raised, overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: 12, padding: '12px 14px', alignItems: 'center' }}>
                <span style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 20, overflow: 'hidden', background: '#8E1B24', color: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, fontSize: 15, fontWeight: 700 }}>
                  {comment.profiles?.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={comment.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : name[0]?.toUpperCase()}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontFamily: sans, fontSize: 14, fontWeight: 700, color: C.cream }}>{name}</p>
                  <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 15, color: C.c2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>“{comment.content}”</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, padding: '12px 14px', alignItems: 'center', borderTop: `1px solid ${C.bd}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={next.image} alt="" style={{ width: 56, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontFamily: sans, fontSize: 14, fontWeight: 700, color: C.cream }}>{next.title}</p>
                  <p style={{ fontFamily: mono, fontSize: 11, color: C.c2 }}>{dateLabel} · {next.venue}</p>
                </div>
              </div>
            </div>

            <div role="radiogroup" aria-label="Ticket type" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tiers.map((t, i) => {
                const on = i === tierIdx;
                const left = t.quantity - t.sold;
                const soldOut = left <= 0;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={soldOut}
                    onClick={() => setTierIdx(i)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, padding: '10px 14px', borderRadius: R.btn,
                      textAlign: 'left', cursor: soldOut ? 'not-allowed' : 'pointer', opacity: soldOut ? 0.45 : 1, color: C.cream,
                      border: `1px solid ${on ? C.gold : C.bd2}`, background: on ? C.goldDim : 'transparent',
                    }}
                  >
                    <span style={{ width: 18, height: 18, borderRadius: 9, border: `2px solid ${on ? C.gold : C.c3}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {on && <span style={{ width: 8, height: 8, borderRadius: 4, background: C.gold }} />}
                    </span>
                    <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontFamily: sans, fontSize: 14, fontWeight: 700 }}>{t.name}</span>
                      <span style={{ fontFamily: sans, fontSize: 12, color: C.c2 }}>
                        {soldOut ? 'Sold out' : t.description || (left <= 20 ? `${left} left` : 'Entry ticket')}
                      </span>
                    </span>
                    <span style={{ fontFamily: mono, fontSize: 15 }}>₵{t.price.toLocaleString()}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {METHODS.map((m) => {
                const on = m.key === method;
                return (
                  <button
                    key={m.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setMethod(m.key)}
                    style={{
                      height: 40, padding: '0 14px', borderRadius: R.chip, cursor: 'pointer', fontFamily: sans, fontSize: 13, fontWeight: 600,
                      border: `1px solid ${on ? C.gold : C.bd2}`, background: on ? C.goldDim : 'transparent', color: on ? C.goldText : C.c2,
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            {error && <p role="alert" style={{ fontFamily: sans, fontSize: 13, color: '#FCA5A5' }}>{error}</p>}

            <button
              type="button"
              onClick={pay}
              disabled={busy || !tier}
              style={{ height: 52, borderRadius: R.btn, border: 'none', background: C.gold, color: C.onAccent, fontFamily: sans, fontSize: 15, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Gift size={18} />}
              {tier ? `Pay ₵${tier.price.toLocaleString()} and send` : 'No tickets available'}
            </button>
            <p style={{ fontFamily: sans, fontSize: 12, lineHeight: 1.5, color: C.c3, textAlign: 'center' }}>
              {first} gets the ticket in their Akwaaba account. Payment secured by Paystack.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '18px 0 4px', textAlign: 'center' }}>
            <span style={{ width: 72, height: 72, borderRadius: 36, background: C.greenDim, border: `1px solid ${C.greenBd}`, color: '#86EFAC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={32} />
            </span>
            <h2 style={{ fontFamily: serif, fontSize: 32, fontWeight: 500, color: C.cream }}>Gift sent to {first}</h2>
            <p style={{ fontFamily: sans, fontSize: 14, lineHeight: 1.55, color: C.c2, maxWidth: 320 }}>
              Their {tier?.name} ticket for {next.title} is waiting in their account.
            </p>
            <div style={{ width: '100%', display: 'flex', borderRadius: R.card - 4, overflow: 'hidden', border: `1px solid ${C.goldBd}`, ...G.raised, textAlign: 'left' }}>
              <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '1.8px', textTransform: 'uppercase', color: C.goldText }}>Admit one · {tier?.name}</span>
                <span style={{ fontFamily: sans, fontSize: 16, fontWeight: 700, color: C.cream }}>{next.title}</span>
                <span style={{ fontFamily: mono, fontSize: 11, color: C.c2 }}>{dateLabel} · {next.venue}</span>
              </div>
              <div style={{ width: 84, borderLeft: `2px dashed ${C.goldBd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mono, fontSize: 10, letterSpacing: '1px', color: C.c3, writingMode: 'vertical-rl' }}>
                {sentRef.slice(-10)}
              </div>
            </div>
            <div style={{ width: '100%', display: 'flex', gap: 10 }}>
              <button type="button" onClick={onClose} style={{ flex: 1, height: 50, borderRadius: R.btn, border: 'none', background: C.gold, color: C.onAccent, fontFamily: sans, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Back to moments
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
