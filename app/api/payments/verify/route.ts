import { NextResponse } from 'next/server';
import { fulfillFreeTicket, fulfillPaidTicket, getAdminClient } from '@/lib/payments/fulfill';

export const dynamic = 'force-dynamic';

/**
 * Called by the checkout after Paystack's popup closes (or for free RSVPs).
 *
 * Headers: Authorization: Bearer <supabase access token>
 * Body:
 *   paid → { reference }
 *   free → { eventSlug, tierId }
 */
export async function POST(req: Request) {
  const db = getAdminClient();
  if (!db) {
    return NextResponse.json({ ok: false, message: 'Server not configured.' }, { status: 500 });
  }

  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) {
    return NextResponse.json({ ok: false, message: 'Please sign in.' }, { status: 401 });
  }
  const { data: userData, error: userErr } = await db.auth.getUser(token);
  const user = userData?.user;
  if (userErr || !user) {
    return NextResponse.json({ ok: false, message: 'Please sign in again.' }, { status: 401 });
  }

  let body: { reference?: string; eventSlug?: string; tierId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request.' }, { status: 400 });
  }

  const result = body.reference
    ? await fulfillPaidTicket(String(body.reference), { expectedUserId: user.id })
    : body.eventSlug && body.tierId
      ? await fulfillFreeTicket({ userId: user.id, eventSlug: body.eventSlug, tierId: body.tierId })
      : null;

  if (!result) {
    return NextResponse.json({ ok: false, message: 'Missing ticket details.' }, { status: 400 });
  }
  if (!result.ok) {
    const status =
      result.error === 'not_configured' || result.error === 'db_error' ? 500
      : result.error === 'owner_mismatch' ? 403
      : result.error === 'event_not_found' || result.error === 'tier_not_found' || result.error === 'payment_not_found' ? 404
      : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
