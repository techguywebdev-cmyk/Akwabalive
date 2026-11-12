import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';

export type Cal = { id: string; slug: string; title: string; is_public: boolean; updated_at: string; calendar_events: { event_slug: string }[] };

/** A short link like the website makes: "my-nights-4k2f" */
const slugFor = (title: string) => `${title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'calendar'}-${Math.random().toString(36).slice(2, 6)}`;

export async function myCalendars(userId: string): Promise<Cal[]> {
  const { data } = await supabase.from('calendars').select('id, slug, title, is_public, updated_at, calendar_events(event_slug)').eq('owner_id', userId).order('updated_at', { ascending: false });
  return (data ?? []) as Cal[];
}

/**
 * Your saved nights: every event in any of your calendars. Saving puts a show in your most recent calendar
 * (or starts "My nights" the first time), the same calendars you see on tsacoal.com.
 */
export function useSaved() {
  const { user } = useAuth();
  const [cals, setCals] = useState<Cal[]>([]);
  const [ready, setReady] = useState(false);
  const load = useCallback(async () => {
    if (!user) { setCals([]); setReady(true); return; }
    setCals(await myCalendars(user.id));
    setReady(true);
  }, [user]);
  useEffect(() => { load(); }, [load]);

  const saved = new Set(cals.flatMap((c) => c.calendar_events.map((x) => x.event_slug)));

  const toggle = useCallback(async (slug: string) => {
    if (!user) return false;
    const holding = cals.filter((c) => c.calendar_events.some((x) => x.event_slug === slug));
    if (holding.length) {
      await Promise.all(holding.map((c) => supabase.from('calendar_events').delete().eq('calendar_id', c.id).eq('event_slug', slug)));
    } else {
      let cal = cals[0];
      if (!cal) {
        const { data } = await supabase.from('calendars').insert({ owner_id: user.id, slug: slugFor('My nights'), title: 'My nights', is_public: false }).select('id, slug, title, is_public, updated_at').single();
        if (!data) return false;
        cal = { ...(data as Omit<Cal, 'calendar_events'>), calendar_events: [] };
      }
      await supabase.from('calendar_events').upsert({ calendar_id: cal.id, event_slug: slug });
      await supabase.from('calendars').update({ updated_at: new Date().toISOString() }).eq('id', cal.id);
    }
    await load();
    return true;
  }, [user, cals, load]);

  return { cals, saved, toggle, reload: load, ready, signedIn: !!user };
}
