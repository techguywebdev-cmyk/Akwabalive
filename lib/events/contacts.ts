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
  for (const m of Array.from(text.matchAll(/(?:\+?233|0)[\s.-]?\(?\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{3,4}/g))) {
    const intl = ghanaIntl(m[0]);
    if (!intl || seen.has(intl)) continue;
    seen.add(intl);
    const before = text.slice(Math.max(0, (m.index ?? 0) - 60), m.index ?? 0);
    const label = LABELS.find(([re]) => re.test(before))?.[1] ?? 'Call';
    phones.push({ display: pretty(intl), intl, label });
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
  if (/access to everything for free|free drinks/i.test(text)) notes.push('Everything included with your ticket');
  if (/early bird/i.test(text)) notes.push('Early bird tickets available');
  return {
    phones: phones.slice(0, 4), ussd: Array.from(new Set(Array.from(text.matchAll(/\*\d{2,4}(?:\*\d{1,6})*#/g)).map((m) => m[0]))).slice(0, 2), emails, instagram, websites,
    dressCode: dress ? dress[1].trim().replace(/\s+/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : null,
    age: age ? `${age[1] ?? age[2]}+ only` : null,
    notes: notes.filter(Boolean),
  };
}

export const hasInfo = (i: EventInfo) => !!(i.phones.length || i.ussd.length || i.emails.length || i.instagram.length || i.websites.length || i.dressCode || i.age || i.notes.length);
