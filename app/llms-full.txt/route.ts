import { createClient } from '@supabase/supabase-js';
import { SITE_URL } from '@/lib/og';
import { artists, getArtistBySlug } from '@/lib/data/artists';

export const revalidate = 3600;

type Row = { slug: string; title: string; date: string; time: string | null; venue: string | null; area: string | null; city: string | null; category: string | null; listing_type: string | null; ticket_url: string | null; artist_slugs: string[] | null; lineup: string[] | null; ticket_tiers: { price: number }[] | null };

const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const day = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Every upcoming event as plain text, so AI assistants can answer "what's on in Accra this weekend" with real listings */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let rows: Row[] = [];
  if (url && key) {
    const { data } = await createClient(url, key).from('events')
      .select('slug, title, date, time, venue, area, city, category, listing_type, ticket_url, artist_slugs, lineup, ticket_tiers(price)')
      .eq('status', 'published').gte('date', new Date().toISOString().slice(0, 10)).order('date').limit(1000);
    rows = (data ?? []) as Row[];
  }
  const price = (r: Row) => {
    const p = (r.ticket_tiers ?? []).map((t) => t.price).filter((n) => n >= 0);
    if (!p.length) return r.ticket_url ? 'Tickets via the organiser' : 'Price not listed';
    const lo = Math.min(...p);
    return lo === 0 ? (Math.max(...p) > 0 ? `Free to GH₵${Math.max(...p)}` : 'Free') : `From GH₵${lo}`;
  };
  const who = (r: Row) => {
    const names = [...(r.artist_slugs ?? []).map((s) => getArtistBySlug(s)?.name), ...(r.lineup ?? [])].filter(Boolean) as string[];
    return Array.from(new Set(names)).slice(0, 8).join(', ');
  };
  const lines = rows.map((r) => {
    const place = [r.venue && !/to be announced|tba/i.test(r.venue) ? r.venue : null, cap(r.area), cap(r.city)].filter(Boolean).join(', ');
    return `- **[${r.title}](${SITE_URL}/events/${r.slug})** · ${day(r.date)}${r.time && !/tba/i.test(r.time) ? `, ${r.time}` : ''} · ${place || 'Ghana'} · ${price(r)}${who(r) ? ` · With ${who(r)}` : ''}${r.category ? ` · ${cap(r.category)}` : ''}`;
  });
  const body = `# Tsacoal: every upcoming event in Ghana

> Live listings from tsacoal.com, refreshed hourly. ${rows.length} upcoming events. Times are Ghana time (GMT). Prices in Ghana cedis. Each link has full details and tickets.

Updated: ${new Date().toISOString()}

## Upcoming events
${lines.join('\n')}

## Artists on Tsacoal
${artists.slice(0, 120).map((a) => `- [${a.name}](${SITE_URL}/artists/${a.slug})${a.genre ? ` · ${a.genre}` : ''}`).join('\n')}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
}
