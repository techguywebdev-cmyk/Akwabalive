export type ParsedDraft = {
  sourceUrl: string;
  source: string;
  title: string;
  description: string;
  imageUrl: string;
  date: string;
  dateLabel: string;
  time: string;
  city: string;
  venue: string;
  ticketUrl: string;
  ticketSource: string;
  category: string;
  confidence: number;
  notes: string[];
};

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

const CITIES: { key: string; city: string; venueHint?: string }[] = [
  { key: 'melbourne', city: 'melbourne', venueHint: 'Prince Bandroom' },
  { key: 'sydney', city: 'sydney', venueHint: 'Metro Theatre' },
  { key: 'london', city: 'london' },
  { key: 'accra', city: 'accra' },
  { key: 'kumasi', city: 'kumasi' },
  { key: 'cape coast', city: 'cape-coast' },
  { key: 'tamale', city: 'tamale' },
  { key: 'takoradi', city: 'takoradi' },
  { key: 'australia', city: 'melbourne' },
];

function decode(s: string) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function meta(html: string, key: string) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${key}["']`, 'i'),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return decode(m[1]);
  }
  return '';
}

function detectSource(url: string) {
  const u = url.toLowerCase();
  if (u.includes('instagram.com')) return 'Instagram';
  if (u.includes('x.com') || u.includes('twitter.com')) return 'X';
  if (u.includes('eventbrite')) return 'Eventbrite';
  if (u.includes('ticketmaster')) return 'Ticketmaster';
  if (u.includes('dice.fm')) return 'Dice';
  if (u.includes('linktr.ee') || u.includes('beacons.ai')) return 'Link in bio';
  return 'Official site';
}

function parseDates(text: string): { date: string; dateLabel: string } {
  const year = 2026;
  const t = text.replace(/(\d+)(st|nd|rd|th)/gi, '$1');

  // 9th x 10th October / 9 x 10 October
  const range = t.match(
    /(\d{1,2})\s*(?:x|&|and|-|–|to)\s*(\d{1,2})\s*(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)/i,
  );
  if (range) {
    const m = MONTHS[range[3].toLowerCase()];
    const d1 = range[1].padStart(2, '0');
    const iso = `\( {year}- \){String(m).padStart(2, '0')}-${d1}`;
    const label = `\( {range[1]}– \){range[2]} \( {range[3][0].toUpperCase()} \){range[3].slice(1, 3)} ${year}`;
    return { date: iso, dateLabel: label };
  }

  const one = t.match(
    /(\d{1,2})\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)(?:\s+(\d{4}))?/i,
  );
  if (one) {
    const y = one[3] || String(year);
    const m = MONTHS[one[2].toLowerCase()];
    const iso = `\( {y}- \){String(m).padStart(2, '0')}-${one[1].padStart(2, '0')}`;
    const label = `${one[1]} \( {one[2][0].toUpperCase()} \){one[2].slice(1, 3)} ${y}`;
    return { date: iso, dateLabel: label };
  }

  return { date: '', dateLabel: '' };
}

function parseCityVenue(text: string) {
  const lower = text.toLowerCase();
  for (const c of CITIES) {
    if (lower.includes(c.key)) {
      return { city: c.city, venue: c.venueHint ?? '' };
    }
  }
  return { city: 'international', venue: '' };
}

/** Instagram often hides og:image from bots — media redirect returns the flyer. */
function instagramFlyerUrl(url: string): string {
  const m = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i);
  if (!m?.[1]) return '';
  return `https://www.instagram.com/p/${m[1]}/media/?size=l`;
}

export async function parseEventLink(url: string): Promise<ParsedDraft> {
  const notes: string[] = [];
  let html = '';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; AkwaabaBot/1.0; +https://akwabalive.vercel.app)',
        Accept: 'text/html',
      },
      redirect: 'follow',
    });
    html = await res.text();
  } catch {
    notes.push('Could not fetch the page. Fill the fields from the post.');
  }

  const ogTitle = meta(html, 'og:title') || meta(html, 'twitter:title');
  const ogDesc = meta(html, 'og:description') || meta(html, 'twitter:description');
  let ogImage =
    meta(html, 'og:image') ||
    meta(html, 'og:image:url') ||
    meta(html, 'twitter:image') ||
    meta(html, 'twitter:image:src');

  // Instagram: pull flyer via media endpoint when og:image is missing
  if (!ogImage && /instagram\.com\/(p|reel|tv)\//i.test(url)) {
    ogImage = instagramFlyerUrl(url);
    if (ogImage) {
      notes.push('Flyer taken from Instagram media — confirm it looks right.');
    }
  } else if (!ogImage && /instagram\.com/i.test(url)) {
    notes.push('No flyer image found — paste an image URL if you have one.');
  }

  const blob = `${ogTitle} ${ogDesc}`;

  const { date, dateLabel } = parseDates(blob);
  const { city, venue } = parseCityVenue(blob);
  const source = detectSource(url);

  let title = ogTitle
    .replace(/\s+on Instagram.*$/i, '')
    .replace(/^.* on Instagram:\s*/i, '');
  title = title.replace(/^["“]|["”]$/g, '').slice(0, 120);
  if (!title) title = 'Untitled event';

  let confidence = 0.35;
  if (date) confidence += 0.25;
  if (city && city !== 'international') confidence += 0.15;
  if (ogImage) confidence += 0.1;
  if (ogDesc.toLowerCase().includes('ticket')) confidence += 0.1;

  if (!date) notes.push('Date not found — add it before publishing.');
  if (!venue) notes.push('Venue not in the caption — add from bio or news.');
  if (ogDesc.toLowerCase().includes('bio')) {
    notes.push('Tickets are “in bio”. Paste the real ticket URL below.');
  }

  return {
    sourceUrl: url,
    source,
    title,
    description: ogDesc.slice(0, 600),
    imageUrl: ogImage,
    date,
    dateLabel,
    time: '20:00',
    city,
    venue,
    ticketUrl: url,
    ticketSource: source,
    category: 'concert',
    confidence: Math.min(0.95, confidence),
    notes,
  };
}
