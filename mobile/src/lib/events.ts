import { supabase } from './supabase';

/** An event as the app uses it (straight from the events table) */
export type Ev = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  city: string | null;
  venue: string | null;
  area: string | null;
  address: string | null;
  date: string;
  time: string | null;
  image_url: string | null;
  ticket_url: string | null;
  ticket_source: string | null;
  promo_video_url: string | null;
  is_hot: boolean;
  lineup: string[] | null;
  artist_slugs: string[] | null;
  highlight: string | null;
  listing_info: string | null;
  flyer_text: string | null;
  ticket_tiers?: { price: number; is_available: boolean; kind: string | null }[];
};

const FIELDS = 'id, slug, title, description, category, city, venue, area, address, date, time, image_url, ticket_url, ticket_source, promo_video_url, is_hot, lineup, artist_slugs, highlight, listing_info, flyer_text, ticket_tiers(price, is_available, kind)';
export const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

/** Every show from today on, soonest first */
export async function upcoming(): Promise<Ev[]> {
  const { data, error } = await supabase.from('events').select(FIELDS).eq('status', 'published').gte('date', today()).order('date', { ascending: true }).limit(400);
  if (error) throw error;
  return (data ?? []) as Ev[];
}

export async function eventBySlug(slug: string): Promise<Ev | null> {
  const { data } = await supabase.from('events').select(FIELDS).eq('slug', slug).maybeSingle();
  return (data as Ev) ?? null;
}

export async function eventsBySlugs(slugs: string[]): Promise<Ev[]> {
  if (!slugs.length) return [];
  const { data } = await supabase.from('events').select(FIELDS).in('slug', slugs);
  return (data ?? []) as Ev[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const asDay = (date: string) => new Date(`${date}T12:00:00`);
export const dayLabel = (date: string) => { const d = asDay(date); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
export const monthShort = (date: string) => MONTHS[asDay(date).getMonth()].toUpperCase();
export const known = (v?: string | null) => (v && !/\b(tba|tbc|to be announced)\b/i.test(v) ? v.trim() : null);

/** "Tonight", "Tomorrow", "In 5 days", "In 3 weeks" */
export function until(date: string): string {
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const n = Math.round((new Date(`${date}T00:00:00`).getTime() - a.getTime()) / 86400000);
  if (n < 0) return 'Been';
  if (n === 0) return 'Tonight';
  if (n === 1) return 'Tomorrow';
  if (n < 7) return `In ${n} days`;
  if (n < 14) return 'Next week';
  if (n < 60) return `In ${Math.round(n / 7)} weeks`;
  return `In ${Math.round(n / 30)} months`;
}

/** The short code to dial for tickets (MoMo), when there is one: dialling comes first */
export function ticketDial(e: Pick<Ev, 'ticket_source' | 'description' | 'listing_info' | 'flyer_text'>): string | null {
  for (const t of [e.ticket_source, e.description, e.listing_info, e.flyer_text]) {
    const m = t?.match(/\*\s?\d{2,4}(?:\s?\*\s?\d{1,6})+\s?#/);
    if (m) return m[0].replace(/\s+/g, '');
  }
  return null;
}
export const dialUrl = (code: string) => `tel:${code.replace(/#/g, '%23')}`;

export function priceText(e: Ev): string | null {
  const tiers = (e.ticket_tiers ?? []).filter((t) => t.is_available && t.kind !== 'stream');
  if (!tiers.length) return null;
  const min = Math.min(...tiers.map((t) => Number(t.price)));
  return min === 0 ? 'Free' : `From ₵${min.toLocaleString()}`;
}

export function youtubeId(url?: string | null): string | null {
  const m = url?.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

const GHANA = new Set(['accra', 'kumasi', 'tema', 'cape-coast', 'takoradi', 'tamale', 'ho', 'koforidua', 'sunyani', 'aburi', 'ada', 'kasoa', 'winneba']);
export const cityName = (c?: string | null) => (c ? c.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : null);

/** Where, the way people say it: "Ghud Park, Accra Mall" in Ghana, "The O2, London" abroad */
export function placeLine(e: Ev): string {
  const venue = known(e.venue);
  const place = e.city && !GHANA.has(e.city) ? cityName(e.city) : known(e.area) ?? cityName(e.city);
  return [venue, venue && place && venue.toLowerCase().includes(place.toLowerCase()) ? null : place].filter(Boolean).join(', ');
}

/** The message that goes with a shared show (same as the website) */
export function shareMessage(e: Ev, going = false): string {
  const when = [dayLabel(e.date), known(e.time)].filter(Boolean).join(' · ');
  const acts = (e.lineup ?? []).filter((a) => a.toLowerCase() !== e.title.toLowerCase() && !e.title.toLowerCase().includes(a.toLowerCase()));
  const dial = ticketDial(e);
  return [
    e.title,
    `📅 ${when}`,
    placeLine(e) ? `📍 ${placeLine(e)}` : null,
    acts.length ? `🎤 ${acts.slice(0, 3).join(', ')}` : null,
    dial ? `🎟️ Tickets: dial ${dial}` : e.ticket_url ? '🎟️ Tickets on TsaCoal' : null,
    '',
    going ? 'I’m going. Who’s coming? 👇' : 'Who’s coming? 👇',
  ].filter((l): l is string => typeof l === 'string').join('\n');
}
