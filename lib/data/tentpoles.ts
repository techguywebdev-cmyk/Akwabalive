/**
 * The season's big nights. Our own picks: each confirmed show is checked against the organiser,
 * press or a ticket page (see `source`), and links to its listing once it's on Tsacoal.
 * Shows people expect but nobody has confirmed yet stay in `EXPECTED`, without dates.
 */
export type Tentpole = {
  /** First day, YYYY-MM-DD */
  date: string;
  /** Last day for multi-day shows */
  end?: string;
  title: string;
  /** Artist slug, for the photo until the flyer is listed */
  artist?: string;
  /** One line in our words: why it's a big night */
  blurb: string;
  venue?: string;
  /** Finds the listed event: title pattern, checked within a day of the date */
  match: RegExp;
  /** Short code or site to buy, when announced */
  tickets?: string;
  /** Where we confirmed it */
  source?: string;
};

export const TENTPOLES: Tentpole[] = [
  { date: '2026-11-14', title: 'Tidal Rave', blurb: 'The beach festival that opens the season, all day into the night', venue: 'La Palm Royal Beach Hotel', match: /tidal\s*rave/i },
  { date: '2026-11-20', title: 'The O’Live Experience', artist: 'olivetheboy', blurb: 'Olivetheboy’s own show, with a live band and guests', venue: 'National Theatre', match: /o['’]?\s*live\s*experience|olivetheboy/i, source: '3music.tv' },
  { date: '2026-11-21', title: 'Shay Concert', artist: 'wendy-shay', blurb: 'Wendy Shay’s own concert, The Boss on the throne', venue: 'West Hills Mall', match: /\bshay\s*concert|wendy\s*shay/i },
  { date: '2026-12-04', title: 'Crazy World', artist: 'kidi', blurb: 'KiDi’s first headline concert of his own', venue: 'Ghud Park, Accra Mall', match: /crazy\s*world/i, tickets: '*714*567#', source: 'myjoyonline.com' },
  { date: '2026-12-11', title: 'Higher Grounds', artist: 'essumann', blurb: 'Essumann headlines his own night', venue: 'Untamed Empire', match: /essum+an/i },
  { date: '2026-12-12', title: 'Gyakie Live', artist: 'gyakie', blurb: 'Gyakie’s first headline show since 2022', venue: 'Ghud Park, Accra Mall', match: /gyakie\s*live/i, source: '3news.com' },
  { date: '2026-12-17', title: 'BYK Concert', artist: 'medikal', blurb: 'Medikal’s Beyond Kontrol, the Spaceship Edition', venue: 'Untamed Empire', match: /\bbyk\b/i },
  { date: '2026-12-19', title: 'Asakaa Rave', blurb: 'Kumasi drill takes over Accra, from 2pm', venue: 'Untamed Empire', match: /asakaa\s*rave/i, tickets: '*800*300#', source: 'ghanaweb.com' },
  { date: '2026-12-21', title: 'Zaama Disco', artist: 'black-sherif', blurb: 'Black Sherif’s yearly party for the city', venue: 'Legon Sports Stadium', match: /zaama\s*disco/i, source: 'sparkglim.net' },
  { date: '2026-12-24', title: 'BHIM Concert', artist: 'stonebwoy', blurb: 'Stonebwoy’s Christmas Eve concert', venue: 'University of Ghana Stadium', match: /\bbhim\b/i },
];

/** Big shows people expect every December that haven't been confirmed by their organisers yet */
export const EXPECTED: { title: string; artist?: string; when: string; match: RegExp }[] = [
  { title: 'Rapperholic', artist: 'sarkodie', when: 'Usually Christmas', match: /rapperholic/i },
  { title: 'Revival', artist: 'kweku-smoke', when: 'Usually mid-December', match: /revival.*(kweku|smoke)|kweku\s*smoke.*revival/i },
  { title: 'Detty Rave', artist: 'mr-eazi', when: 'Usually after Christmas', match: /detty\s*rave/i },
  { title: 'AfroFuture', when: 'Usually 28–29 Dec', match: /^(?!.*tour).*afro\s*future/i },
  { title: '5 Star Show', artist: 'king-promise', when: 'End of December', match: /5\s*star|five\s*star/i },
  { title: 'Kwesi Arthur', artist: 'kwesi-arthur', when: 'Date to come', match: /kwesi\s*arthur/i },
];

const DAY = 86400000;
const near = (a: string, b: string, end?: string) => {
  const t = Date.parse(`${a}T12:00:00Z`);
  return t >= Date.parse(`${b}T12:00:00Z`) - DAY && t <= Date.parse(`${end ?? b}T12:00:00Z`) + DAY;
};

/** Pairs each tentpole with its listed event, when there is one */
export function linkTentpoles<E extends { title: string; date: string }>(events: E[]) {
  return TENTPOLES.map((t) => ({ ...t, event: events.find((e) => t.match.test(e.title) && near(e.date, t.date, t.end)) ?? null }));
}
