// Server-only module: uses the Supabase service role and Paystack secret key.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side ticket fulfilment.
 *
 * Every ticket is created here, never from the browser:
 *  - paid tickets are only issued after Paystack confirms the transaction
 *    (status, currency and exact amount are checked against the real tier price)
 *  - the Paystack reference is stored as qr_code, so the same payment can never
 *    issue two tickets (safe to call from both the verify route and the webhook)
 *  - ticket_tiers.sold is incremented so capacity and the organizer dashboard are real
 */

export type FulfillError =
  | 'not_configured'
  | 'event_not_found'
  | 'tier_not_found'
  | 'invalid_quantity'
  | 'sold_out'
  | 'payment_not_found'
  | 'payment_failed'
  | 'amount_mismatch'
  | 'owner_mismatch'
  | 'db_error';

export type FulfillResult =
  | { ok: true; reference: string; ticketId: string; alreadyIssued: boolean }
  | { ok: false; error: FulfillError; message: string };

export interface PaymentMetadata {
  /** The payer */
  user_id: string;
  event_slug: string;
  tier_id: string;
  quantity: number;
  /** Optional: profiles.id of the person receiving the ticket as a gift */
  gift_to?: string;
}

const MAX_QTY = 10;

export function getAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function fail(error: FulfillError, message: string): FulfillResult {
  return { ok: false, error, message };
}

function genFreeRef() {
  return `AKW-FREE-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/** Ask Paystack directly whether a transaction really succeeded. */
export async function fetchPaystackTransaction(reference: string) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return null;
  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret}` }, cache: 'no-store' },
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data ?? null;
}

export function parseMetadata(raw: unknown): PaymentMetadata | null {
  let m: any = raw;
  if (typeof m === 'string') {
    try { m = JSON.parse(m); } catch { return null; }
  }
  if (!m || typeof m !== 'object') return null;
  const quantity = Number(m.quantity);
  if (!m.user_id || !m.event_slug || !m.tier_id || !Number.isInteger(quantity)) return null;
  return {
    user_id: String(m.user_id),
    event_slug: String(m.event_slug),
    tier_id: String(m.tier_id),
    quantity,
    gift_to: m.gift_to ? String(m.gift_to) : undefined,
  };
}

async function findTicketByRef(db: SupabaseClient, reference: string) {
  const { data } = await db
    .from('tickets')
    .select('id, user_id, gifted_by')
    .eq('qr_code', reference)
    .maybeSingle();
  return data as { id: string; user_id: string; gifted_by: string | null } | null;
}

async function loadEventAndTier(db: SupabaseClient, slug: string, tierId: string) {
  const { data: ev } = await db
    .from('events')
    .select('id, slug, title, date, venue, status, ticket_tiers(id, name, price, quantity, sold)')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (!ev) return { ev: null, tier: null };
  const tier = (ev as any).ticket_tiers?.find((t: any) => t.id === tierId) ?? null;
  return { ev: ev as any, tier: tier as any };
}

/** Optimistic increment of ticket_tiers.sold (no DB function needed). */
async function incrementSold(db: SupabaseClient, tierId: string, qty: number) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: row } = await db
      .from('ticket_tiers')
      .select('sold')
      .eq('id', tierId)
      .single();
    const current = Number(row?.sold) || 0;
    const { data: updated } = await db
      .from('ticket_tiers')
      .update({ sold: current + qty })
      .eq('id', tierId)
      .eq('sold', current)
      .select('id');
    if (updated && updated.length > 0) return true;
  }
  console.error('[payments] could not increment sold for tier', tierId);
  return false;
}

async function issueTicket(
  db: SupabaseClient,
  args: {
    reference: string;
    userId: string;
    ev: any;
    tier: any;
    quantity: number;
    totalPaid: number;
    /** Set when the ticket is a gift: the payer's id (userId is then the recipient) */
    giftedBy?: string;
  },
): Promise<FulfillResult> {
  const { reference, userId, ev, tier, quantity, totalPaid, giftedBy } = args;

  const { data: inserted, error } = await db
    .from('tickets')
    .insert({
      user_id: userId,
      event_slug: ev.slug,
      event_title: ev.title,
      event_date: ev.date, // ISO date — the tickets page filters and builds calendar links from this
      event_venue: ev.venue,
      ticket_tier: tier.name,
      quantity,
      total_paid: totalPaid,
      qr_code: reference,
      status: 'active',
      gifted_by: giftedBy ?? null,
      gifted_to: giftedBy ? userId : null,
    })
    .select('id')
    .single();

  if (error) {
    // Unique violation on qr_code → another request (verify vs webhook) already issued it
    const existing = await findTicketByRef(db, reference);
    if (existing) return { ok: true, reference, ticketId: existing.id, alreadyIssued: true };
    console.error('[payments] ticket insert failed', error.message);
    return fail('db_error', 'Could not save your ticket. Please contact support with your reference.');
  }

  await incrementSold(db, tier.id, quantity);
  // A ticket holder is going. ignoreDuplicates keeps any choice they already made
  // (e.g. a private RSVP) instead of overwriting it.
  const { error: goingErr } = await db
    .from('event_attendance')
    .upsert({ user_id: userId, event_slug: ev.slug, status: 'going', is_public: true }, { onConflict: 'user_id,event_slug', ignoreDuplicates: true });
  if (goingErr) console.error('[payments] could not mark going', goingErr.message);
  return { ok: true, reference, ticketId: inserted.id, alreadyIssued: false };
}

/** Paid ticket: everything is taken from Paystack's own record of the transaction. */
export async function fulfillPaidTicket(
  reference: string,
  opts: { expectedUserId?: string } = {},
): Promise<FulfillResult> {
  const db = getAdminClient();
  if (!db || !process.env.PAYSTACK_SECRET_KEY) {
    return fail('not_configured', 'Payments are not configured on the server.');
  }

  const existing = await findTicketByRef(db, reference);
  if (existing) {
    const owner = existing.gifted_by ?? existing.user_id;
    if (opts.expectedUserId && owner !== opts.expectedUserId) {
      return fail('owner_mismatch', 'This payment belongs to another account.');
    }
    return { ok: true, reference, ticketId: existing.id, alreadyIssued: true };
  }

  const tx = await fetchPaystackTransaction(reference);
  if (!tx) return fail('payment_not_found', 'We could not find this payment on Paystack.');
  if (tx.status !== 'success') return fail('payment_failed', 'This payment was not successful.');

  const meta = parseMetadata(tx.metadata);
  if (!meta) return fail('payment_not_found', 'This payment is missing ticket details.');
  if (opts.expectedUserId && meta.user_id !== opts.expectedUserId) {
    return fail('owner_mismatch', 'This payment belongs to another account.');
  }
  if (meta.quantity < 1 || meta.quantity > MAX_QTY) {
    return fail('invalid_quantity', 'Invalid ticket quantity.');
  }

  const { ev, tier } = await loadEventAndTier(db, meta.event_slug, meta.tier_id);
  if (!ev) return fail('event_not_found', 'Event not found.');
  if (!tier) return fail('tier_not_found', 'Ticket type not found.');

  const expectedPesewas = Math.round(Number(tier.price) * meta.quantity * 100);
  if (tx.currency !== 'GHS' || Number(tx.amount) !== expectedPesewas) {
    console.error('[payments] amount mismatch', { reference, got: tx.amount, expectedPesewas, currency: tx.currency });
    return fail('amount_mismatch', 'The amount paid does not match the ticket price. Contact support with your reference.');
  }

  // Already paid — issue even if this pushes the tier slightly over (refund handled manually),
  // but log it so the organizer can see an oversell.
  if (Number(tier.sold) + meta.quantity > Number(tier.quantity)) {
    console.warn('[payments] oversell after successful payment', { reference, tier: tier.id });
  }

  const isGift = Boolean(meta.gift_to && meta.gift_to !== meta.user_id);
  return issueTicket(db, {
    reference,
    userId: isGift ? meta.gift_to! : meta.user_id,
    giftedBy: isGift ? meta.user_id : undefined,
    ev,
    tier,
    quantity: meta.quantity,
    totalPaid: Number(tier.price) * meta.quantity,
  });
}

/** Free tier RSVP: one per user per tier. */
export async function fulfillFreeTicket(args: {
  userId: string;
  eventSlug: string;
  tierId: string;
}): Promise<FulfillResult> {
  const db = getAdminClient();
  if (!db) return fail('not_configured', 'Tickets are not configured on the server.');

  const { ev, tier } = await loadEventAndTier(db, args.eventSlug, args.tierId);
  if (!ev) return fail('event_not_found', 'Event not found.');
  if (!tier) return fail('tier_not_found', 'Ticket type not found.');
  if (Number(tier.price) > 0) return fail('payment_failed', 'This ticket is not free.');

  const { data: already } = await db
    .from('tickets')
    .select('id, qr_code')
    .eq('user_id', args.userId)
    .eq('event_slug', ev.slug)
    .eq('ticket_tier', tier.name)
    .eq('status', 'active')
    .maybeSingle();
  if (already) {
    return { ok: true, reference: already.qr_code, ticketId: already.id, alreadyIssued: true };
  }

  if (Number(tier.sold) + 1 > Number(tier.quantity)) {
    return fail('sold_out', 'Sorry, this is fully booked.');
  }

  return issueTicket(db, {
    reference: genFreeRef(),
    userId: args.userId,
    ev,
    tier,
    quantity: 1,
    totalPaid: 0,
  });
}
