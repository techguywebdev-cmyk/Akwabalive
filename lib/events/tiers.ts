import type { GhanaEvent } from '@/lib/types';

export interface CheckoutTier {
  /** ticket_tiers.id — only real (database) tiers can be bought */
  id?: string;
  name: string;
  price: number;
  desc: string;
  available: boolean;
  spots: number;
  kind: 'in_person' | 'stream';
  replayDays?: number | null;
}

/** Every tier, in-person and stream. Use `kind` to split them. */
export function getTiers(event: GhanaEvent): CheckoutTier[] {
  // Real tiers set by the organizer
  if (event.tiers?.length) {
    return event.tiers.map((t) => {
      const spots = Math.max(0, t.quantity - t.sold);
      const kind = t.kind === 'stream' ? 'stream' : 'in_person';
      return {
        id: t.id,
        name: t.name,
        price: t.price,
        desc: t.description || (kind === 'stream'
          ? (t.replayDays ? `Watch live, then rewatch for ${t.replayDays} day${t.replayDays === 1 ? '' : 's'}` : 'Watch live on one device')
          : t.price === 0 ? 'Free entry — RSVP required.' : 'Entry ticket.'),
        available: spots > 0,
        spots,
        kind,
        replayDays: t.replayDays ?? null,
      };
    });
  }
  // Events without organizer tiers: one ticket at the listed price (preview only, not purchasable)
  return [{
    name: event.price === 0 ? 'Free entry' : 'General',
    price: event.price,
    desc: event.price === 0 ? 'RSVP to save your spot.' : 'Standard entry.',
    available: true,
    spots: 999,
    kind: 'in_person',
  }];
}

export const inPersonTiers = (e: GhanaEvent) => getTiers(e).filter((t) => t.kind === 'in_person');
export const streamTiers = (e: GhanaEvent) => getTiers(e).filter((t) => t.kind === 'stream');
/** Can this event be watched online (paid stream tiers or a free YouTube stream)? */
export const canWatchOnline = (e: GhanaEvent) => !!e.youtubeLiveUrl || (!!e.streamEnabled && streamTiers(e).length > 0);
