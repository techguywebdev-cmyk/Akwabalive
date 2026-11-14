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
const has = (e: CurateEvent, re: RegExp) => re.test(text(e));
const named = (e: CurateEvent, re: RegExp) => re.test(name(e));
const CLUBBY = /\b(club|lounge|bar|pub|rooftop|enzo)\b/;
const isBrunch = (e: CurateEvent) => named(e, /\bbrunch\b|day party|block party|house party|fufu day/);
const isWork = (e: CurateEvent) => ['business', 'tech'].includes(e.category ?? '') || named(e, /\b(networking|expo|summit|training|information session|launch|conference|workshop|awards)\b/);
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
  // Proper club nights: late starts at clubs, lounges and rooftops, or parties and raves that run into the night
  'akwaaba-club-nights': (e) => {
    if (isFaith(e) || isPool(e) || isBrunch(e) || isWork(e)) return false;
    const h = startHour(e.time);
    const clubby = named(e, CLUBBY) || named(e, /\b(party|rave|night|dj)\b/) || e.category === 'nightlife';
    return clubby && (h == null ? named(e, CLUBBY) : h >= 20 || h < 6);
  },
  // Easy days and soft evenings: brunches, sip and paint, rooftops, acoustic sets, poetry, open-air cinema, resets
  'akwaaba-vibes-and-chill': (e) => {
    if (isFaith(e) || isWork(e)) return false;
    const h = startHour(e.time);
    return (h == null || (h >= 9 && h < 22)) && !named(e, /\b(party|rave|dj)\b|all[- ]?(black|white)/)
      && has(e, /\bbrunch\b|rooftop|sip and|sip &|paint|canvas|tie and dye|pottery|\bwine\b|\bchill\b|acoustic|unplugged|\bjazz\b|poetry|spoken word|open mic|cinema|retreat|the reset|wellness|picnic|sunset|golden hour|book club|karaoke|game night|classical|coffee/);
  },
  'akwaaba-brunch-and-day-parties': (e) => {
    if (isFaith(e) || isWork(e)) return false;
    const h = startHour(e.time);
    return isBrunch(e) || (e.category === 'nightlife' && h != null && h >= 10 && h < 17);
  },
  'akwaaba-all-white-all-black': (e) => !isFaith(e) && has(e, /all[- ]?(white|black)|black affair|blackout|glow in the dark|neon party|dress code/),
  'akwaaba-amapiano-and-house': (e) => !isFaith(e) && has(e, /amapiano|afro[- ]?house|house music|house festival|\bgqom\b|afrotech|3 step|\bibiza\b/),
  'akwaaba-live-bands-and-highlife': (e) => !isFaith(e) && has(e, /highlife|unplugged|acoustic|live band|orchestra|symphony|classical|\bjazz\b|strings project/),
  'akwaaba-art-theatre-and-film': (e) => !isFaith(e) && !isWork(e)
    && (e.category === 'art' || has(e, /theatre|stage play|original play|drama company|cinema|screening|\bfilm\b|poetry|spoken word|exhibition|museum|paint|pottery|dance company/)),
  'akwaaba-beach-days': (e) => !isFaith(e) && !isWork(e) && named(e, /\bbeach\b|kokrobite|bojo|labadi|\bocean\b|seaside|lakeside|lakeview/),
  'akwaaba-new-years-eve-and-day': (e) => inSeason(e, '12-31', '01-02') && !isFaith(e) && ['nightlife', 'concert', 'festival', 'party'].includes(e.category ?? ''),
};
