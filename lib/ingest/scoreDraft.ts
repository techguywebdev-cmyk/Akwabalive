import type { ParsedDraft } from '@/lib/ingest/parseEventLink';

export type PublishDecision = 'auto_publish' | 'pending_review' | 'discard';

export function scoreDraft(draft: ParsedDraft): {
  score: number;
  decision: PublishDecision;
  reasons: string[];
} {
  let score = draft.confidence ?? 0;
  const reasons: string[] = [];

  if (draft.date) {
    score += 0.1;
    reasons.push('has date');
  } else {
    reasons.push('missing date');
  }

  if (draft.venue && draft.venue.length > 2) {
    score += 0.1;
    reasons.push('has venue');
  } else {
    reasons.push('missing venue');
  }

  if (draft.ticketUrl && !/instagram\.com|twitter\.com|x\.com/i.test(draft.ticketUrl)) {
    score += 0.15;
    reasons.push('real ticket URL');
  } else if (draft.ticketUrl) {
    reasons.push('ticket URL is social post only');
  }

  if (draft.artistSlugs?.length) {
    score += 0.1;
    reasons.push(`artists: ${draft.artistSlugs.join(', ')}`);
  }

  if (draft.city && draft.city !== 'international') {
    score += 0.05;
  }

  score = Math.min(0.99, score);

  let decision: PublishDecision = 'pending_review';
  if (score >= 0.85 && draft.date && draft.venue) {
    decision = 'auto_publish';
  } else if (score < 0.4 || !draft.title) {
    decision = 'discard';
  }

  return { score, decision, reasons };
}
