import type { SupabaseClient } from '@supabase/supabase-js';
import { PRESS_FEEDS, newsSearch } from './sources';
import { ACTS, actsIn, norm } from './acts';

type Item = { title: string; text: string; link: string; host: string; source: string };
type EventRow = { id: string; slug: string; title: string; lineup: string[] | null; artist_slugs: string[] | null; official_url: string | null; date: string };

const strip = (h: string) => h.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;/g, '’').replace(/&#8216;|&lsquo;/g, '‘').replace(/&quot;/g, '"').replace(/&#039;|&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

async function get(url: string, ms = 9000): Promise<string | null> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: 'no-store', headers: { 'user-agent': 'Mozilla/5.0 (compatible; AkwaabaBot/1.0; +https://tsacoal.com)', accept: 'text/html,application/rss+xml,application/xml;q=0.9,*/*;q=0.8' } });
    return r.ok ? await r.text() : null;
  } catch { return null; } finally { clearTimeout(t); }
}

function parseRss(xml: string, source: string): Item[] {
  return Array.from(xml.matchAll(/<item[\s\S]*?<\/item>/gi)).slice(0, 60).map((m) => {
    const it = m[0];
    const pick = (tag: string) => strip((it.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')) ?? [])[1] ?? '');
    const link = pick('link');
    // Google News names the outlet in <source>; use it so two stories from one outlet count once
    const outlet = pick('source') || source;
    return { title: pick('title'), text: `${pick('title')} ${pick('description')}`, link, host: outlet.toLowerCase(), source: outlet };
  });
}

/** Words that say someone is on the bill (not just mentioned) */
const BILLED = /\b(perform|performs|performing|performance|headline|headlines|headliner|headlining|takeover|line ?up|join|joins|joined|billed|set to|confirmed|bring|brings|stage|live at|rock|thrill|storm|grace|special guest)/i;
/** Acts named in a sentence that also says they're on the bill */
function billedIn(text: string) {
  const found = new Map<string, (typeof ACTS)[number]>();
  for (const sentence of text.split(/(?<=[.!?])\s+|\s+[|–—]\s+/)) {
    if (!BILLED.test(sentence)) continue;
    actsIn(sentence).forEach((a) => found.set(a.name, a));
  }
  return Array.from(found.values());
}

/** "Tidal Rave Festival 2026" → "tidal rave" — the words a headline would use */
function seriesName(title: string) {
  return norm(title.replace(/\b(19|20)\d{2}\b/g, '').replace(/\b(festival|concert|live|the|edition|annual)\b/gi, ' ').replace(/[|:–—-].*$/, ''));
}

export async function watchEvents(db: SupabaseClient, opts: { max?: number } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: evs } = await db.from('events').select('id, slug, title, lineup, artist_slugs, official_url, date')
    .eq('status', 'published').gte('date', today).order('is_hot', { ascending: false }).order('date', { ascending: true }).limit(opts.max ?? 60);
  const events = (evs ?? []) as EventRow[];

  // The press, once per run
  const press = (await Promise.all(PRESS_FEEDS.map(async (f) => { const x = await get(f.url); return x ? parseRss(x, f.name) : []; }))).flat();

  const report: { slug: string; applied: string[]; queued: string[] }[] = [];
  const one = async (ev: EventRow) => {
    const name = seriesName(ev.title);
    if (name.length < 5 || name.split(' ').length > 5) return; // too generic or too long to search for
    const have = new Set([...(ev.lineup ?? []).map(norm), ...(ev.artist_slugs ?? [])]);
    const isNew = (a: { name: string; slug?: string }) => !have.has(norm(a.name)) && !(a.slug && have.has(a.slug));

    // 1. The official website: trusted, applied straight away
    const official: string[] = [];
    if (ev.official_url) {
      const html = await get(ev.official_url);
      if (html) actsIn(strip(html)).filter(isNew).forEach((a) => official.push(a.name));
    }

    // 2. The press: Google News for this event + the Ghana feeds, stories that name the event
    const g = await get(newsSearch(name.replace(/\b\w/g, (c) => c.toUpperCase())));
    const stories = [...(g ? parseRss(g, 'Google News') : []), ...press].filter((s) => ` ${norm(s.text)} `.includes(` ${name} `));
    const votes = new Map<string, { act: (typeof ACTS)[number]; sources: { title: string; link: string; source: string }[]; outlets: Set<string> }>();
    for (const s of stories) {
      for (const a of billedIn(s.text).filter(isNew)) {
        const v = votes.get(a.name) ?? { act: a, sources: [], outlets: new Set<string>() };
        if (!v.outlets.has(s.host)) { v.outlets.add(s.host); v.sources.push({ title: s.title, link: s.link, source: s.source }); }
        votes.set(a.name, v);
      }
    }

    const applied: string[] = [], queued: string[] = [];
    const addToEvent = async (names: string[]) => {
      if (!names.length) return;
      const slugs = names.map((n) => ACTS.find((a) => a.name === n)?.slug).filter(Boolean) as string[];
      await db.from('events').update({
        lineup: Array.from(new Set([...(ev.lineup ?? []), ...names])),
        artist_slugs: Array.from(new Set([...(ev.artist_slugs ?? []), ...slugs])),
        updated_at: new Date().toISOString(),
      }).eq('id', ev.id);
      ev.lineup = Array.from(new Set([...(ev.lineup ?? []), ...names]));
    };

    // Apply when two different outlets say so, or the official site and one outlet agree. Anything else waits for review
    // (official sites often still list past line-ups, so a site on its own isn't enough).
    const sure = Array.from(votes.values()).filter((v) => v.outlets.size >= 2 || (v.outlets.size >= 1 && official.includes(v.act.name))).map((v) => v.act.name);
    for (const n of sure) {
      const v = votes.get(n);
      const sources = [...(official.includes(n) ? [{ title: 'Official website', link: ev.official_url, source: hostOf(ev.official_url ?? '') }] : []), ...(v?.sources ?? [])];
      const { error } = await db.from('event_updates').insert({ event_id: ev.id, value: n, sources, status: 'applied', decided_at: new Date().toISOString() });
      if (!error) applied.push(n);
    }
    await addToEvent(applied);
    const pending = new Map<string, { title: string; link: string | null; source: string }[]>();
    for (const v of Array.from(votes.values())) if (!sure.includes(v.act.name)) pending.set(v.act.name, v.sources);
    for (const n of official) if (!sure.includes(n)) pending.set(n, [{ title: 'Official website', link: ev.official_url, source: hostOf(ev.official_url ?? '') }, ...(pending.get(n) ?? [])]);
    for (const [n, sources] of Array.from(pending.entries())) {
      const { error } = await db.from('event_updates').insert({ event_id: ev.id, value: n, sources, status: 'pending' });
      if (!error) queued.push(n);
    }
    await db.from('events').update({ watched_at: new Date().toISOString() }).eq('id', ev.id);
    if (applied.length || queued.length) report.push({ slug: ev.slug, applied, queued });
  };
  // A few events at a time, so a run fits in a minute
  for (let i = 0; i < events.length; i += 6) await Promise.all(events.slice(i, i + 6).map(one));
  return { events: events.length, press: press.length, report };
}
