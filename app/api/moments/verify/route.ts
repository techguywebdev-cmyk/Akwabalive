import { NextResponse } from 'next/server';
import { verifyMoments } from '@/lib/moments/verify';

export const dynamic = 'force-dynamic';

/** Checks moments that haven't been checked yet (safe to call any time; does nothing when all are done) */
export async function GET() {
  const result = await verifyMoments(40);
  return NextResponse.json(result);
}
