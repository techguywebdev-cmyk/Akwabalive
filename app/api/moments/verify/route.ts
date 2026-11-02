import { NextResponse } from 'next/server';
import { verifyMoments } from '@/lib/moments/verify';
import { findOfficialVideos } from '@/lib/moments/finder';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const maxDuration = 30;

/**
 * Background upkeep for Moments, a little at a time (the Moments page calls this quietly):
 * check which channel posted each video and whether it still plays, then look for new
 * official videos on artists' and shows' own channels (they wait for admin approval).
 */
export async function GET() {
  const checked = await verifyMoments(40);
  const finder = await findOfficialVideos({ resolve: 2, scan: 3 }).catch(() => null);
  return NextResponse.json({ ...checked, finder });
}
