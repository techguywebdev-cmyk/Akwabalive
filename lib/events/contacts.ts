/**
 * The practical bits people look for on a flyer or in a listing: who to call, the event's Instagram,
 * email, website, dress code, age limit, what's included. Read from the description and the flyer's own text.
 */
export type Phone = { display: string; intl: string; label: string };
export type EventInfo = {
  phones: Phone[];
  /** Short codes to dial for tickets, e.g. *714*20# */
  ussd: string[];
  emails: string[];
  instagram: string[];
  websites: string[];
  dressCode: string | null;
  age: string | null;
  notes: string[];
  /** Price at the gate when the flyer gives one */
  gatePrice: number | null;
};

const LABELS: [RegExp, string][] = [
  [/table|reserv|booking|vip/i, 'Tables & reservations'],
  [/sponsor|partner/i, 'Sponsorship'],
  [/ticket|enquir|inquir|info/i, 'Tickets & enquiries'],
  [/vendor|stand|booth|exhibit/i, 'Vendors'],
];

/** 0244 697 529 / +233 24 469 7529 / 233244697529 → +233244697529 */
function ghanaIntl(raw: string): string | null {
  const d = raw.replace(/\D/g, '');
  if (/^0[235]\d{8}$/.test(d)) return `+233${d.slice(1)}`;
  if (/^233[235]\d{8}$/.test(d)) return `+${d}`;
  return null;
}
const pretty = (intl: string) => `0${intl.slice(4, 6)} ${intl.slice(6, 9)} ${intl.slice(9)}`;

export function eventInfo(...texts: Array<string | null | undefined>): EventInfo {
  const text = texts.filter(Boolean).join('\n').replace(/[–—]/g, '-');
  const phones: Phone[] = [];
  const seen = new Set<string>();
  const labelFor = (at: number) => {
    // The words just before the number (same line or the line above) say what it's for
    const before = text.slice(Math.max(0, at - 70), at);
    return LABELS.find(([re]) => re.test(before))?.[1] ?? 'Call';
  };
  // Ghana numbers: 0244 697 529, 024-469-7529, +233 24 469 7529, +233 509388909, Tel_0540515129
  for (const m of Array.from(text.matchAll(/(?:\+\s?233|\b233|\b0)[\s._-]?\(?\d{2}\)?[\s._-]?\d{3}[\s._-]?\d{3,4}\b/g))) {
    const intl = ghanaIntl(m[0]);
    if (!intl || seen.has(intl)) continue;
    seen.add(intl);
    phones.push({ display: pretty(intl), intl, label: labelFor(m.index ?? 0) });
  }
  // Numbers abroad (diaspora promoters): +1 615 739 1564, +44 7700 900123
  for (const m of Array.from(text.matchAll(/\+\s?(1|44)[\s.-]?\(?\d{3,4}\)?[\s.-]?\d{3}[\s.-]?\d{3,4}\b/g))) {
    const digits = m[0].replace(/\D/g, '');
    const intl = `+${digits}`;
    if (seen.has(intl) || digits.length < 11 || digits.length > 13) continue;
    seen.add(intl);
    phones.push({ display: m[0].replace(/\s+/g, ' ').trim(), intl, label: labelFor(m.index ?? 0) });
  }
  const emails = Array.from(new Set(Array.from(text.matchAll(/[\w.+-]+@[\w-]+\.[\w.]{2,}/g)).map((m) => m[0].toLowerCase()))).slice(0, 3);
  const instagram = Array.from(new Set(Array.from(text.matchAll(/(?:^|[\s(])@([a-z0-9_.]{3,30})\b/gi))
    // all-caps after @ is a flyer saying "@ BUKOM ARENA", not a handle
    .map((m) => m[1].replace(/\.$/, '')).filter((h) => !(h === h.toUpperCase() && /[A-Z]/.test(h))).filter((h) => !emails.some((e) => e.includes(`@${h.toLowerCase()}`))))).slice(0, 4);
  const websites = Array.from(new Set(Array.from(text.matchAll(/\b(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+\.(?:com|gh|com\.gh|net|org|live|events|co|africa|tv))(\/[^\s)]*)?/gi))
    .map((m) => m[0].replace(/[.,]$/, '').toLowerCase()).filter((w) => !/instagram|facebook|twitter|x\.com|tiktok|allevents|eventbrite|egotickets/i.test(w) && !emails.some((e) => e.endsWith(`@${w.toLowerCase().replace(/^https?:\/\/(www\.)?/, '')}`))))).slice(0, 2);
  const dress = text.match(/dress\s*code\s*[:\-]?\s*([a-z][a-z &/-]{2,30})/i);
  const age = text.match(/\b(18|21)\s*\+|\b(18|21)\s*(?:years|yrs)\s*(?:and above|\+)/i);
  const notes: string[] = [];
  const doors = text.match(/doors?\s*open(?:s)?\s*(?:at|from)?\s*:?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))(\s*-\s*late)?/i);
  if (doors) notes.push(`Doors open ${doors[1].replace(/\s+/g, '').toUpperCase().replace(/(AM|PM)/, ' $1')}${doors[2] ? ' till late' : ''}`);
  const gate = text.match(/(?:gate|at the gate|on the gate)\s*[-:–]?\s*(?:gh[c₵¢]|gh₵|ghs|₵)\s*(\d{1,5})/i);
  if (gate) notes.push(`Gate: GH₵ ${gate[1]}`);
  if (/tables?\s+(?:are\s+)?(?:strictly\s+)?(?:by\s+)?reserv/i.test(text)) notes.push('Tables by reservation only');
  if (/access to everything for free|free drinks|open bar/i.test(text)) notes.push('Everything included with your ticket');
  if (/early bird/i.test(text)) notes.push('Early bird tickets available');
  if (/private location|location (?:will be )?(?:shared|sent)/i.test(text)) notes.push('Location shared with ticket holders');
  return {
    phones: phones.slice(0, 4), ussd: Array.from(new Set(Array.from(text.matchAll(/\*\d{2,4}(?:\*\d{1,6})*#/g)).map((m) => m[0]))).slice(0, 2), emails, instagram, websites,
    dressCode: dress ? dress[1].trim().replace(/\s+/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : null,
    age: age ? `${age[1] ?? age[2]}+ only` : null,
    notes: notes.filter(Boolean),
    gatePrice: gate ? Number(gate[1]) : null,
  };
}

export const hasInfo = (i: EventInfo) => !!(i.phones.length || i.ussd.length || i.emails.length || i.instagram.length || i.websites.length || i.dressCode || i.age || i.notes.length);
