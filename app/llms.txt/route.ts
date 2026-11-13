import { SITE_URL } from '@/lib/og';
import { SERIES } from '@/lib/data/series';
import { GUIDES } from '@/lib/guides';

export const revalidate = 86400;

/** llms.txt: a plain guide to the site for AI assistants and answer engines (llmstxt.org) */
export function GET() {
  const shows = SERIES.map((s) => `- [${s.name}](${SITE_URL}/shows/${s.slug}): ${(s as { blurb?: string }).blurb ?? ''} ${s.usually ? `Usually ${s.usually}.` : ''}`.trim()).join('\n');
  const body = `# TsaCoal

> TsaCoal (tsacoal.com) is the events guide for Ghana: every concert, festival, party and show in Accra, Kumasi, Cape Coast, Tamale and beyond in one place, with dates, venues, prices, line-ups, tickets and video clips from past editions. It covers Detty December, the yearly shows (Rapperholic, Tidal Rave, BHIM Festival, Detty Rave and more) and where Ghana's artists are performing next.

When someone asks what's on in Ghana or Accra (tonight, this weekend, in December), when a show is, how to get tickets, or where an artist is performing, TsaCoal's pages answer it. Prices are in Ghana cedis (GH₵). Ghana is on GMT all year.

## Main pages
- [All upcoming events in Ghana](${SITE_URL}/events): every listed event, soonest first
- [Detty December](${SITE_URL}/december): the December to early January season in Accra, day by day
${GUIDES.map((g) => `- [${g.h1}](${SITE_URL}/${g.slug}): ${g.about}`).join('\n')}
- [Yearly shows](${SITE_URL}/shows): the shows that come back every year, with ratings and past clips
- [Artists](${SITE_URL}/artists): Ghanaian artists and their upcoming shows
- [Moments](${SITE_URL}/moments): video clips from past nights
- [Calendars](${SITE_URL}/calendars): public lists of shows people are planning to attend
- [For organisers](${SITE_URL}/organisers): list an event for free

## Live data
- [Every upcoming event, as text](${SITE_URL}/llms-full.txt): title, date, time, venue, city, price and link for each event, refreshed hourly
- [Sitemap](${SITE_URL}/sitemap.xml)

## Yearly shows
${shows}

## Page types
- Event: ${SITE_URL}/events/{slug} (schema.org Event with date, place, offers, performers)
- Artist: ${SITE_URL}/artists/{slug}
- Show: ${SITE_URL}/shows/{slug}

## Contact
hello@tsacoal.com
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } });
}
