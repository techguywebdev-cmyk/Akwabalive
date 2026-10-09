'use client';

import { createClient } from '@/lib/supabase/client';

declare global { interface Window { PaystackPop: any } }

/** Load Paystack's inline script once. */
export function loadPaystack(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.PaystackPop) return resolve(true);
    const existing = document.getElementById('paystack-inline') as HTMLScriptElement | null;
    const s = existing ?? document.createElement('script');
    s.id = 'paystack-inline';
    s.src = 'https://js.paystack.co/v1/inline.js';
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    if (!existing) document.body.appendChild(s);
  });
}

export function newReference(prefix = 'AKW') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/**
 * Open Paystack and resolve with the transaction reference once the buyer finishes,
 * or null if they close the popup. The ticket itself is issued by the server.
 */
export async function payWithPaystack(opts: {
  email: string;
  amountGhs: number;
  label: string;
  metadata: Record<string, unknown>;
  refPrefix?: string;
  /** Limit payment options, e.g. ['mobile_money'] or ['card'] */
  channels?: string[];
}): Promise<string | null> {
  const ok = await loadPaystack();
  if (!ok || !window.PaystackPop) throw new Error('Payment could not load. Check your connection and try again.');
  return new Promise((resolve) => {
    const handler = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: opts.email,
      amount: Math.round(opts.amountGhs * 100),
      currency: 'GHS',
      ref: newReference(opts.refPrefix),
      label: opts.label,
      metadata: opts.metadata,
      ...(opts.channels ? { channels: opts.channels } : {}),
      callback: (tx: { reference: string }) => resolve(tx.reference),
      onClose: () => resolve(null),
    });
    handler.openIframe();
  });
}

/** Ask the server to verify a payment (or free RSVP) and issue the ticket. Retries briefly for MoMo. */
export async function confirmTicket(body: { reference?: string; eventSlug?: string; tierId?: string }): Promise<string> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in again.');
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
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new Error('Something went wrong. Please try again.');
}
