import { NextResponse } from 'next/server';
import { events as staticEvents } from '@/lib/data/events';
import { fetchPublishedEvents, supabaseToGhanaEvent } from '@/lib/supabase/events';
import { eventToHeroSlide, pickHeroEvents } from '@/lib/events/rank';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await fetchPublishedEvents();
    const dynamic = rows.map(supabaseToGhanaEvent);
    // Prefer DB events; merge static for fallback content
    const merged = [...dynamic, ...staticEvents];
    const picked = pickHeroEvents(merged, 6);
    const slides = picked.map(eventToHeroSlide);
    return NextResponse.json({ slides });
  } catch (e) {
    console.error('hero route', e);
    return NextResponse.json({ slides: [] }, { status: 200 });
  }
}
