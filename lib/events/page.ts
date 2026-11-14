/**
 * An event's own page settings, set by its organiser: the page they send people to instead of a website.
 * Stored on events.page (jsonb). Everything is optional.
 */
export type EventFaq = { q: string; a: string };
export type EventPage = {
  /** The organiser's colour for the page (#RRGGBB) */
  accent?: string | null;
  /** Photos from past editions or the venue, newest first */
  gallery?: string[] | null;
  /** How to get there: landmarks, which gate, drop-off point */
  directions?: string | null;
  parking?: string | null;
  /** When gates open, if different from the start time */
  doors?: string | null;
  refunds?: string | null;
  faqs?: EventFaq[] | null;
  /** Who's on when, in running order */
  sets?: EventSet[] | null;
};
export type EventSet = { name: string; time: string };

export const PAGE_ACCENTS = ['#7BE3A8', '#F5C451', '#FF7A59', '#FF5C8A', '#B57BFF', '#5AA9FF', '#2DD4BF', '#F2F2F2'];
export const GALLERY_MAX = 12;
export const FAQ_MAX = 10;
export const SETS_MAX = 24;

const HEX = /^#[0-9a-f]{6}$/i;
const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/** Cleans what comes from the database or the form into a safe EventPage */
export function cleanPage(raw: unknown): EventPage {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const accent = typeof p.accent === 'string' && HEX.test(p.accent) ? p.accent.toUpperCase() : null;
  const gallery = Array.isArray(p.gallery) ? p.gallery.filter((u): u is string => typeof u === 'string' && /^https:\/\//.test(u)).slice(0, GALLERY_MAX) : [];
  const faqs = Array.isArray(p.faqs)
    ? p.faqs.map((f) => ({ q: str((f as EventFaq)?.q, 160), a: str((f as EventFaq)?.a, 800) })).filter((f): f is EventFaq => !!f.q && !!f.a).slice(0, FAQ_MAX)
    : [];
  const sets = Array.isArray(p.sets)
    ? p.sets.map((x) => ({ name: str((x as EventSet)?.name, 80), time: str((x as EventSet)?.time, 20) })).filter((x): x is EventSet => !!x.name && !!x.time).slice(0, SETS_MAX)
    : [];
  return { accent, gallery, sets, directions: str(p.directions, 600), parking: str(p.parking, 300), doors: str(p.doors, 60), refunds: str(p.refunds, 400), faqs };
}

/** Short link codes: lowercase letters, numbers and dashes, 3–40 long */
export const cleanCode = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-').slice(0, 40);
export const codeOk = (v: string) => /^[a-z0-9][a-z0-9-]{2,39}$/.test(v);

/** Dark or light text, whichever reads on this colour */
export function onAccent(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.32 ? '#06110B' : '#FFFFFF';
}
export const hexToRgb = (hex: string): [number, number, number] => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

/** All the questions for the page: the organiser's own, then the practical ones they filled in */
export function pageFaqs(page: EventPage, extra: { dressCode?: string | null; age?: string | null } = {}): EventFaq[] {
  const out: EventFaq[] = [...(page.faqs ?? [])];
  const has = (re: RegExp) => out.some((f) => re.test(f.q));
  if (page.doors && !has(/gate|door/i)) out.push({ q: 'What time do gates open?', a: page.doors });
  if (page.parking && !has(/park/i)) out.push({ q: 'Is there parking?', a: page.parking });
  if (extra.dressCode && !has(/dress/i)) out.push({ q: 'Is there a dress code?', a: extra.dressCode });
  if (extra.age && !has(/age|18|21/i)) out.push({ q: 'Is there an age limit?', a: extra.age });
  if (page.refunds && !has(/refund/i)) out.push({ q: 'Can I get a refund?', a: page.refunds });
  return out;
}

/** Minutes after midnight for a set time like "9:00PM", "21:30" or "9pm"; null when it can't be read */
export function setMinutes(t: string): number | null {
  const m = t.toLowerCase().match(/(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?/);
  if (!m) return null;
  let h = Number(m[1]) % 24;
  if (m[3] === 'pm' && h < 12) h += 12;
  if (m[3] === 'am' && h === 12) h = 0;
  return h * 60 + Number(m[2] ?? 0);
}
/** Set times shown the same way: "9:00 PM" */
export function niceSetTime(t: string): string {
  const n = setMinutes(t);
  if (n == null) return t;
  const h = Math.floor(n / 60), mm = n % 60;
  return `${h % 12 || 12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
