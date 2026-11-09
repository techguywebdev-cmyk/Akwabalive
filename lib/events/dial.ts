import { eventInfo } from '@/lib/events/contacts';
import type { GhanaEvent } from '@/lib/types';

/**
 * The short code to dial for tickets, when there is one: from "Dial *714*20#" as the ticket source, or found in the
 * description, flyer or listing info. Dialling (MoMo) is how most people buy, so it leads over a website link.
 */
export function ticketDial(e: Pick<GhanaEvent, 'ticketSource' | 'description' | 'listingInfo' | 'flyerText'>): string | null {
  const own = e.ticketSource?.match(/\*\s?\d{2,4}(?:\s?\*\s?\d{1,6})+\s?#/);
  if (own) return own[0].replace(/\s+/g, '');
  return eventInfo(e.description, e.listingInfo, e.ticketSource, e.flyerText).ussd[0] ?? null;
}

/** Opens the phone's dialler with the code filled in (# must be encoded) */
export const dialHref = (code: string) => `tel:${code.replace(/#/g, '%23')}`;
