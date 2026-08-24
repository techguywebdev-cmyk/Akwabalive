import { ocrFlyerImage } from './ocrFlyer';

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

const CITIES: { key: string; city: string }[] = [
  { key: 'melbourne', city: 'melbourne' },
  { key: 'sydney', city: 'sydney' },
  { key: 'london', city: 'london' },
  { key: 'accra', city: 'accra' },
  { key: 'kumasi', city: 'kumasi' },
  { key: 'cape coast', city: 'cape-coast' },
  { key: 'tamale', city: 'tamale' },
  { key: 'takoradi', city: 'takoradi' },
  { key: 'oseikrom', city: 'kumasi' },
  { key: 'australia', city: 'melbourne' },
];

const VENUE_PATTERNS: { re: RegExp; venue: string; city?: string }[] = [
  { re: /baba\s*yara/i, venue: 'Baba Yara Sports Stadium', city: 'kumasi' },
  { re: /accra\s*sports?\s*stadium/i, venue: 'Accra Sports Stadium', city: 'accra' },
  { re: /independence\s*square/i, venue: 'Independence Square', city: 'accra' },
  { re: /national\s*theatre/i, venue: 'National Theatre', city: 'accra' },
  { re: /prince\s*bandroom/i, venue: 'Prince Bandroom', city: 'melbourne' },
  { re: /metro\s*theatre/i, venue: 'Metro Theatre', city: 'sydney' },
  { re: /o2\s*academy/i, venue: 'O2 Academy' },
  { re: /wembley/i, venue: 'Wembley' },
  { re: /sports?\s*stad(?:ium|uim)/i, venue: 'Sports Stadium' },
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
  const yearDefault = 2026;
  const t = text.replace(/(\d+)(st|nd|rd|th)/gi, '$1');

  const range = t.match(
    /(\d{1,2})\s*(?:x|&|and|-|–|to)\s*(\d{1,2})\s*(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)/i,
  );
  if (range) {
    const m = MONTHS[range[3].toLowerCase()];
    const d1 = range[1].padStart(2, '0');
    const iso = `\( {yearDefault}- \){String(m).padStart(2, '0')}-${d1}`;
    const label = `\( {range[1]}– \){range[2]} \( {range[3][0].toUpperCase()} \){range[3].slice(1, 3)} ${yearDefault}`;
    return { date: iso, dateLabel: label };
  }

  const one = t.match(
    /(\d{1,2})\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)(?:\s+(\d{4}))?/i,
  );
  if (one) {
    const y = one[3] || String(yearDefault);
    const m = MONTHS[one[2].toLowerCase()];
    const iso = `\( {y}- \){String(m).padStart(2, '0')}-${one[1].padStart(2, '0')}`;
    const label = `${one[1]} \( {one[2][0].toUpperCase()} \){one[2].slice(1, 3)} ${y}`;
    return { date: iso, dateLabel: label };
  }

  const flipped = t.match(
    /(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?/i,
  );
  if (flipped) {
    const y = flipped[3] || String(yearDefault);
    const m = MONTHS[flipped[1].toLowerCase()];
    const iso = `\( {y}- \){String(m).padStart(2, '0')}-${flipped[2].padStart(2, '0')}`;
    const label = `${flipped[2]} \( {flipped[1][0].toUpperCase()} \){flipped[1].slice(1, 3)} ${y}`;
    return { date: iso, dateLabel: label };
  }

  // SATURDAY OCTOBER 24 2026 style (OCR often splits lines)
  const flyer = t.match(
    /(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)[^\d]{0,12}(\d{1,2})[^\d]{0,8}(20\d{2})/i,
  );
  if (flyer) {
    const m = MONTHS[flyer[1].toLowerCase()];
    const iso = `\( {flyer[3]}- \){String(m).padStart(2, '0')}-${flyer[2].padStart(2, '0')}`;
    const label = `${flyer[2]} \( {flyer[1][0].toUpperCase()} \){flyer[1].slice(1, 3)} ${flyer[3]}`;
    return { date: iso, dateLabel: label };
  }

  return { date: '', dateLabel: '' };
}

function parseCity(text: string) {
  const lower = text.toLowerCase();
  for (const c of CITIES) {
    if (lower.includes(c.key)) return c.city;
  }
  if (/kumasi/i.test(text)) return 'kumasi';
  if (/accra/i.test(text)) return 'accra';
  return 'international';
}

function parseVenue(text: string): { venue: string; city?: string } {
  for (const v of VENUE_PATTERNS) {
    if (v.re.test(text)) return { venue: v.venue, city: v.city };
  }
  // OCR: "KUMASI BABA YARA SPORTS STADIUM"
  const stadium = text.match(
    /([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*){0,3}\s+(?:Sports?\s+)?Stad(?:ium|uim))/i,
  );
  if (stadium) return { venue: stadium[1].replace(/\s+/g, ' ').trim() };
  return { venue: '' };
}

function cleanTitle(raw: string, fallbackText: string) {
  let t = raw
    .replace(/\s+on (Instagram|X|Twitter).*$/i, '')
    .replace(/^.* on (Instagram|X|Twitter):\s*/i, '')
    .replace(/^["“]|["”]$/g, '')
    .trim();

  const eventish = fallbackText.match(
    /\b(rapperholic\s*\d*|detty\s*december|chale\s*wote|akwasidae|[A-Za-z0-9][\w\s]{1,40}\s+(live|concert|festival|tour|show))\b/i,
  );
  if (eventish) {
    t = eventish[0].replace(/\s+/g, ' ').trim();
    t = t.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // OCR big titles like RAPPERHOLIC26 / SARKODIE
  if ((!t || t.length < 8) && /rapperholic/i.test(fallbackText)) {
    const rh = fallbackText.match(/rapperholic\s*2?6?/i);
    if (rh) t = `Rapperholic ${rh[0].replace(/rapperholic/i, '').trim() || '26'}`.trim();
  }

  if (!t || (/^(@|sarkodie)/i.test(t) && t.length < 40)) {
    const hash = fallbackText.match(/#([A-Za-z][A-Za-z0-9]{3,})/);
    if (hash) t = hash[1].replace(/([a-z])([A-Z0-9])/g, '$1 $2');
  }

  return (t || 'Untitled event').slice(0, 120);
}

function instagramFlyerUrl(url: string): string {
  const m = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i);
  if (!m?.[1]) return '';
  return `https://www.instagram.com/p/${m[1]}/media/?size=l`;
}

async function fetchXMedia(url: string): Promise<{
  text: string;
  imageUrl: string;
  author?: string;
}> {
  const m = url.match(/(?:x\.com|twitter\.com)\/([^/]+)\/status\/(\d+)/i);
  if (!m) return { text: '', imageUrl: '' };
  const [, user, id] = m;

  const endpoints = [
    `https://api.fxtwitter.com/\( {user}/status/ \){id}`,
    `https://api.vxtwitter.com/\( {user}/status/ \){id}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: { Accept: 'application/json', 'User-Agent': 'AkwaabaBot/1.0' },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const tweet = data.tweet ?? data;
      const text: string = tweet.text ?? data.text ?? '';
      const author: string =
        tweet.author?.name ?? tweet.author?.screen_name ?? data.user_name ?? user;

      let imageUrl = '';

      const photos =
        tweet.media?.photos ??
        (Array.isArray(data.media_extended)
          ? data.media_extended.filter(
              (x: { type?: string }) => x.type === 'image' || x.type === 'photo',
            )
          : []);
      if (Array.isArray(photos) && photos.length > 0) {
        imageUrl = photos[0].url ?? photos[0].thumbnail_url ?? '';
      }

      if (!imageUrl && Array.isArray(data.mediaURLs)) {
        const photo = data.mediaURLs.find((u: string) =>
          /pbs\.twimg\.com\/media\//i.test(u),
        );
        imageUrl = photo || '';
      }

      if (!imageUrl && Array.isArray(tweet.media?.all)) {
        const photo = tweet.media.all.find(
          (x: { type?: string; url?: string }) => x.type === 'photo' && x.url,
        );
        imageUrl = photo?.url ?? '';
      }

      if (!imageUrl) {
        const vids =
          tweet.media?.videos ??
          (Array.isArray(data.media_extended)
            ? data.media_extended.filter((x: { type?: string }) => x.type === 'video')
            : []);
        if (vids[0]?.thumbnail_url) imageUrl = vids[0].thumbnail_url;
      }

      if (text || imageUrl) return { text, imageUrl, author };
    } catch {
      /* try next */
    }
  }

  return { text: '', imageUrl: '' };
}

export async function parseEventLink(url: string): Promise<ParsedDraft> {
  const notes: string[] = [];
  const source = detectSource(url);

  let html = '';
  let ogTitle = '';
  let ogDesc = '';
  let ogImage = '';
  let bodyText = '';

  if (source === 'X') {
    const x = await fetchXMedia(url);
    if (x.text) {
      bodyText = x.text;
      ogDesc = x.text;
    }
    if (x.imageUrl) {
      ogImage = x.imageUrl.includes('name=')
        ? x.imageUrl
        : `\( {x.imageUrl} \){x.imageUrl.includes('?') ? '&' : '?'}name=large`;
      notes.push('Flyer photo preferred over video from the post.');
    }
    if (x.text) ogTitle = x.text.slice(0, 80);
  }

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
    if (!bodyText) notes.push('Could not fetch the page. Fill the fields from the post.');
  }

  if (!ogTitle) ogTitle = meta(html, 'og:title') || meta(html, 'twitter:title');
  if (!ogDesc) ogDesc = meta(html, 'og:description') || meta(html, 'twitter:description');
  if (!ogImage) {
    ogImage =
      meta(html, 'og:image') ||
      meta(html, 'og:image:url') ||
      meta(html, 'twitter:image') ||
      meta(html, 'twitter:image:src');
  }

  if (!ogImage && /instagram\.com\/(p|reel|tv)\//i.test(url)) {
    ogImage = instagramFlyerUrl(url);
    if (ogImage) notes.push('Flyer taken from Instagram media — confirm it looks right.');
  }

  if (ogImage && /\.(mp4|m3u8|mov)(\?|$)/i.test(ogImage)) {
    notes.push('Skipped video URL as flyer — add image manually if needed.');
    ogImage = '';
  }

  // OCR the flyer for venue / date / title when image exists
  let ocrText = '';
  if (ogImage) {
    const ocr = await ocrFlyerImage(ogImage);
    if (ocr.used && ocr.text) {
      ocrText = ocr.text;
      notes.push('Read text from flyer image (OCR).');
    } else if (ocr.error) {
      notes.push(`Flyer OCR skipped: ${ocr.error}`);
    }
  }

  const blob = `${ogTitle} ${ogDesc} ${bodyText} ${ocrText}`;

  let { date, dateLabel } = parseDates(blob);
  let city = parseCity(blob);
  const venueHit = parseVenue(blob);
  let venue = venueHit.venue;
  if (venueHit.city) city = venueHit.city;

  // Prefer OCR-only re-parse if caption was weak
  if (ocrText) {
    if (!date) {
      const d = parseDates(ocrText);
      date = d.date;
      dateLabel = d.dateLabel;
    }
    if (!venue) {
      const v = parseVenue(ocrText);
      venue = v.venue;
      if (v.city) city = v.city;
    }
    if (city === 'international') city = parseCity(ocrText);
  }

  const title = cleanTitle(ogTitle, blob);

  let confidence = 0.35;
  if (date) confidence += 0.25;
  if (city && city !== 'international') confidence += 0.15;
  if (ogImage) confidence += 0.1;
  if (venue) confidence += 0.1;
  if (ocrText) confidence += 0.05;
  if (/ticket/i.test(ogDesc)) confidence += 0.05;

  if (!date) notes.push('Date not found — set it from the flyer.');
  if (!venue) {
    notes.push(
      'Venue not found in caption or flyer text. Add it manually if needed.',
    );
  }
  if (/bio/i.test(ogDesc)) {
    notes.push('Tickets are “in bio”. Paste the real ticket URL below.');
  }

  return {
    sourceUrl: url,
    source,
    title,
    description: (ogDesc || bodyText).slice(0, 600),
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
    }];

/** Venue phrases often on Ghana / diaspora flyers */
const VENUE_PATTERNS: { re: RegExp; venue: string; city?: string }[] = [
  { re: /baba\s*yara/i, venue: 'Baba Yara Sports Stadium', city: 'kumasi' },
  { re: /accra\s*sports?\s*stadium/i, venue: 'Accra Sports Stadium', city: 'accra' },
  { re: /independence\s*square/i, venue: 'Independence Square', city: 'accra' },
  { re: /national\s*theatre/i, venue: 'National Theatre', city: 'accra' },
  { re: /prince\s*bandroom/i, venue: 'Prince Bandroom', city: 'melbourne' },
  { re: /metro\s*theatre/i, venue: 'Metro Theatre', city: 'sydney' },
  { re: /o2\s*academy/i, venue: 'O2 Academy' },
  { re: /wembley/i, venue: 'Wembley' },
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
  const yearDefault = 2026;
  const t = text.replace(/(\d+)(st|nd|rd|th)/gi, '$1');

  // 9 x 10 October / 9th & 10th October
  const range = t.match(
    /(\d{1,2})\s*(?:x|&|and|-|–|to)\s*(\d{1,2})\s*(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)/i,
  );
  if (range) {
    const m = MONTHS[range[3].toLowerCase()];
    const d1 = range[1].padStart(2, '0');
    const iso = `\( {yearDefault}- \){String(m).padStart(2, '0')}-${d1}`;
    const label = `\( {range[1]}– \){range[2]} \( {range[3][0].toUpperCase()} \){range[3].slice(1, 3)} ${yearDefault}`;
    return { date: iso, dateLabel: label };
  }

  // 24th OCTOBER / 24 OCTOBER 2026 / October 24 2026
  const one = t.match(
    /(\d{1,2})\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)(?:\s+(\d{4}))?/i,
  );
  if (one) {
    const y = one[3] || String(yearDefault);
    const m = MONTHS[one[2].toLowerCase()];
    const iso = `\( {y}- \){String(m).padStart(2, '0')}-${one[1].padStart(2, '0')}`;
    const label = `${one[1]} \( {one[2][0].toUpperCase()} \){one[2].slice(1, 3)} ${y}`;
    return { date: iso, dateLabel: label };
  }

  const flipped = t.match(
    /(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?/i,
  );
  if (flipped) {
    const y = flipped[3] || String(yearDefault);
    const m = MONTHS[flipped[1].toLowerCase()];
    const iso = `\( {y}- \){String(m).padStart(2, '0')}-${flipped[2].padStart(2, '0')}`;
    const label = `${flipped[2]} \( {flipped[1][0].toUpperCase()} \){flipped[1].slice(1, 3)} ${y}`;
    return { date: iso, dateLabel: label };
  }

  return { date: '', dateLabel: '' };
}

function parseCity(text: string) {
  const lower = text.toLowerCase();
  for (const c of CITIES) {
    if (lower.includes(c.key)) return c.city;
  }
  // hashtags like #RapperholicKumasi26
  if (/kumasi/i.test(text)) return 'kumasi';
  if (/accra/i.test(text)) return 'accra';
  return 'international';
}

function parseVenue(text: string): { venue: string; city?: string } {
  for (const v of VENUE_PATTERNS) {
    if (v.re.test(text)) return { venue: v.venue, city: v.city };
  }
  return { venue: '' };
}

function cleanTitle(raw: string, fallbackText: string) {
  let t = raw
    .replace(/\s+on (Instagram|X|Twitter).*$/i, '')
    .replace(/^.* on (Instagram|X|Twitter):\s*/i, '')
    .replace(/^["“]|["”]$/g, '')
    .trim();

  // Prefer event-style phrases from caption
  const eventish = fallbackText.match(
    /\b(rapperholic\s*\d*|detty\s*december|chale\s*wote|akwasidae|[\w\s]{2,40}\s+(live|concert|festival|tour|show))\b/i,
  );
  if (eventish) {
    t = eventish[0].replace(/\s+/g, ' ').trim();
    // Title-case light
    t = t.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  if (!t || /^(sarkodie|@)/i.test(t) && t.length < 40) {
    const hash = fallbackText.match(/#([A-Za-z][A-Za-z0-9]{3,})/);
    if (hash) t = hash[1].replace(/([a-z])([A-Z0-9])/g, '$1 $2');
  }

  t = t.slice(0, 120);
  return t || 'Untitled event';
}

function instagramFlyerUrl(url: string): string {
  const m = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i);
  if (!m?.[1]) return '';
  return `https://www.instagram.com/p/${m[1]}/media/?size=l`;
}

/** Prefer still flyer photos over video thumbnails (X/Twitter). */
async function fetchXMedia(url: string): Promise<{
  text: string;
  imageUrl: string;
  author?: string;
}> {
  const m = url.match(/(?:x\.com|twitter\.com)\/([^/]+)\/status\/(\d+)/i);
  if (!m) return { text: '', imageUrl: '' };
  const [, user, id] = m;

  const endpoints = [
    `https://api.fxtwitter.com/\( {user}/status/ \){id}`,
    `https://api.vxtwitter.com/\( {user}/status/ \){id}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: { Accept: 'application/json', 'User-Agent': 'AkwaabaBot/1.0' },
        next: { revalidate: 0 },
      } as RequestInit);
      if (!res.ok) continue;
      const data = await res.json();

      // fxtwitter shape
      const tweet = data.tweet ?? data;
      const text: string = tweet.text ?? data.text ?? '';
      const author: string =
        tweet.author?.name ?? tweet.author?.screen_name ?? data.user_name ?? user;

      let imageUrl = '';

      // Prefer photos (flyer) over video
      const photos =
        tweet.media?.photos ??
        data.media_extended?.filter((x: { type?: string }) => x.type === 'image' || x.type === 'photo') ??
        [];
      if (Array.isArray(photos) && photos.length > 0) {
        imageUrl = photos[0].url ?? photos[0].thumbnail_url ?? '';
      }

      // mediaURLs from vxtwitter — prefer pbs.twimg.com/media (photos)
      if (!imageUrl && Array.isArray(data.mediaURLs)) {
        const photo = data.mediaURLs.find((u: string) =>
          /pbs\.twimg\.com\/media\//i.test(u),
        );
        imageUrl = photo || '';
      }

      // Last resort: first media in "all" that is photo
      if (!imageUrl && Array.isArray(tweet.media?.all)) {
        const photo = tweet.media.all.find(
          (x: { type?: string; url?: string }) => x.type === 'photo' && x.url,
        );
        imageUrl = photo?.url ?? '';
      }

      // Never use video file as image; video thumbnail only if no photo
      if (!imageUrl) {
        const vids = tweet.media?.videos ?? data.media_extended?.filter((x: { type?: string }) => x.type === 'video') ?? [];
        if (vids[0]?.thumbnail_url) imageUrl = vids[0].thumbnail_url;
      }

      if (text || imageUrl) return { text, imageUrl, author };
    } catch {
      /* try next */
    }
  }

  return { text: '', imageUrl: '' };
}

export async function parseEventLink(url: string): Promise<ParsedDraft> {
  const notes: string[] = [];
  const source = detectSource(url);

  let html = '';
  let ogTitle = '';
  let ogDesc = '';
  let ogImage = '';
  let bodyText = '';

  // X: structured media API first (flyer photo over video)
  if (source === 'X') {
    const x = await fetchXMedia(url);
    if (x.text) {
      bodyText = x.text;
      ogDesc = x.text;
    }
    if (x.imageUrl) {
      ogImage = x.imageUrl.includes('?') ? x.imageUrl : `${x.imageUrl}?name=large`;
      notes.push('Flyer photo preferred over video from the post.');
    }
    if (x.author && x.text) {
      ogTitle = x.text.slice(0, 80);
    }
  }

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
    if (!bodyText) notes.push('Could not fetch the page. Fill the fields from the post.');
  }

  if (!ogTitle) ogTitle = meta(html, 'og:title') || meta(html, 'twitter:title');
  if (!ogDesc) ogDesc = meta(html, 'og:description') || meta(html, 'twitter:description');
  if (!ogImage) {
    ogImage =
      meta(html, 'og:image') ||
      meta(html, 'og:image:url') ||
      meta(html, 'twitter:image') ||
      meta(html, 'twitter:image:src');
  }

  // Instagram flyer fallback
  if (!ogImage && /instagram\.com\/(p|reel|tv)\//i.test(url)) {
    ogImage = instagramFlyerUrl(url);
    if (ogImage) notes.push('Flyer taken from Instagram media — confirm it looks right.');
  }

  // Skip obvious video file URLs as the event image
  if (ogImage && /\.(mp4|m3u8|mov)(\?|$)/i.test(ogImage)) {
    notes.push('Skipped video URL as flyer — add image manually if needed.');
    ogImage = '';
  }

  const blob = `${ogTitle} ${ogDesc} ${bodyText}`;
  const { date, dateLabel } = parseDates(blob);
  let city = parseCity(blob);
  const venueHit = parseVenue(blob);
  let venue = venueHit.venue;
  if (venueHit.city) city = venueHit.city;

  const title = cleanTitle(ogTitle, blob);

  let confidence = 0.35;
  if (date) confidence += 0.25;
  if (city && city !== 'international') confidence += 0.15;
  if (ogImage) confidence += 0.1;
  if (venue) confidence += 0.1;
  if (/ticket/i.test(ogDesc)) confidence += 0.05;

  if (!date) notes.push('Date not found in caption — check the flyer and set the date.');
  if (!venue) {
    notes.push(
      'Venue not in the caption (often only on the flyer). Add it manually — e.g. Baba Yara Sports Stadium.',
    );
  }
  if (/bio/i.test(ogDesc)) {
    notes.push('Tickets are “in bio”. Paste the real ticket URL below.');
  }

  return {
    sourceUrl: url,
    source,
    title,
    description: (ogDesc || bodyText).slice(0, 600),
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
