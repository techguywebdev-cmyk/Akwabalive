/**
 * The layout of a calendar sheet: every month that has a show, week by week. Weeks with shows get full height
 * (flyer + name in the date); empty weeks shrink to a line of numbers, so the sheet stays short enough to share.
 * Used by the page and by the image.
 */
export type SheetEvent = { slug: string; title: string; date: string; image_url: string | null };
export type SheetCell = { day: number; iso: string; events: SheetEvent[] } | null;
export type SheetWeek = { cells: SheetCell[]; full: boolean };
export type SheetMonth = { y: number; m: number; name: string; count: number; weeks: SheetWeek[] };

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export function sheetMonths(events: SheetEvent[]): SheetMonth[] {
  const byDay: Record<string, SheetEvent[]> = {};
  for (const e of events) (byDay[e.date.slice(0, 10)] ??= []).push(e);
  const keys = Object.keys(byDay).sort();
  if (!keys.length) return [];
  const out: SheetMonth[] = [];
  let y = +keys[0].slice(0, 4), m = +keys[0].slice(5, 7) - 1;
  const ly = +keys[keys.length - 1].slice(0, 4), lm = +keys[keys.length - 1].slice(5, 7) - 1;
  while (y < ly || (y === ly && m <= lm)) {
    const lead = (new Date(y, m, 1).getDay() + 6) % 7;
    const len = new Date(y, m + 1, 0).getDate();
    const cells: SheetCell[] = [...Array(lead).fill(null), ...Array.from({ length: len }, (_, i) => ({ day: i + 1, iso: iso(y, m, i + 1), events: byDay[iso(y, m, i + 1)] ?? [] }))];
    while (cells.length % 7) cells.push(null);
    const weeks: SheetWeek[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      const w = cells.slice(i, i + 7);
      weeks.push({ cells: w, full: w.some((c) => c && c.events.length) });
    }
    const count = keys.filter((k) => k.startsWith(iso(y, m, 1).slice(0, 7))).length;
    if (count) out.push({ y, m, name: MONTH_NAMES[m], count, weeks });
    if (m === 11) { y++; m = 0; } else m++;
  }
  return out;
}

/** "Tidal Rave Festival 2026" → "Tidal Rave"-ish: short enough for a date square */
export function shortName(title: string) {
  let t = title.replace(/\s*[-–|:]?\s*\b20(26|27)\b.*$/i, '').replace(/\s*[-–|:].*$/, '').trim();
  if (t === t.toUpperCase() && /[A-Z]{4}/.test(t)) t = t.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()).replace(/\b(Byk|Bhim|Dj)\b/g, (w) => w.toUpperCase());
  t = t.replace(/\b(Concert|Festival|Fest|Experience|Live)\b/gi, '').replace(/\s+/g, ' ').trim() || t;
  return t.length > 16 ? `${t.slice(0, 15).trim()}…` : t;
}
