import type { GhanaEvent } from '@/lib/types';
import { daysUntil } from '@/lib/moments/series';

const asDate = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "Saturday" */
export function dayName(iso?: string | null) {
  const d = asDate(iso);
  return d ? d.toLocaleDateString('en-GB', { weekday: 'long' }) : '';
}

/** "SAT 14 DEC" — the date in the card's year slot */
export function dateSlot(e: Pick<GhanaEvent, 'date' | 'dateLabel'>) {
  const d = asDate(e.date);
  if (!d) return (e.dateLabel || '').toUpperCase();
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '').toUpperCase();
}

/** "14 Dec · 6:00 pm" */
export function statLine(e: Pick<GhanaEvent, 'date' | 'dateLabel' | 'time'>) {
  const d = asDate(e.date);
  const day = d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : e.dateLabel;
  return [day, e.time?.toLowerCase()].filter(Boolean).join(' · ');
}

/** "Starts in 2 days", "Tonight", "Tomorrow" — null when far away or past */
export function countdownText(iso?: string | null) {
  const n = daysUntil(iso ?? null);
  if (n == null || n < 0) return null;
  if (n === 0) return 'Tonight';
  if (n === 1) return 'Tomorrow';
  return `Starts in ${n} days`;
}

/** Short status for the card's first capsule */
export function statusText(e: Pick<GhanaEvent, 'date' | 'badge'>) {
  const n = daysUntil(e.date ?? null);
  if (n != null && n >= 0) {
    if (n === 0) return 'Tonight';
    if (n === 1) return 'Tomorrow';
    const d = asDate(e.date)!;
    const dow = d.getDay();
    if (n <= 6 && (dow === 5 || dow === 6 || dow === 0)) return 'This weekend';
    if (n <= 30) return `In ${n} days`;
  }
  if (n != null && n < 0) return 'Past event';
  return e.badge ? e.badge.charAt(0) + e.badge.slice(1).toLowerCase() : 'Upcoming';
}
