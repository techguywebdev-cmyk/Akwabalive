import type { GhanaEvent } from '@/lib/types';
import { ticketDial } from '@/lib/events/dial';
import { cityLabel } from '@/lib/utils';

const GHANA = new Set(['accra', 'kumasi', 'tema', 'cape-coast', 'takoradi', 'tamale', 'ho', 'koforidua', 'sunyani', 'aburi', 'ada', 'kasoa', 'winneba', 'bolgatanga', 'wa']);
const known = (v?: string | null) => (v && !/\b(tba|tbc|to be announced)\b/i.test(v) ? v.trim() : null);

/**
 * The message that goes with a shared show: what, when, where, how to get tickets, then the ask.
 * Short enough for a WhatsApp status or a tweet; the link is added after it.
 */
export function eventShareText(e: Pick<GhanaEvent, 'title' | 'dateLabel' | 'time' | 'venue' | 'area' | 'city' | 'lineup' | 'ticketSource' | 'ticketUrl' | 'description' | 'listingInfo' | 'flyerText'>, going = false): string {
  const when = [known(e.dateLabel), known(e.time)].filter(Boolean).join(' · ');
  const venue = known(e.venue);
  const city = e.city ? cityLabel(e.city) : null;
  // In Ghana the neighbourhood says more (East Legon); abroad, the city does (The O2, London)
  const abroad = !!e.city && !GHANA.has(e.city);
  const place = abroad ? city : (known(e.area) ?? city);
  const where = [venue, venue && place && venue.toLowerCase().includes(place.toLowerCase()) ? null : place].filter(Boolean).join(', ');
  const acts = (e.lineup ?? []).filter((a) => a && a.toLowerCase() !== e.title.toLowerCase());
  const lineup = acts.length && !e.title.toLowerCase().includes(acts[0].toLowerCase())
    ? acts.slice(0, 3).join(', ') + (acts.length > 3 ? ` +${acts.length - 3}` : '')
    : acts.length > 1 ? acts.slice(1, 4).join(', ') : null;
  const dial = ticketDial(e);
  const lines = [
    e.title,
    when ? `📅 ${when}` : null,
    where ? `📍 ${where}` : null,
    lineup ? `🎤 ${lineup}` : null,
    dial ? `🎟️ Tickets: dial ${dial}` : e.ticketUrl ? '🎟️ Tickets on TsaCoal' : null,
    '',
    going ? 'I’m going. Who’s coming? 👇' : 'Who’s coming? 👇',
  ];
  return lines.filter((l): l is string => typeof l === 'string').join('\n');
}

export const artistShareText = (name: string) => `${name} on TsaCoal: every show, the best live clips and what’s next 👇`;
export const momentShareText = (title: string) => `${title}\nWatch it on TsaCoal 👇`;
