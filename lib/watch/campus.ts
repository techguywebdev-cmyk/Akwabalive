import type { SupabaseClient } from '@supabase/supabase-js';
import { PRESS_FEEDS } from './sources';
import { CAMPUS_RE, campusOf } from '@/lib/events/campus';

/** Where campus nights get announced: the Ghana press, campus radio, and a Google News search for the usual words */
const CAMPUS_FEEDS = [
  ...PRESS_FEEDS,
  { name: 'Radio Univers', url: 'https://univers.ug.edu.gh/feed/' },
  { name: 'Ameyaw Debrah', url: 'https://ameyawdebrah.com/feed/' },
  { name: 'News Ghana', url: 'https://www.newsghana.com.gh/category/entertainment/feed/' },
  {
    name: 'Google News',
    url: `https://news.google.com/rss/search?q=${encodeURIComponent('("SRC week" OR "hall week" OR "artiste night" OR "artistes night" OR "freshers night" OR "akwaaba night" OR "students week" OR "WatsUp On Campus" OR "campus tour") Ghana when:14d')}&hl=en-GH&gl=GH&ceid=GH:en`,
  },
];

/** A story about a night still to come, not a recap */
const AHEAD = /\b(set to|will|to (host|headline|perform|storm|shut down|light up|thrill)|gears? up|upcoming|launch(es|ed)?|announce[sd]?|unveil(s|ed)?|line ?up|tickets?|this (friday|saturday|sunday|weekend)|tonight|tomorrow|countdown|date)\b/i;

const strip = (h: string) => h.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;/g, '’').replace(/&quot;/g, '"').replace(/&#039;|&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

async function get(url: string, ms = 9000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: 'no-store', headers: { 'user-agent': 'Mozilla/5.0 (compatible; AkwaabaBot/1.0; +https://akwabalive.vercel.app)' } });
    return r.ok ? await r.text() : null;
  } catch { return null; } finally { clearTimeout(t); }
}

/** Reads the feeds for campus nights and saves new stories as leads for review. Returns what it found. */
export async function scanCampus(db: SupabaseClient) {
  const items = (await Promise.all(CAMPUS_FEEDS.map(async (f) => {
    const xml = await get(f.url);
    if (!xml) return [];
    return Array.from(xml.matchAll(/<item[\s\S]*?<\/item>/gi)).slice(0, 80).map((m) => {
      const pick = (tag: string) => strip((m[0].match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')) ?? [])[1] ?? '');
      const published = Date.parse(pick('pubDate'));
      return { title: pick('title'), text: `${pick('title')} ${pick('description')}`, link: pick('link'), source: pick('source') || f.name, published };
    });
  }))).flat();

  const fresh = items.filter((i) => i.link && i.title && CAMPUS_RE.test(i.text) && AHEAD.test(i.title)
    && (!i.published || Date.now() - i.published < 21 * 86400000));
  // One lead per story title (the same story comes through several feeds)
  const seen = new Set<string>();
  const leads = fresh.filter((i) => { const k = i.title.toLowerCase().replace(/\W+/g, ' ').trim(); if (seen.has(k)) return false; seen.add(k); return true; })
    .map((i) => ({ kind: 'campus', title: i.title.slice(0, 300), link: i.link, source: i.source, school: campusOf({ title: i.text }) }));

  let added = 0;
  if (leads.length) {
    const { data } = await db.from('event_leads').upsert(leads, { onConflict: 'link', ignoreDuplicates: true }).select('id');
    added = data?.length ?? 0;
  }
  return { read: items.length, campus: leads.length, added };
}
