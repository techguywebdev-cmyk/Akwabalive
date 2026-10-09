/**
 * Event "series" matching — links a past moment (e.g. "Rapperholic 2025") to the
 * next edition of the same event (e.g. "Rapperholic 2026"), and back.
 * Same rules the event page uses to find a last-edition moment.
 */
const NOISE = /\b(kumasi|accra|live|concert|festival|edition|the|melbourne|sydney|australia|london|tour|night|show)\b/g;

export function seriesKey(name: string | null | undefined): string | null {
  if (!name) return null;
  const words = name
    .toLowerCase()
    .replace(/\b(19|20)\d{2}\b/g, '')
    .replace(NOISE, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  return words[0] ?? null;
}

export function daysUntil(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  const target = new Date(`${isoDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}
