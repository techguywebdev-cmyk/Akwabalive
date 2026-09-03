import { createClient } from '@supabase/supabase-js';
import type { ParsedDraft } from '@/lib/ingest/parseEventLink';
import { scoreDraft } from '@/lib/ingest/scoreDraft';
import { detectArtistsFromText } from '@/lib/data/artists';

function slugify(t: string) {
  return (
    t
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 50) +
    '-' +
    Math.random().toString(36).slice(2, 7)
  );
}

function dateLabel(d: string) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return d;
  }
}

export type IngestResult = {
  url: string;
  ok: boolean;
  decision?: string;
  eventId?: string;
  status?: string;
  score?: number;
  error?: string;
  title?: string;
};

/**
 * Parse a public event/announcement URL and insert into events
 * as published (high confidence) or pending_review (medium).
 */
export async function ingestUrlToSuggestion(
  url: string,
  opts: {
    organizerId: string;
    /** Force queue even if score is high */
    forceReview?: boolean;
  },
): Promise<IngestResult> {
  const { parseEventLink } = await import('@/lib/ingest/parseEventLink');
  let draft: ParsedDraft;
  try {
    draft = await parseEventLink(url);
  } catch (e: any) {
    return { url, ok: false, error: e?.message ?? 'parse failed' };
  }

  if (!draft.title) {
    return { url, ok: false, error: 'no title extracted', title: draft.title };
  }

  // Enrich artists if parser missed
  if (!draft.artistSlugs?.length) {
    const d = detectArtistsFromText(draft.title, draft.description, draft.venue);
    draft.artistSlugs = d.artistSlugs;
    draft.lineup = d.lineup;
  }

  const { score, decision, reasons } = scoreDraft(draft);
  let status: 'published' | 'pending_review' | 'discard' =
    decision === 'auto_publish'
      ? 'published'
      : decision === 'discard'
        ? 'discard'
        : 'pending_review';

  if (opts.forceReview && status === 'published') status = 'pending_review';
  if (status === 'discard') {
    return {
      url,
      ok: false,
      decision: 'discard',
      score,
      title: draft.title,
      error: `low confidence: ${reasons.join('; ')}`,
    };
  }

  const urlEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!urlEnv || !key) {
    return { url, ok: false, error: 'Supabase not configured' };
  }

  const supabase = createClient(urlEnv, key);

  // Dedupe by source_url
  const { data: existing } = await supabase
    .from('events')
    .select('id, status')
    .eq('source_url', url)
    .maybeSingle();

  if (existing) {
    return {
      url,
      ok: true,
      decision: 'duplicate',
      eventId: existing.id,
      status: existing.status,
      score,
      title: draft.title,
    };
  }

  const { data: row, error } = await supabase
    .from('events')
    .insert({
      organizer_id: opts.organizerId,
      title: draft.title.trim(),
      slug: slugify(draft.title),
      description: (draft.description || '').slice(0, 2000),
      category: draft.category || 'concert',
      city: draft.city || 'international',
      region: draft.city || 'international',
      venue: draft.venue || 'TBA',
      date: draft.date || new Date().toISOString().slice(0, 10),
      date_label: draft.dateLabel || dateLabel(draft.date),
      time: draft.time || '20:00',
      image_url: draft.imageUrl || null,
      status,
      listing_type: 'listed',
      ticket_url: draft.ticketUrl || url,
      ticket_source: draft.ticketSource || draft.source,
      source_url: url,
      artist_slugs: draft.artistSlugs?.length ? draft.artistSlugs : null,
      lineup: draft.lineup?.length ? draft.lineup : null,
    })
    .select('id, status')
    .single();

  if (error) {
    return { url, ok: false, error: error.message, title: draft.title, score };
  }

  return {
    url,
    ok: true,
    decision: status,
    eventId: row.id,
    status: row.status,
    score,
    title: draft.title,
  };
}
