'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { eventInfo } from '@/lib/events/contacts';
import { isListedEvent, type GhanaEvent } from '@/lib/types';

/** Nothing announced yet: no ticket link, dial code, prices or gate price */
export function noTicketsYet(e: GhanaEvent) {
  const listed = isListedEvent(e) && !!e.ticketUrl;
  const gate = eventInfo(e.description, e.listingInfo, e.ticketSource, e.flyerText).gatePrice;
  return !listed && !(e.tiers?.length) && !!e.priceUnknown && !gate && !e.ticketSource;
}

/** "Notify me when tickets drop" for one show: whether you asked, and turning it on or off */
export function useTicketAlert(slug: string, enabled = true) {
  const { user } = useAuth();
  const db = useMemo(() => createClient(), []);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!user || !enabled) return;
    db.from('ticket_alerts').select('event_slug').eq('user_id', user.id).eq('event_slug', slug).maybeSingle()
      .then(({ data, error }) => { if (!error) setOn(!!data); });
  }, [user, enabled, slug, db]);
  const toggle = async () => {
    if (!user) { window.location.href = `/auth?next=/events/${slug}`; return; }
    const next = !on;
    setOn(next);
    if (next) await db.from('ticket_alerts').upsert({ user_id: user.id, event_slug: slug });
    else await db.from('ticket_alerts').delete().eq('user_id', user.id).eq('event_slug', slug);
  };
  return { on, toggle };
}
