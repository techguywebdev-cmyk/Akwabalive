/**
 * TsaCoal's own starter calendars, and the rule each one keeps to.
 * A daily job adds every upcoming event that fits and takes off upcoming ones that don't, so a pool-party
 * calendar only ever has pool parties and a night-out calendar never picks up a church service.
 */
export type CurateEvent = {
  slug: string; title: string; date: string; time: string | null; venue: string | null; area: string | null;
  city: string | null; category: string | null; description: string | null; is_hot: boolean | null; artist_slugs: string[] | null;
};

const text = (e: CurateEvent) => `${e.title} ${e.venue ?? ''} ${e.description ?? ''}`.toLowerCase();
const name = (e: CurateEvent) => `${e.title} ${e.venue ?? ''}`.toLowerCase();
const md = (e: CurateEvent) => e.date.slice(5, 10); // "12-24"
/** Hour the night starts (24h), or null when the time isn't known */
export function startHour(t: string | null): number | null {
  const m = t?.toLowerCase().match(/(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?/);
  if (!m || /tba|tbc/.test(t!.toLowerCase())) return null;
  let h = Number(m[1]) % 24;
  if (m[3] === 'pm' && h < 12) h += 12;
  if (m[3] === 'am' && h === 12) h = 0;
  return h;
}
const inSeason = (e: CurateEvent, from: string, to: string) => {
  const d = md(e);
  return from <= to ? d >= from && d <= to : d >= from || d <= to; // wraps over New Year
};
const isFaith = (e: CurateEvent) => e.category === 'faith' || /\b(worship|gospel|praise|church|prayer|crusade|convocation|ministry|sermon|revival service)\b/.test(text(e));
const isPool = (e: CurateEvent) => /\bpool(side)?\b|pool party|\bsplash\b|\bswim/.test(name(e));
const isNight = (e: CurateEvent) => { const h = startHour(e.time); return h == null ? ['nightlife', 'concert'].includes(e.category ?? '') : h >= 17 || h < 5; };

export const CURATED_RULES: Record<string, (e: CurateEvent) => boolean> = {
  'akwaaba-pool-parties-day-raves': (e) => isPool(e) && !isFaith(e),
  'akwaaba-detty-december-essentials': (e) =>
    inSeason(e, '12-01', '01-05') && ['concert', 'festival', 'nightlife'].includes(e.category ?? '') && !isFaith(e)
    && (!!e.is_hot || (e.artist_slugs?.length ?? 0) > 0),
  'akwaaba-gospel-december': (e) => inSeason(e, '12-01', '12-31') && isFaith(e),
  'akwaaba-christmas-with-the-kids': (e) =>
    inSeason(e, '12-01', '01-05') && /\b(kids?|children|child|family|families|christmas village|funfair|fun fair|santa)\b/.test(name(e)) && !isFaith(e),
  'akwaaba-kumasi-nights': (e) => (e.city ?? '').toLowerCase() === 'kumasi' && isNight(e) && !isFaith(e) && !isPool(e),
  'akwaaba-new-years-eve-and-day': (e) => inSeason(e, '12-31', '01-02') && !isFaith(e) && ['nightlife', 'concert', 'festival', 'party'].includes(e.category ?? ''),
};
