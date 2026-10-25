import { createClient } from '@supabase/supabase-js';

/**
 * Daily event importer. Reads the public event listings of Ghana ticket sites, opens
 * each new event page, pulls title, date, venue, flyer and ticket types, and adds the
 * event to the review queue (status pending_review) through the ingest_import_event
 * database function. Nothing is published without a person approving it.
 */

export type ImportTier = { name: string; price: number; description?: string };
export type ImportDraft = {
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // "7:00 PM" or "Time TBA"
  venue: string;
  area: string | null;
  address: string | null;
  city: string;
  lat: number | null;
  lng: number | null;
  image: string | null;
  category: string;
  tiers: ImportTier[];
  ticketUrl: string;
  ticketSource: string;
  sourceUrl: string;
};

type Source = {
  name: string;
  lists: string[];
  /** Event page URLs on the listing pages */
  link: RegExp;
  /** Pages under the pattern that are not events */
  skip?: RegExp;
};

export const SOURCES: Source[] = [
  {
    name: 'Egotickets',
    lists: ['https://egotickets.com/events', 'https://egotickets.com/events?page=2', 'https://egotickets.com/events?page=3'],
    link: /^https:\/\/(?:www\.)?egotickets\.com\/events\/[a-z0-9][a-z0-9-]+$/i,
    skip: /\/events\/(?:new|search|category|categories|page|create|featured|popular|upcoming|past|online)(?:$|[/?])/i,
  },
  {
    name: 'AllEvents',
    lists: [
      'https://allevents.in/accra/all',
      'https://allevents.in/accra/concerts',
      'https://allevents.in/kumasi/all',
      'https://allevents.in/tema/all',
    ],
    link: /^https:\/\/allevents\.in\/(?:accra|kumasi|tema|cape-coast|takoradi|tamale|ho|koforidua|sunyani)\/[a-z0-9-]+\/\d{8,}$/i,
  },
  {
    name: 'Eventbrite',
    lists: ['https://www.eventbrite.com/d/ghana--accra/events/', 'https://www.eventbrite.com/d/ghana--kumasi/events/'],
    link: /^https:\/\/www\.eventbrite\.(?:com|co\.uk)\/e\/[a-z0-9-]+-\d{6,}$/i,
  },
];

/* ── Fetching ─────────────────────────────────────────────────────────── */

const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36 AkwaabaBot/1.0 (+https://akwabalive.vercel.app)';

export async function fetchHtml(url: string, ms = 12000): Promise<string> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en-GB,en;q=0.9' }, redirect: 'follow', signal: ctl.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

export function extractLinks(html: string, base: string, src: Source): string[] {
  const out = new Set<string>();
  for (const m of Array.from(html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi))) {
    try {
      const u = new URL(decodeEntities(m[1]), base);
      u.search = '';
      u.hash = '';
      const s = u.toString().replace(/\/$/, '');
      if (src.link.test(s) && !(src.skip && src.skip.test(s))) out.add(s);
    } catch { /* ignore */ }
  }
  return Array.from(out);
}

/* ── Page parsing ─────────────────────────────────────────────────────── */

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function meta(html: string, prop: string): string {
  const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, 'i');
  return decodeEntities((html.match(re1)?.[1] || html.match(re2)?.[1] || '').trim());
}

function pageText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<(?:br|\/p|\/div|\/li|\/h\d|\/tr|\/section|\/article|\/span|\/button|\/a)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function jsonLdEvents(html: string): any[] {
  const out: any[] = [];
  const walk = (n: any) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    const t = ([] as string[]).concat(n['@type'] ?? []).join(' ');
    if (/Event\b/.test(t) && n.name && n.startDate) out.push(n);
    if (n['@graph']) walk(n['@graph']);
  };
  for (const m of Array.from(html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))) {
    try { walk(JSON.parse(m[1].trim())); } catch {
      try { walk(JSON.parse(decodeEntities(m[1].trim()))); } catch { /* ignore */ }
    }
  }
  return out;
}

const MON: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n: number) => String(n).padStart(2, '0');

function to12h(h: number, m: number) {
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${pad(m)} ${ap}`;
}

/** "2026-12-12T19:00:00+00:00" → { date, time } (time in the event's own clock) */
function fromIso(iso: string): { date: string; time: string } | null {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) return null;
  const time = m[4] && !(m[4] === '00' && m[5] === '00') ? to12h(Number(m[4]), Number(m[5])) : 'Time TBA';
  return { date: `${m[1]}-${m[2]}-${m[3]}`, time };
}

/** "Sat, 12 Dec 2026 at 7:00 PM" / "12 December 2026" */
function fromText(s: string): { date: string; time: string } | null {
  const m = s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?,?\s+(20\d{2})(?:[^0-9]{1,6}(\d{1,2}):(\d{2})\s*([ap]m))?/i);
  if (!m) return null;
  const mo = MON[m[2].toLowerCase().slice(0, m[2].toLowerCase().startsWith('sept') ? 4 : 3)] ?? MON[m[2].toLowerCase().slice(0, 3)];
  let time = 'Time TBA';
  if (m[4]) {
    let h = Number(m[4]) % 12;
    if (/pm/i.test(m[6])) h += 12;
    time = to12h(h, Number(m[5]));
  }
  return { date: `${m[3]}-${pad(mo)}-${pad(Number(m[1]))}`, time };
}

const CITY_WORDS: [RegExp, string, string | null][] = [
  [/\bkumasi\b/i, 'kumasi', null],
  [/\bcape\s*coast\b/i, 'cape-coast', null],
  [/\b(takoradi|sekondi)\b/i, 'takoradi', null],
  [/\btamale\b/i, 'tamale', null],
  [/\bho\b(?!tel)/i, 'ho', null],
  [/\btema\b/i, 'accra', 'Tema'],
  [/\b(accra|east legon|osu|labadi|spintex|airport|cantonments|east-legon|kasoa|madina|adenta)\b/i, 'accra', null],
];

function detectCity(...parts: (string | null | undefined)[]): { city: string; area: string | null } | null {
  const s = parts.filter(Boolean).join(' ');
  for (const [re, city, area] of CITY_WORDS) if (re.test(s)) return { city, area };
  return /\bghana\b/i.test(s) ? { city: 'accra', area: null } : null;
}

const CITY_CENTRES: [string, number, number][] = [
  ['accra', 5.6037, -0.187], ['kumasi', 6.6885, -1.6244], ['cape-coast', 5.1053, -1.2466],
  ['takoradi', 4.8975, -1.7603], ['tamale', 9.4008, -0.8393], ['ho', 6.6008, 0.4713],
];
/** Nearest city to a point in Ghana (null when the point is outside Ghana) */
function cityFromGeo(lat: number | null, lng: number | null): string | null {
  if (lat == null || lng == null || lat < 4.5 || lat > 11.3 || lng < -3.4 || lng > 1.3) return null;
  let best = 'accra'; let d = Infinity;
  for (const [c, a, b] of CITY_CENTRES) { const x = (a - lat) ** 2 + (b - lng) ** 2; if (x < d) { d = x; best = c; } }
  return best;
}

/** Words that show a listing is an event someone can go to */
const EVENT_SIGNAL = /\b(concert|festival|fest|party|rave|live|tickets?|show|night|tour|carnival|comedy|worship|praise|summit|conference|forum|fair|exhibition|expo|brunch|experience|championship|gala|awards?|launch|premiere|screening|workshop|masterclass|hangout|meet ?up|jam|session|picnic|games?|tournament|race|run|marathon|walk|yoga)\b/i;
/** Titles that are news or notices, not events */
const NOT_EVENT = /\b(part ways|breaking|reportedly|sources say|transfer|signs for|condolence|obituary|for sale|admission(s)? open|vacanc(y|ies)|hiring|recruitment|learning \w+)\b/i;

const CATEGORY_WORDS: [RegExp, string][] = [
  [/\b(festival|fest|carnival)\b/i, 'festival'],
  [/\b(party|rave|club|night\s?life|dj|afterparty|after party|day party|brunch party)\b/i, 'nightlife'],
  [/\b(food|jollof|brunch|dinner|tasting|chops|wine|cocktail)\b/i, 'food'],
  [/\b(church|gospel|worship|praise|prayer|crusade|revival|choir)\b/i, 'culture'],
  [/\b(tech|summit|conference|hackathon|startup|ai|workshop|masterclass|bootcamp)\b/i, 'tech'],
  [/\b(art|exhibition|gallery|painting|photography)\b/i, 'art'],
  [/\b(fashion|runway|style)\b/i, 'fashion'],
  [/\b(yoga|wellness|fitness|run|marathon|pilates|meditation)\b/i, 'wellness'],
  [/\b(football|match|league|boxing|sports?|tournament|cup)\b/i, 'sports'],
  [/\b(comedy|theatre|theater|play|drama|poetry|culture|heritage|durbar)\b/i, 'culture'],
];
function guessCategory(text: string): string {
  for (const [re, c] of CATEGORY_WORDS) if (re.test(text)) return c;
  return 'concert';
}

function firstImage(img: any): string | null {
  if (!img) return null;
  if (typeof img === 'string') return img;
  if (Array.isArray(img)) return firstImage(img[0]);
  return img.url || img.contentUrl || null;
}

/** Ticket types from schema.org offers (GHS only) */
function tiersFromOffers(offers: any): ImportTier[] {
  const list: any[] = [];
  const walk = (o: any) => {
    if (!o) return;
    if (Array.isArray(o)) { o.forEach(walk); return; }
    if (o.offers) walk(o.offers);
    if (o.price != null || o.lowPrice != null) list.push(o);
  };
  walk(offers);
  const out: ImportTier[] = [];
  for (const o of list) {
    const cur = String(o.priceCurrency || 'GHS').toUpperCase();
    if (cur !== 'GHS' && cur !== 'GHC') continue;
    const price = Number(String(o.price ?? o.lowPrice).replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(price)) continue;
    const name = String(o.name || o.category || (list.length === 1 ? 'General' : '')).trim().slice(0, 60);
    if (!name || out.some((t) => t.name.toLowerCase() === name.toLowerCase())) continue;
    if (price === 0 && !/free|rsvp|register/i.test(name)) continue; // sites put 0 on 'pay by MoMo' passes
    out.push({ name, price });
  }
  return out;
}

/** Lines near prices that are page furniture, not ticket names */
const NOT_TIER = /[₵¢,]|GHS|\bfrom\b|tickets?( page)?$|^get |sold out|\d{4}|protection|read more|learn more|see more|show more|similar|dates?\b|\b(am|pm)\b|^every |^free\b|share|follow|organi[sz]er|location|venue|about|description|refund|policy|^\d+$|^[–-]/i;

/** Ticket types from page text: a short name line, then (within 3 lines) a ₵ / GHS price */
function tiersFromText(text: string): ImportTier[] {
  const lines = text.split('\n');
  const out: ImportTier[] = [];
  const priceRe = /^(?:GH₵|GHS|GH¢|₵|¢|GHC)\s?([\d,]+(?:\.\d{1,2})?)$|^([\d,]+(?:\.\d{1,2})?)\s?(?:GHS|GH₵|₵|GHC)$/i;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(priceRe);
    if (!m) continue;
    const price = Number((m[1] || m[2]).replace(/,/g, ''));
    // The name is the shortest plausible line just above the price (a description may sit between)
    const near: string[] = [];
    for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
      if (priceRe.test(lines[j])) break;
      const name = lines[j];
      if (name.length > 1 && name.length <= 40 && !NOT_TIER.test(name)) near.push(name);
    }
    if (!near.length || price < 5) continue; // fees like 'Attendee protection ₵1'
    const nm = near.sort((x, y) => x.length - y.length)[0].replace(/\s+/g, ' ');
    if (!out.some((t) => t.name.toLowerCase() === nm.toLowerCase())) out.push({ name: nm.charAt(0).toUpperCase() + nm.slice(1), price });
  }
  return out.slice(0, 8);
}

export function parseEventPage(url: string, html: string, source: string): ImportDraft | null {
  const ld = jsonLdEvents(html)[0];
  const text = pageText(html);
  const ogTitle = meta(html, 'og:title') || (html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '');
  const ogDesc = meta(html, 'og:description') || meta(html, 'description');
  const ogImage = meta(html, 'og:image') || meta(html, 'og:image:url') || meta(html, 'twitter:image');

  let title = '';
  let when: { date: string; time: string } | null = null;
  let venue = '';
  let address: string | null = null;
  let lat: number | null = null;
  let lng: number | null = null;
  let description = '';
  let image: string | null = null;
  let tiers: ImportTier[] = [];

  if (ld) {
    title = decodeEntities(String(ld.name)).trim();
    when = fromIso(ld.startDate);
    const loc = Array.isArray(ld.location) ? ld.location[0] : ld.location;
    if (loc) {
      venue = decodeEntities(String(loc.name || '')).trim();
      const a = loc.address;
      address = typeof a === 'string' ? a : a ? [a.streetAddress, a.addressLocality, a.addressRegion].filter(Boolean).join(', ') : null;
      if (loc.geo) { lat = Number(loc.geo.latitude) || null; lng = Number(loc.geo.longitude) || null; }
    }
    description = decodeEntities(String(ld.description || '')).replace(/\s+/g, ' ').trim();
    image = firstImage(ld.image);
    tiers = tiersFromOffers(ld.offers);
  }

  // Egotickets puts everything in the page title: "eGotickets — NAME at VENUE, Ghana, Sat, 12 Dec 2026 at 7:00 PM, Get Tickets"
  const ego = ogTitle.match(/^\s*eGotickets\s*[—-]\s*(.+?)\s+at\s+(.+?),\s*Ghana,\s*(.+?),\s*Get Tickets/i);
  if (ego) {
    title = title || ego[1].trim();
    venue = venue || ego[2].trim();
    when = when || fromText(ego[3]);
  }

  title = title || ogTitle.replace(/\s*[|–—-]\s*(eventbrite|allevents|egotickets).*$/i, '').trim();
  when = when || fromText(`${ogTitle} ${ogDesc} ${text.slice(0, 4000)}`);
  description = description || ogDesc;
  image = image || ogImage || null;
  // Sites often publish one 'from' price in their data; the page text has the real ticket types
  if (tiers.length <= 1) { const named = tiersFromText(text); if (named.length > tiers.length) tiers = named; }

  if (!title || !when) return null;
  if (source === 'AllEvents' && !EVENT_SIGNAL.test(`${title} ${description}`)) return null; // posts that aren't events
  if (NOT_EVENT.test(title)) return null;
  if (lat != null && lng != null && !cityFromGeo(lat, lng)) return null; // pinned outside Ghana
  const geoCity = cityFromGeo(lat, lng);
  const named = detectCity(venue, address, title) ?? detectCity(description);
  const ldCountry = String(ld?.location?.address?.addressCountry ?? '').toLowerCase();
  const saysGhana = !!ego || ldCountry === 'gh' || ldCountry === 'ghana' || /,\s*ghana\b/i.test(`${venue} ${address ?? ''}`);
  // Only trust the event's own place fields (site menus mention Ghanaian cities on every page)
  const place = geoCity ? { city: geoCity, area: named?.city === geoCity ? named.area : null } : named ?? (saysGhana ? { city: 'accra', area: null } : null);
  if (!place) return null; // not in Ghana
  if (image && /dyn-image\.allevents|generate-image/i.test(image)) image = ogImage && !/dyn-image|generate-image/i.test(ogImage) ? ogImage : null;

  return {
    title: title.slice(0, 140),
    description: description.slice(0, 1500),
    date: when.date,
    time: when.time,
    venue: venue || 'Venue to be announced',
    area: place.area,
    address,
    city: place.city,
    lat, lng,
    image,
    category: guessCategory(`${title} ${description}`),
    tiers,
    ticketUrl: url,
    ticketSource: source,
    sourceUrl: url,
  };
}

/* ── Saving ───────────────────────────────────────────────────────────── */

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function dayLabel(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
function slugify(t: string) {
  return `${t.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60)}-${Math.random().toString(36).slice(2, 7)}`;
}

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { fetch: (i, o) => fetch(i, { ...o, cache: 'no-store' }) },
    auth: { persistSession: false },
  });
}

/* ── Run ──────────────────────────────────────────────────────────────── */

export type ImportReport = {
  dryRun: boolean;
  sources: { name: string; found: number; errors: string[] }[];
  added: { title: string; date: string; source: string; tiers: number }[];
  duplicates: number;
  skipped: { url: string; reason: string }[];
  preview?: ImportDraft[];
};

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}

export async function runImport(opts: { dryRun?: boolean; max?: number; only?: string; deadlineMs?: number } = {}): Promise<ImportReport> {
  const secret = process.env.INGEST_SECRET || '';
  const started = Date.now();
  const deadline = opts.deadlineMs ?? 50_000;
  const report: ImportReport = { dryRun: !!opts.dryRun, sources: [], added: [], duplicates: 0, skipped: [], preview: opts.dryRun ? [] : undefined };

  // 1. Event links from every listing page
  const candidates: { url: string; source: string }[] = [];
  const sources = SOURCES.filter((s) => !opts.only || s.name.toLowerCase() === opts.only.toLowerCase());
  await Promise.all(sources.map(async (s) => {
    const errors: string[] = [];
    const found = new Set<string>();
    await Promise.all(s.lists.map(async (l) => {
      try { extractLinks(await fetchHtml(l), l, s).forEach((u) => found.add(u)); } catch (e: any) { errors.push(`${l}: ${e?.message ?? 'failed'}`); }
    }));
    report.sources.push({ name: s.name, found: found.size, errors });
    found.forEach((url) => candidates.push({ url, source: s.name }));
  }));

  // 2. Skip pages we already have
  const client = db();
  let fresh = candidates;
  if (candidates.length && secret) {
    const { data, error } = await client.rpc('ingest_known_urls', { p_secret: secret, p_urls: candidates.map((c) => c.url) });
    if (error) throw new Error(`ingest_known_urls: ${error.message}`);
    const known = new Set<string>(data ?? []);
    report.duplicates += candidates.length - candidates.filter((c) => !known.has(c.url)).length;
    fresh = candidates.filter((c) => !known.has(c.url));
  }
  // Take turns between sites so one big listing doesn't use up the whole run
  const bySource = new Map<string, typeof fresh>();
  fresh.forEach((c) => bySource.set(c.source, [...(bySource.get(c.source) ?? []), c]));
  const mixed: typeof fresh = [];
  for (let k = 0; mixed.length < fresh.length; k++) bySource.forEach((list) => { if (list[k]) mixed.push(list[k]); });
  fresh = mixed.slice(0, opts.max ?? 40);

  // 3. Read each new page and queue it for review
  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + 240 * 86400000).toISOString().slice(0, 10);
  await pool(fresh, 6, async ({ url, source }) => {
    if (Date.now() - started > deadline) { report.skipped.push({ url, reason: 'out of time, next run' }); return; }
    let draft: ImportDraft | null = null;
    try { draft = parseEventPage(url, await fetchHtml(url), source); } catch (e: any) { report.skipped.push({ url, reason: e?.message ?? 'fetch failed' }); return; }
    if (!draft) { report.skipped.push({ url, reason: 'no title/date or not in Ghana' }); return; }
    if (draft.date < today || draft.date > horizon) { report.skipped.push({ url, reason: `date ${draft.date} out of range` }); return; }
    if (opts.dryRun) { report.preview!.push(draft); return; }

    const { data, error } = await client.rpc('ingest_import_event', {
      p_secret: secret,
      p_event: {
        title: draft.title, slug: slugify(draft.title), description: draft.description, category: draft.category,
        city: draft.city, region: draft.city === 'kumasi' ? 'Ashanti' : draft.city === 'accra' ? 'Greater Accra' : null,
        venue: draft.venue, area: draft.area, address: draft.address, lat: draft.lat ?? '', lng: draft.lng ?? '',
        date: draft.date, date_label: dayLabel(draft.date), time: draft.time, image_url: draft.image,
        ticket_url: draft.ticketUrl, ticket_source: draft.ticketSource, source_url: draft.sourceUrl,
      },
      p_tiers: draft.tiers,
    });
    if (error) { report.skipped.push({ url, reason: error.message }); return; }
    if (data?.duplicate) report.duplicates++;
    else report.added.push({ title: draft.title, date: draft.date, source, tiers: draft.tiers.length });
  });

  return report;
}
