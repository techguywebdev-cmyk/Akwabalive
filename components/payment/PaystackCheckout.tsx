'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, Loader2, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import type { GhanaEvent } from '@/lib/types';


import type { CheckoutTier } from '@/components/events/EventDetailClient';

import { C, G, R } from '@/lib/theme';
interface Props {
  event: GhanaEvent;
  tiers: CheckoutTier[];
  onClose: () => void;
  onSuccess: (ref: string) => void;
}

declare global { interface Window { PaystackPop: any; } }

export default function PaystackCheckout({ event, tiers, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const supabase = createClient();

  const firstAvailable = Math.max(0, tiers.findIndex(t => t.available));
  const [selected, setSelected] = useState(firstAvailable);
  const [qty,      setQty]      = useState(1);
  const [email,    setEmail]    = useState('');
  const [step,     setStep]     = useState<'select' | 'pay' | 'done'>('select');
  const [loading,  setLoading]  = useState(false);
  const [ref,      setRef]      = useState('');
  const [sdkReady, setSdkReady] = useState(false);
  const [error,    setError]    = useState('');

  const tier  = tiers[selected];
  const total = tier.price * qty;
  /** Only organizer-created tiers (with a database id) can be sold */
  const onSale = Boolean(tier.id) && tier.available;
  const maxQty = Math.max(1, Math.min(10, tier.spots));

  useEffect(() => {
    if (window.PaystackPop) { setSdkReady(true); return; }
    const s = document.createElement('script');
    s.src = 'https://js.paystack.co/v1/inline.js';
    s.async = true;
    s.onload = () => setSdkReady(true);
    document.body.appendChild(s);
    return () => { try { document.body.removeChild(s); } catch {} };
  }, []);

  useEffect(() => { if (user?.email) setEmail(user.email); }, [user]);
  useEffect(() => { setQty(q => Math.min(q, maxQty)); setError(''); }, [selected, maxQty]);

  function genRef() {
    return `AKW-${Date.now()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
  }

  /** Tickets are issued by the server only — after it confirms the payment with Paystack. */
  async function confirmOnServer(body: Record<string, unknown>) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = '/auth'; return null; }
    // Retry a few times: Paystack can take a moment to mark MoMo payments as successful.
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) return json.reference as string;
      const retryable = json.error === 'payment_not_found' || json.error === 'payment_failed';
      if (!body.reference || !retryable || attempt === 3) {
        throw new Error(json.message || 'Something went wrong. Please try again.');
      }
      await new Promise(r => setTimeout(r, 2500));
    }
    return null;
  }

  function finish(reference: string) {
    setRef(reference); setStep('done'); setLoading(false);
    onSuccess(reference);
  }

  function handlePaystack() {
    if (!user) { window.location.href = '/auth'; return; }
    if (!onSale) { setError('Tickets for this event are not on sale on Akwaaba yet.'); return; }
    if (!sdkReady || !window.PaystackPop) { setError('Payment is still loading — try again in a moment.'); return; }
    if (!email) { setError('Please enter your email.'); return; }
    setError('');
    setLoading(true);
    const payRef = genRef();
    const handler = window.PaystackPop.setup({
      key:      process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email, amount: Math.round(total * 100), currency: 'GHS', ref: payRef,
      label:    `${event.title} \u2014 ${tier.name} x${qty}`,
      // The server reads these back from Paystack to issue the right ticket
      metadata: {
        user_id: user.id,
        event_slug: event.slug,
        tier_id: tier.id,
        quantity: qty,
        custom_fields: [
          { display_name: 'Event', variable_name: 'event', value: event.title },
          { display_name: 'Ticket', variable_name: 'ticket', value: `${tier.name} x${qty}` },
        ],
      },
      callback: (tx: any) => {
        confirmOnServer({ reference: tx.reference })
          .then(r => { if (r) finish(r); })
          .catch((e: Error) => {
            setLoading(false);
            setError(`${e.message} Your payment reference is ${tx.reference}.`);
          });
      },
      onClose: () => setLoading(false),
    });
    handler.openIframe();
  }

  async function handleFreeTicket() {
    if (!user) { window.location.href = '/auth'; return; }
    if (!onSale) { setError('RSVPs for this event are not open on Akwaaba yet.'); return; }
    setError('');
    setLoading(true);
    try {
      const r = await confirmOnServer({ eventSlug: event.slug, tierId: tier.id });
      if (r) finish(r);
    } catch (e: any) {
      setLoading(false);
      setError(e.message);
    }
  }

  const STEPS = ['Select', 'Payment', 'Done'];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, ...G.scrim }} />
      <div style={{ position: 'relative', zIndex: 1, ...G.sheet, borderRadius: `${R.sheet}px ${R.sheet}px 0 0`, border: `1px solid ${C.bd2}`, borderBottom: 'none', width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', paddingBottom: 48 }}>

        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 6px' }}>
          <div style={{ width: 44, height: 4, borderRadius: 2, background: C.bd2 }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '8px 20px 16px', borderBottom: `1px solid ${C.bd}` }}>
          <div>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.8, marginBottom: 5 }}>
              {step === 'select' ? '\u2014 Choose ticket' : step === 'pay' ? '\u2014 Payment' : '\u2014 Confirmed'}
            </p>
            <h3 style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: 21, fontWeight: 400, color: C.cream, lineHeight: 1.15, maxWidth: 280 }}>{event.title}</h3>
          </div>
          <button onClick={onClose} style={{ background: C.c4, border: `1px solid ${C.bd}`, color: C.c3, cursor: 'pointer', padding: 8, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', padding: '12px 20px', borderBottom: `1px solid ${C.bd}` }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i <= ['select','pay','done'].indexOf(step) ? C.gold : C.bg3, border: `1px solid ${i <= ['select','pay','done'].indexOf(step) ? C.gold : C.bd}`, fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, fontWeight: 600, color: i <= ['select','pay','done'].indexOf(step) ? '#000' : C.c3 }}>{i + 1}</div>
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: i <= ['select','pay','done'].indexOf(step) ? C.c2 : C.c3 }}>{s}</span>
              {i < 2 && <div style={{ flex: 1, height: 1, background: C.bd, marginLeft: 6 }} />}
            </div>
          ))}
        </div>

        {/* SELECT */}
        {step === 'select' && (
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 12, padding: '12px 14px', ...G.raised, borderRadius: 10, marginBottom: 20, border: `1px solid ${C.bd}` }}>
              <div style={{ width: 48, height: 48, borderRadius: 8, flexShrink: 0, backgroundImage: `url(${event.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div>
                <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: C.c2, fontWeight: 500, marginBottom: 2 }}>{event.title}</p>
                <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3 }}>{event.dateLabel} · {event.time}</p>
                <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3 }}>{event.venue}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {tiers.map((t, i) => (
                <button key={t.name} onClick={() => t.available && setSelected(i)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 10, textAlign: 'left', border: `1px solid ${selected === i ? C.goldBd : C.bd}`, background: selected === i ? C.goldDim : C.bg3, cursor: t.available ? 'pointer' : 'not-allowed', opacity: t.available ? 1 : 0.45, width: '100%' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: 14, fontWeight: 600, color: C.cream }}>{t.name}</span>
                      {!t.available && <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', background: 'rgba(206,17,38,0.15)', color: C.red, border: '1px solid rgba(206,17,38,0.25)', padding: '2px 7px', borderRadius: 6 }}>Sold out</span>}
                      {t.available && t.spots <= 20 && <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBd}`, padding: '2px 7px', borderRadius: 6 }}>{t.spots} left</span>}
                    </div>
                    <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: C.c3, lineHeight: 1.45 }}>{t.desc}</p>
                  </div>
                  <div style={{ flexShrink: 0, marginLeft: 16 }}>
                    {t.price === 0
                      ? <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, fontWeight: 700, color: C.greenL }}>FREE</span>
                      : <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 17, color: C.cream }}><span style={{ fontSize: 10, color: C.gold }}>₵</span>{t.price.toLocaleString()}</span>
                    }
                  </div>
                </button>
              ))}
            </div>

            {tier.price > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderTop: `1px solid ${C.bd}`, marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: C.c2 }}>Quantity</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <button onClick={() => setQty(q => Math.max(1, q-1))} style={{ width: 34, height: 34, borderRadius: '50%', border: `1px solid ${C.bd}`, ...G.raised, color: C.cream, cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                  <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 18, color: C.cream, minWidth: 28, textAlign: 'center' }}>{qty}</span>
                  <button onClick={() => setQty(q => Math.min(maxQty, q+1))} style={{ width: 34, height: 34, borderRadius: '50%', border: `1px solid ${C.bd}`, ...G.raised, color: C.cream, cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
              </div>
            )}

            <div style={{ borderTop: `1px solid ${C.bd}`, paddingTop: 18 }}>
              {tier.price > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c2 }}>{qty} × {tier.name}</span>
                  <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 22, color: C.cream, letterSpacing: '-1.5px' }}><span style={{ fontSize: 12, color: C.gold }}>₵</span>{total.toLocaleString()}</span>
                </div>
              )}
              <button onClick={() => tier.price === 0 ? handleFreeTicket() : setStep('pay')} disabled={loading || !onSale}
                style={{ width: '100%', background: onSale ? C.gold : C.bg3, color: onSale ? '#0D0B08' : C.c3, border: onSale ? 'none' : `1px solid ${C.bd}`, padding: 16, borderRadius: 8, fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 700, cursor: loading ? 'wait' : onSale ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : !onSale ? (tier.id ? 'Sold Out' : 'Not on sale yet') : tier.price === 0 ? 'Reserve My Spot \u2192' : 'Continue to Payment \u2192'}
              </button>
              {error && <p role="alert" style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: '#f87171', textAlign: 'center', marginTop: 10, lineHeight: 1.5 }}>{error}</p>}
              <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3, textAlign: 'center', marginTop: 10 }}>{onSale ? 'QR ticket delivered instantly' : 'Tickets go on sale once the organizer publishes them on Akwaaba.'}</p>
            </div>
          </div>
        )}

        {/* PAY */}
        {step === 'pay' && (
          <div style={{ padding: 20 }}>
            <div style={{ ...G.raised, border: `1px solid ${C.bd}`, borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c2 }}>{tier.name} × {qty}</span>
                <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 18, color: C.cream }}><span style={{ fontSize: 10, color: C.gold }}>₵</span>{total.toLocaleString()}</span>
              </div>
              <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3 }}>{event.title} · {event.dateLabel}</p>
            </div>

            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, marginBottom: 10 }}>Your email</p>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
              style={{ width: '100%', ...G.raised, border: `1px solid ${C.bd}`, borderRadius: 8, padding: '12px 14px', fontFamily: 'var(--font-inter,sans-serif)', fontSize: 14, color: C.cream, outline: 'none', marginBottom: 20 }} />

            <button onClick={handlePaystack} disabled={loading || !sdkReady || !email}
              style={{ width: '100%', background: loading || !email ? C.bg3 : C.gold, color: loading || !email ? C.c3 : '#0D0B08', border: `1px solid ${loading || !email ? C.bd : C.gold}`, padding: 16, borderRadius: 8, fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 700, cursor: (loading || !sdkReady || !email) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14, transition: 'all 200ms' }}>
              {loading ? <><Loader2 size={14} className="animate-spin" /> Processing\u2026</> : `Pay \u20B5${total.toLocaleString()} with Paystack`}
            </button>
            {error && <p role="alert" style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: '#f87171', textAlign: 'center', marginBottom: 14, lineHeight: 1.5 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 14 }}>
              {['MTN MoMo', 'Vodafone Cash', 'AirtelTigo', 'Visa/Mastercard'].map(m => (
                <span key={m} style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 8, border: `1px solid ${C.bd}`, color: C.c3 }}>{m}</span>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
              <Shield size={12} style={{ color: C.c3 }} />
              <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3 }}>Secured by Paystack \u00b7 256-bit SSL</span>
            </div>

            <button onClick={() => setStep('select')} style={{ width: '100%', background: 'transparent', color: C.c3, border: `1px solid ${C.bd}`, padding: 12, borderRadius: 8, fontFamily: 'var(--font-inter), sans-serif', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>
              ← Back
            </button>
          </div>
        )}

        {/* DONE */}
        {step === 'done' && (
          <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: C.greenDim, border: `1px solid ${C.greenBd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <CheckCircle size={32} style={{ color: C.greenL }} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: 26, fontWeight: 300, color: C.cream, marginBottom: 10 }}>
              {tier.price === 0 ? 'Spot Reserved!' : "You're going!"}
            </h3>
            <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 14, color: C.c2, lineHeight: 1.6, maxWidth: 300, marginBottom: 24 }}>
              Your QR ticket for <strong style={{ color: C.cream }}>{event.title}</strong> is ready.
            </p>
            <div style={{ width: 140, height: 140, background: '#fff', borderRadius: 12, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, padding: 12, marginBottom: 20 }}>
              {Array.from({ length: 49 }, (_, i) => (
                <div key={i} style={{ background: (i * 7 + i) % 3 === 0 ? '#0D0B08' : 'transparent', borderRadius: 1 }} />
              ))}
            </div>
            <div style={{ width: '100%', ...G.raised, border: `1px solid ${C.bd}`, borderRadius: 10, padding: '14px 16px', marginBottom: 20, textAlign: 'left' }}>
              {[{ label: 'Event', value: event.title }, { label: 'Tier', value: tier.name }, { label: 'Date', value: event.dateLabel }, { label: 'Ref', value: ref }].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${C.bd}` }}>
                  <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.c3 }}>{row.label}</span>
                  <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: C.cream, maxWidth: '60%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <button onClick={onClose} style={{ flex: 1, background: C.gold, color: '#0D0B08', border: 'none', padding: 14, borderRadius: 8, fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer' }}>Done</button>
              <a href="/account/tickets" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: C.c2, border: `1px solid ${C.bd}`, padding: 14, borderRadius: 8, fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'none' }}>My Tickets</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
