/**
 * Date labels built by hand, not with toLocaleDateString: Node and browsers format
 * 'en-GB' slightly differently ("Saturday, 10 October" vs "Saturday 10 October"),
 * which breaks hydration on server-rendered pages.
 */
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2026-12-14" → Date at local midnight, or null */
export function parseDay(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Sat 14 Dec" */
export function shortDay(d: Date) {
  return `${DAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

/** "Saturday 14 December" (+ year when it isn't this year, or when asked) */
export function longDay(d: Date, withYear = d.getFullYear() !== new Date().getFullYear()) {
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ''}`;
}

export const weekdayName = (d: Date) => DAYS[d.getDay()];
