import { Linking, Share } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { dialUrl, shareMessage, ticketDial, type Ev } from '@/lib/events';
import { SITE } from '@/lib/supabase';

/** Tickets: dial the MoMo code when there is one (that's how most people buy), else open the ticket page */
export function getTickets(e: Ev) {
  Haptics.selectionAsync().catch(() => {});
  const code = ticketDial(e);
  if (code) return Linking.openURL(dialUrl(code));
  if (e.ticket_url) return WebBrowser.openBrowserAsync(e.ticket_url);
  return router.push(`/events/${e.slug}`);
}

/** Share: the ready-made message plus the link (opens WhatsApp, Instagram, X...) */
export function shareEvent(e: Ev, opts: { going?: boolean; username?: string | null } = {}) {
  const url = `${SITE}/events/${e.slug}${opts.username ? `?by=${encodeURIComponent(opts.username)}` : ''}`;
  return Share.share({ message: `${shareMessage(e, opts.going)}\n${url}`, url, title: e.title }).catch(() => {});
}

export const ticketLabel = (e: Ev) => (ticketDial(e) ? `Dial ${ticketDial(e)}` : e.ticket_url ? 'Get tickets' : 'See the show');
