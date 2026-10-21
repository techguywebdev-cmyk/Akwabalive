import type { GhanaEvent } from '@/lib/types';

export interface CheckoutTier {
  /** ticket_tiers.id — only real (database) tiers can be bought */
  id?: string;
  name: string;
  price: number;
  desc: string;
  available: boolean;
  spots: number;
}

export function getTiers(event: GhanaEvent): CheckoutTier[] {
  // Real tiers set by the organizer
  if (event.tiers?.length) {
    return event.tiers.map((t) => {
      const spots = Math.max(0, t.quantity - t.sold);
      return {
        id: t.id,
        name: t.name,
        price: t.price,
        desc: t.description || (t.price === 0 ? 'Free entry — RSVP required.' : 'Entry ticket.'),
        available: spots > 0,
        spots,
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
  }];
}

