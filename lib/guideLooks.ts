/**
 * How each guide page looks and what it says about its place: a colour, a mood, a line, and for cities
 * a short "about" with what the place is known for. `photo` is an optional header photo (a path under
 * /public or a full URL) laid behind the heading when we have one we're allowed to use.
 */
export type GuideLook = {
  accent: string;
  /** Second colour in the header's light */
  glow: string;
  /** Texture drawn in the header */
  motif: 'waves' | 'sun' | 'weave' | 'lights';
  /** Small line above the heading */
  eyebrow: string;
  tagline: string;
  about?: { title: string; text: string; knownFor: string[] };
  photo?: string;
  photoCredit?: string;
};

const ACCRA_ABOUT = {
  title: 'About Accra',
  text: 'Ghana’s capital runs late. Osu and East Legon carry the bars and clubs, Labadi and La keep the beach parties going, and December brings the whole diaspora home for weeks of back-to-back shows.',
  knownFor: ['Detty December', 'Osu nightlife', 'Labadi Beach', 'Black Star Square', 'Chale Wote in Jamestown', 'East Legon'],
};

export const LOOKS: Record<string, GuideLook> = {
  'events-in-cape-coast': {
    accent: '#5FD4DC', glow: '#F2C078', motif: 'waves', eyebrow: 'Central Region · Ghana', tagline: 'Castle walls, canoes and Atlantic nights.',
    about: {
      title: 'About Cape Coast',
      text: 'An old fishing and trading city on the Atlantic, once the colonial capital, now a university town with a busy festival calendar. Days are for the castle and the forest; nights are for beach bars, campus shows and street carnivals.',
      knownFor: ['Cape Coast Castle', 'Oguaa Fetu Afahye in September', 'Kakum canopy walk', 'University of Cape Coast', 'Elmina, 15 minutes away', 'Beach bars'],
    },
  },
  'events-in-accra': { accent: '#7BE3A8', glow: '#F5C451', motif: 'lights', eyebrow: 'Greater Accra · Ghana', tagline: 'The capital never really sleeps.', about: ACCRA_ABOUT },
  'things-to-do-in-accra': { accent: '#F5C451', glow: '#7BE3A8', motif: 'sun', eyebrow: 'Greater Accra · This month', tagline: 'Shows, food, art and long nights out.', about: ACCRA_ABOUT },
  'parties-in-accra': { accent: '#FF6FA3', glow: '#B57BFF', motif: 'lights', eyebrow: 'Greater Accra · Nightlife', tagline: 'Raves, club nights and day parties.', about: ACCRA_ABOUT },
  'pool-parties-in-accra': { accent: '#5AC8FA', glow: '#7BE3A8', motif: 'waves', eyebrow: 'Accra · By the pool', tagline: 'Day raves with your feet in the water.' },
  'events-in-kumasi': {
    accent: '#F5C451', glow: '#E0563B', motif: 'weave', eyebrow: 'Ashanti Region · Ghana', tagline: 'The Garden City, home of Asakaa.',
    about: {
      title: 'About Kumasi',
      text: 'The Ashanti capital mixes royal tradition with the loudest young music scene in the country. Asakaa drill started here, highlife never left, and big shows fill the stadium and the campus grounds.',
      knownFor: ['Asakaa drill', 'Manhyia Palace', 'Akwasidae', 'Kejetia Market', 'Baba Yara Stadium', 'KNUST campus shows'],
    },
  },
  'events-in-takoradi': {
    accent: '#FF9A5A', glow: '#5FD4DC', motif: 'waves', eyebrow: 'Western Region · Ghana', tagline: 'The Oil City, by the sea.',
    about: {
      title: 'About Takoradi',
      text: 'Sekondi-Takoradi is the Western Region’s twin city: a port town with beaches on its doorstep and a Christmas season built around the Ankos masquerade carnival.',
      knownFor: ['Ankos masquerade festival', 'Market Circle', 'Beach parties', 'Busua, an hour away', 'Christmas carnival season'],
    },
  },
  'events-in-tamale': {
    accent: '#F0A35E', glow: '#E7D08A', motif: 'sun', eyebrow: 'Northern Region · Ghana', tagline: 'The north’s capital of rhythm.',
    about: {
      title: 'About Tamale',
      text: 'The biggest city in the north has its own sound and its own calendar: Damba season, stadium concerts and a fast-growing run of homegrown shows.',
      knownFor: ['Damba festival', 'Aliu Mahama Sports Stadium', 'Smock weaving', 'Gateway to Mole National Park'],
    },
  },
  'events-in-ghana-today': { accent: '#7BE3A8', glow: '#5FD4DC', motif: 'lights', eyebrow: 'Ghana · Tonight', tagline: 'Where everyone’s going today.' },
  'events-in-ghana-this-weekend': { accent: '#B58CFF', glow: '#FF6FA3', motif: 'lights', eyebrow: 'Ghana · Friday to Sunday', tagline: 'Your weekend, sorted.' },
  'free-events-in-ghana': { accent: '#8FEBB7', glow: '#F5C451', motif: 'sun', eyebrow: 'Ghana · Free entry', tagline: 'Good nights that cost nothing.' },
  'upcoming-events-in-ghana': { accent: '#7BE3A8', glow: '#B58CFF', motif: 'lights', eyebrow: 'Ghana · What’s next', tagline: 'Every show, as soon as it’s announced.' },
  'festivals-in-ghana': { accent: '#F5C451', glow: '#FF7A59', motif: 'sun', eyebrow: 'Ghana · Festivals', tagline: 'Beach raves, culture days and December nights.' },
  'concerts-in-ghana': { accent: '#FF7A59', glow: '#F5C451', motif: 'lights', eyebrow: 'Ghana · Live music', tagline: 'Headliners, stages and who’s on them.' },
};

export const lookFor = (slug: string): GuideLook => LOOKS[slug] ?? { accent: '#7BE3A8', glow: '#F5C451', motif: 'lights', eyebrow: 'Ghana', tagline: '' };
