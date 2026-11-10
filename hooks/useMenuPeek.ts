'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TENTPOLES } from '@/lib/data/tentpoles';

export type MenuPeek = {
  flyers: string[];            // a few of the season's big nights
  bigNights: number;           // how many are still to come
  shows: { n: number; when: 'tonight' | 'this week' } | null;
  clip: string | null;         // newest clip's YouTube id
  artists: number | null;      // how many artists have pages
  next: string | null;         // the soonest show's flyer
  calendars: number | null;    // public calendars people made
  soon: { slug: string; title: string; image_url: string; date: string }[]; // flyers for the coming week
};

let cache: MenuPeek | null = null;

/** Real things to show beside each place in the menu, loaded the first time it opens */
export function useMenuPeek(open: boolean): MenuPeek | null {
  const [peek, setPeek] = useState<MenuPeek | null>(cache);
  useEffect(() => {
    if (!open || cache) return;
    let live = true;
    const db = createClient();
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' });
    const week = new Date(Date.parse(today) + 6 * 86400000).toISOString().slice(0, 10);
    Promise.all([
      db.from('events').select('image_url').eq('status', 'published').eq('is_hot', true).gte('date', today).lte('date', '2027-01-05').not('image_url', 'is', null).order('date').limit(3),
      db.from('events').select('id', { count: 'exact', head: true }).eq('status', 'published').eq('date', today),
      db.from('events').select('id', { count: 'exact', head: true }).eq('status', 'published').gte('date', today).lte('date', week),
      db.from('moments').select('youtube_id').eq('status', 'live').not('youtube_id', 'is', null).order('created_at', { ascending: false }).limit(1),
      db.from('artist_profiles').select('slug', { count: 'exact', head: true }),
      db.from('events').select('image_url').eq('status', 'published').gte('date', today).not('image_url', 'is', null).order('date').order('is_hot', { ascending: false }).limit(1),
      db.from('calendars').select('id', { count: 'exact', head: true }).eq('is_public', true),
      db.from('events').select('slug, title, image_url, date').eq('status', 'published').gte('date', today).lte('date', week).not('image_url', 'is', null).order('is_hot', { ascending: false }).order('date').limit(10),
    ]).then(([hot, tonight, thisWeek, clip, artists, next, cals, soon]) => {
      if (!live) return;
      const t = tonight.count ?? 0, w = thisWeek.count ?? 0;
      cache = {
        flyers: ((hot.data ?? []) as { image_url: string }[]).map((r) => r.image_url),
        bigNights: TENTPOLES.filter((x) => (x.end ?? x.date) >= today).length,
        shows: t >= 3 ? { n: t, when: 'tonight' } : w ? { n: w, when: 'this week' } : null,
        clip: ((clip.data ?? []) as { youtube_id: string }[])[0]?.youtube_id ?? null,
        artists: artists.count ?? null,
        next: ((next.data ?? []) as { image_url: string }[])[0]?.image_url ?? null,
        calendars: cals.count ?? null,
        soon: ((soon.data ?? []) as MenuPeek['soon']).filter((e) => !/images\.unsplash\.com/.test(e.image_url)),
      };
      setPeek(cache);
    });
    return () => { live = false; };
  }, [open]);
  return peek;
}
