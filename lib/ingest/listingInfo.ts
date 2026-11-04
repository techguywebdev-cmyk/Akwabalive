/**
 * The practical lines on a ticket-site event page (dial codes, organiser phones and handles, dress code, age, doors…),
 * kept as plain text so the event page's Info & contact can read them. The ticket site's own support lines are left out.
 */

/** Ticket platforms' own support contacts: not the organiser's */
const PLATFORM = /ayatickets|egotickets|allevents|eventbrite|veetickets|tixafrica|0559416230|559416230|0559051324|559051324|support@/i;

const INFO = /\*\d{2,4}(?:\s?\*\s?\d{1,6})*\s?#|(?:\+?233|\b0)[\s.-]?\d{2}[\s.-]?\d{3}[\s.-]?\d{3,4}|@[a-z0-9_.]{3,30}|instagram\.com\/|dress\s*code|\b(18|21)\s*\+|years and above|doors?\s*open|at the gate|gate\s*(fee|price)|whats\s?app|call\b|reservation|bring\s+(your|a|some)|swim/i;

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

/** The event's own description from the page (JSON-LD or meta), not the "more events" around it */
function ownText(html: string): string {
  const parts: string[] = [];
  for (const m of Array.from(html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))) {
    try {
      const walk = (n: any): void => {
        if (!n || typeof n !== 'object') return;
        if (Array.isArray(n)) { n.forEach(walk); return; }
        if (/Event/.test(String(n['@type'] ?? '')) && typeof n.description === 'string') parts.push(n.description);
        if (n['@graph']) walk(n['@graph']);
      };
      walk(JSON.parse(m[1].trim()));
    } catch { /* ignore */ }
    if (parts.length) break; // the first event on the page is this one
  }
  const meta = html.match(/<meta[^>]+(?:property|name)=["'](?:og:)?description["'][^>]*content=["']([^"']*)["']/i)?.[1];
  if (!parts.length && meta) parts.push(meta);
  return decode(parts.join('\n').replace(/<br\s*\/?>|<\/p>/gi, '\n').replace(/<[^>]+>/g, ' '));
}

export function listingInfo(html: string, opts: { pageLinks?: boolean } = {}): string {
  const lines = ownText(html).split(/\n|(?<=[.!?])\s+/).map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l.length > 3 && l.length < 400);
  const keep = Array.from(new Set(lines.filter((l) => INFO.test(l) && !PLATFORM.test(l))));
  // Aya Tickets: every event has its own dial code (*365*88*N#), shown once near the buy button
  const dial = Array.from(new Set(Array.from(html.matchAll(/\*365\*88\*\d{1,6}#/g)).map((m) => m[0])))[0];
  // Organiser links on single-event pages (Aya), not the platform's
  const links: string[] = [];
  if (opts.pageLinks) for (const m of Array.from(html.matchAll(/href=["']([^"']+)["']/gi))) {
    const u = decode(m[1]);
    const ig = u.match(/instagram\.com\/([a-z0-9_.]{3,30})\/?(?:\?|$)/i);
    if (ig && !PLATFORM.test(u) && !/^(p|reel|explore|accounts)$/i.test(ig[1])) links.push(`@${ig[1].toLowerCase()}`);
    const mail = u.match(/^mailto:([^?]+)/i);
    if (mail && !PLATFORM.test(mail[1])) links.push(mail[1]);
  }
  const out = [dial ? `Tickets: dial ${dial}` : '', ...keep, ...Array.from(new Set(links))].filter(Boolean).join('\n');
  return out.slice(0, 1500);
}
