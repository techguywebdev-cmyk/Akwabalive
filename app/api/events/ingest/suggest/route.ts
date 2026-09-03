import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ingestUrlToSuggestion } from '@/lib/ingest/createSuggestion';

/**
 * Authenticated organizer: submit one or more public URLs into the suggestion pipeline.
 * POST { "urls": ["https://..."], "forceReview": true }
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    // Prefer user JWT; fall back to system organizer for cron-style tools
    let organizerId = process.env.INGEST_ORGANIZER_ID || '';

    if (token && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } },
      );
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) organizerId = userData.user.id;
    }

    if (!organizerId) {
      return NextResponse.json(
        { error: 'Sign in or set INGEST_ORGANIZER_ID.' },
        { status: 401 },
      );
    }

    const body = await req.json();
    const urls: string[] = Array.isArray(body.urls)
      ? body.urls
      : body.url
        ? [body.url]
        : [];

    if (!urls.length) {
      return NextResponse.json({ error: 'Provide urls: string[]' }, { status: 400 });
    }

    const results = [];
    for (const u of urls.slice(0, 15)) {
      results.push(
        await ingestUrlToSuggestion(String(u), {
          organizerId,
          forceReview: body.forceReview !== false,
        }),
      );
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'ingest failed' }, { status: 500 });
  }
}
