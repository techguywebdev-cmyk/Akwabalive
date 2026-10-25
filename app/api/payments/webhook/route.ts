import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { fulfillPaidTicket } from '@/lib/payments/fulfill';

export const dynamic = 'force-dynamic';

/**
 * Paystack webhook — backup path so a ticket is still issued if the buyer
 * closes the tab before the checkout calls /api/payments/verify.
 *
 * Set in Paystack dashboard → Settings → API Keys & Webhooks:
 *   https://<your-domain>/api/payments/webhook
 */
export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ ok: false }, { status: 500 });

  const raw = await req.text();
  const signature = req.headers.get('x-paystack-signature') || '';
  const expected = crypto.createHmac('sha512', secret).update(raw).digest('hex');

  const valid =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) return NextResponse.json({ ok: false }, { status: 401 });

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (event?.event === 'charge.success' && event?.data?.reference) {
    // Re-verifies with Paystack and is idempotent on the reference.
    const result = await fulfillPaidTicket(String(event.data.reference));
    if (!result.ok) console.error('[paystack webhook]', event.data.reference, result.error, result.message);
  }

  // Always 200 so Paystack doesn't keep retrying events we've handled or can't use.
  return NextResponse.json({ ok: true });
}
