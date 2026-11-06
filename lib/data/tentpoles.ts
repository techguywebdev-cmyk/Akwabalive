/**
 * The season's tentpoles: the shows everyone plans their December around. Curated by hand
 * (like the "updated events list" posts people share), so the list is right even before
 * organisers list them. When a matching event is published on Akwaaba it links up on its own.
 */
export type Tentpole = {
  /** First day, YYYY-MM-DD. Null when the date isn't announced yet */
  date: string | null;
  /** Last day for multi-day shows */
  end?: string;
  title: string;
  /** Who it's by, when the title doesn't say */
  by?: string;
  /** Venue when announced */
  venue?: string;
  /** Finds the listed event: title pattern, checked within a day of the date */
  match: RegExp;
  /** Short code or site to buy, when announced */
  tickets?: string;
};

export const TENTPOLES: Tentpole[] = [
  { date: '2026-11-14', title: 'Tidal Rave', venue: 'La Palm Royal Beach Hotel', match: /tidal\s*rave/i },
  { date: '2026-11-20', title: 'The O’Live Experience', by: 'Olivetheboy', venue: 'National Theatre', match: /o['’]?\s*live\s*experience|olivetheboy/i },
  { date: '2026-11-21', title: 'Shay Concert', match: /\bshay\b/i },
  { date: '2026-12-04', title: 'Crazy World', by: 'KiDi', venue: 'Ghud Park, Accra Mall', match: /crazy\s*world/i, tickets: '*714*567#' },
  { date: '2026-12-11', title: 'Higher Grounds', by: 'Essumann', venue: 'Untamed Empire', match: /essum+an/i },
  { date: '2026-12-17', title: 'BYK Concert', by: 'Spaceship Edition', venue: 'Untamed Empire', match: /\bbyk\b/i },
  { date: '2026-12-18', title: 'Revival', by: 'Kweku Smoke', match: /revival.*(kweku|smoke)|kweku\s*smoke.*revival/i },
  { date: '2026-12-19', title: 'Asakaa Rave', venue: 'Untamed Empire', match: /asakaa\s*rave/i, tickets: '*800*300#' },
  { date: '2026-12-21', title: 'Zaama Disco', by: 'Black Sherif', venue: 'Legon Sports Stadium', match: /zaama\s*disco/i },
  { date: '2026-12-24', title: 'BHIM Concert', by: 'Stonebwoy', venue: 'Legon Stadium', match: /\bbhim\b/i },
  { date: '2026-12-25', title: 'Rapperholic', by: 'Sarkodie', match: /rapperholic/i },
  { date: '2026-12-26', end: '2026-12-27', title: 'Detty Rave', by: 'Mr Eazi', match: /detty\s*rave/i },
  { date: '2026-12-28', title: 'Victony Live', by: 'Victony', match: /victony/i },
  { date: '2026-12-28', end: '2026-12-29', title: 'AfroFuture', match: /^(?!.*tour).*afro\s*future/i },
  { date: '2026-12-30', title: '5 Star Show', by: 'King Promise', match: /5\s*star|five\s*star|king\s*promise/i },
  { date: null, title: 'Kwesi Arthur Concert', by: 'Kwesi Arthur', match: /kwesi\s*arthur/i },
];

const DAY = 86400000;
const near = (a: string, b: string, end?: string) => {
  const t = Date.parse(`${a}T12:00:00Z`);
  return t >= Date.parse(`${b}T12:00:00Z`) - DAY && t <= Date.parse(`${end ?? b}T12:00:00Z`) + DAY;
};

/** Pairs each tentpole with its listed event, when there is one */
export function linkTentpoles<E extends { title: string; date: string }>(events: E[]) {
  return TENTPOLES.map((t) => ({
    ...t,
    event: events.find((e) => t.match.test(e.title) && (t.date ? near(e.date, t.date, t.end) : true)) ?? null,
  }));
}
