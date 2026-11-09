import type { GhanaEvent } from '@/lib/types';
import { parseDay } from '@/lib/dates';
import { artistsForEvent } from '@/lib/data/artists';
import { campusOf } from '@/lib/events/campus';

export type HypeKind = 'soldout' | 'last' | 'fast' | 'hot' | 'pick' | 'special' | 'new' | 'returning' | 'stars' | 'detty' | 'campus';
export type Hype = { kind: HypeKind; text: string };

/** Warm tags are about demand; the rest are about what makes the night special. */
export const WARM: HypeKind[] = ['soldout', 'last', 'fast', 'hot'];

/**
 * The one or two things that make this event worth stopping for, strongest first.
 * Every tag comes from real data: ticket sales, an admin or organiser choice, dates, the lineup or past moments.
 */
export function hypeTags(e: GhanaEvent, opts: { returning?: boolean; max?: number } = {}): Hype[] {
  const out: Hype[] = [];
  const day = parseDay(e.date);
  const past = !!day && day.getTime() < new Date(new Date().toDateString()).getTime();
  if (past) return [];

  // Demand, from real ticket sales on Akwaaba
  const tiers = e.tiers ?? [];
  if (tiers.length) {
    const left = tiers.reduce((n, t) => n + Math.max(0, t.quantity - t.sold), 0);
    const sold = tiers.reduce((n, t) => n + t.sold, 0);
    if (left === 0) out.push({ kind: 'soldout', text: 'Sold out' });
    else if (left <= 25 && sold > 0) out.push({ kind: 'last', text: `Last ${left} tickets` });
    else if (tiers.some((t) => t.quantity > 0 && t.sold / t.quantity >= 0.7)) out.push({ kind: 'fast', text: 'Selling fast' });
  }

  // (No "Hot" chip: being marked hot only decides what leads the feed)

  // Student-run: SRC weeks, hall weeks, artiste nights
  const school = campusOf(e);
  if (school) out.push({ kind: 'campus', text: school === 'Campus' ? 'Campus night' : `${school} campus` });

  // The organiser's own line ("Surprise guests", "Album launch")
  if (e.highlight?.trim()) out.push({ kind: 'special', text: e.highlight.trim() });

  // Admin pick
  if (e.isFeatured) out.push({ kind: 'pick', text: 'Akwaaba pick' });

  // Big names on the bill
  const stars = (() => { try { return artistsForEvent(e).length; } catch { return 0; } })();
  if (stars >= 3) out.push({ kind: 'stars', text: 'Star-studded' });

  if (opts.returning) out.push({ kind: 'returning', text: 'Back again' });

  if (e.createdAt && Date.now() - new Date(e.createdAt).getTime() < 7 * 86400000) out.push({ kind: 'new', text: 'Just announced' });

  // Ghana's festive season
  if (day) {
    const m = day.getMonth(), d = day.getDate();
    if ((m === 11 && d >= 15) || (m === 0 && d <= 3)) out.push({ kind: 'detty', text: 'Detty December' });
  }

  return out.slice(0, opts.max ?? 2);
}

const JUNK = /(https?:\/\/|www\.|\.com\b|#\w|@\w|\+?\d[\d\s-]{7,}|whats ?app|call |happening at|location:|find tickets|buy tickets|register or buy|price information|for complete details|click|link in bio)/i;

/**
 * A short, readable line from the event description: no emoji, hashtags, phone numbers or ticket-site boilerplate.
 * Null when nothing worth showing is left (or it just repeats the title).
 */
export function eventExcerpt(desc: string | null | undefined, title = '', max = 150): string | null {
  if (!desc) return null;
  const clean = desc
    .replace(/[\uD800-\uDFFF\u2600-\u27BF\uFE0F\u200D]/g, ' ')
    .replace(/#\w+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const sentences = clean.replace(/([.!?])\s+/g, '$1\u0001').split(/\u0001|\s+[•|]\s+/).map((s) => s.trim()).filter((s) => s.length >= 12 && !JUNK.test(s));
  let out = '';
  for (const s of sentences) {
    const next = out ? `${out} ${s}` : s;
    if (next.length > max) {
      if (!out) out = `${s.slice(0, max).replace(/\s+\S*$/, '').replace(/[\s,;:–—-]+$/, '')}…`;
      break;
    }
    out = next;
  }
  if (out.length < 28) return null;
  const t = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (t && out.toLowerCase().replace(/[^a-z0-9]/g, '') === t) return null;
  // Calm SHOUTING
  if ((out.match(/[A-Z]/g) ?? []).length > out.replace(/[^A-Za-z]/g, '').length * 0.6) out = out.charAt(0) + out.slice(1).toLowerCase();
  return out;
}
