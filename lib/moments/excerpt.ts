/**
 * Turn an uploader's YouTube description into a readable excerpt: keep the sentences about the night,
 * drop links, hashtags, credits, "subscribe/stream/follow" lines, bookings and contact details.
 * Returns null when nothing worth showing is left.
 */
const JUNK = /(https?:\/\/|www\.|@\w|#\w|subscribe|follow (me|us)|stream|spotify|apple music|audiomack|boomplay|booking|bookings|contact|enquir|e-?mail|whats ?app|\+?\d[\d\s-]{7,}|all rights|©|copyright|prod(uced)? by|directed by|dop\b|shot by|edited by|video by|mixed by|mastered by|management|mgt|label|distributed|lyrics|turn on notifications|like and share|merch|available (now|on)|out now|click|link)/i;

export function cleanExcerpt(desc: string | null | undefined, max = 420): string | null {
  if (!desc) return null;
  const lines = desc.split('\n').map((l) => l.replace(/[\uD800-\uDFFF\u2600-\u27BF\uFE0F]/g, '').replace(/\s+/g, ' ').trim())
    .filter((l) => l.length >= 25 && !JUNK.test(l) && /[a-z]/i.test(l) && (l.match(/[A-Z]/g) ?? []).length < l.length * 0.6);
  let out = '';
  for (const l of lines) {
    const next = out ? `${out} ${/[.!?]$/.test(out) ? '' : '· '}${l}` : l;
    if (next.length > max) {
      if (!out) out = l.slice(0, max).replace(/\s+\S*$/, '') + '…';
      break;
    }
    out = next;
  }
  out = out.replace(/\s+·\s+/g, ' · ').trim();
  return out.length >= 60 ? out : null;
}
