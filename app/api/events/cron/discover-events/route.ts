import { NextResponse } from 'next/server';
import { getWatchedSources, EVENT_SIGNAL_RE } from '@/lib/ingest/watchedSources';
import { ingestUrlToSuggestion } from '@/lib/ingest/createSuggestion';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Cron / manual discovery entrypoint.
 *
 * Auth: Authorization: Bearer $CRON_SECRET  OR  ?secret=
 *
 * Body (optional):
 * { "urls": ["https://..."], "forceReview": true }
 *
 * Without urls: if X_BEARER_TOKEN is set, fetches recent posts from watched
 * artist handles and ingests links that look like event announcements.
 * Otherwise returns watched list + instructions.
 */
export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}

async function run(req: Request) {
  const url = new URL(req.url);
  const auth = req.headers.get('authorization') || '';
  const secret =
    url.searchParams.get('secret') ||
    (auth.startsWith('Bearer ') ? auth.slice(7) : '');
  const expected = process.env.CRON_SECRET;

  if (expected && secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organizerId = process.env.INGEST_ORGANIZER_ID;
  if (!organizerId) {
    return NextResponse.json(
      {
        error:
          'Set INGEST_ORGANIZER_ID to a profiles.id that owns system-ingested events.',
        watched: getWatchedSources().map((s) => s.artistSlug),
      },
      { status: 400 },
    );
  }

  let body: { urls?: string[]; forceReview?: boolean } = {};
  if (req.method === 'POST') {
    try {
      body = await req.json();
    } catch {
      body = {};
    }
  }

  const candidateUrls: string[] = [...(body.urls || [])];

  // Optional: pull recent posts from X for watched handles
  const bearer = process.env.X_BEARER_TOKEN;
  if (bearer && candidateUrls.length === 0) {
    const sources = getWatchedSources().filter((s) => s.xHandle);
    for (const s of sources.slice(0, 8)) {
      try {
        const posts = await fetchRecentPosts(s.xHandle!, bearer);
        for (const p of posts) {
          if (!EVENT_SIGNAL_RE.test(p.text)) continue;
          // Prefer expanded URLs in text
          const links = p.text.match(/https?:\/\/[^\s]+/g) || [];
          if (links.length) {
            candidateUrls.push(...links.map(cleanUrl));
          } else {
            // No outbound link — still try x.com status as source for OCR/caption later
            candidateUrls.push(`https://x.com/${s.xHandle}/status/${p.id}`);
          }
        }
      } catch (e: any) {
        console.error('X fetch', s.xHandle, e?.message);
      }
    }
  }

  const unique = [...new Set(candidateUrls)].slice(0, 25);
  if (unique.length === 0) {
    return NextResponse.json({
      ok: true,
      message:
        'No candidate URLs. POST { "urls": ["https://..."] } or set X_BEARER_TOKEN to pull watched handles.',
      watched: getWatchedSources(),
      results: [],
    });
  }

  const results = [];
  for (const u of unique) {
    const r = await ingestUrlToSuggestion(u, {
      organizerId,
      forceReview: body.forceReview !== false, // default to review for safety
    });
    results.push(r);
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    results,
  });
}

function cleanUrl(u: string) {
  return u.replace(/[),.;]+$/, '');
}

async function fetchRecentPosts(
  handle: string,
  bearer: string,
): Promise<{ id: string; text: string }[]> {
  // Resolve user id
  const userRes = await fetch(
    `https://api.twitter.com/2/users/by/username/${encodeURIComponent(handle)}`,
    { headers: { Authorization: `Bearer ${bearer}` } },
  );
  if (!userRes.ok) return [];
  const userJson = await userRes.json();
  const userId = userJson?.data?.id;
  if (!userId) return [];

  const tl = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?max_results=10&tweet.fields=created_at,entities`,
    { headers: { Authorization: `Bearer ${bearer}` } },
  );
  if (!tl.ok) return [];
  const tlJson = await tl.json();
  const data = tlJson?.data || [];
  return data.map((t: any) => ({
    id: t.id,
    text: t.text || '',
  }));
}
