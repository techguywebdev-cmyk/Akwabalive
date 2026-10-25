'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { GhanaEvent } from '@/lib/types';

export interface CrowdFace {
  id: string;
  username: string;
  avatar_url: string | null;
}

/**
 * Social signals around a moment:
 *  - who was there (event_attendance with status "attended" for the moment's event)
 *  - which commenters were there / already hold a ticket for the next edition
 *  - the viewer's own "I was there" and "Remind me" (dream_events) state
 */
export function useMomentCrowd(
  momentEventSlug: string | null | undefined,
  next: GhanaEvent | null,
  commenterIds: string[],
  userId: string | undefined,
) {
  const supabase = createClient();
  const [thereCount, setThereCount] = useState(0);
  const [faces, setFaces] = useState<CrowdFace[]>([]);
  const [goingCount, setGoingCount] = useState(0);
  const [wasThereIds, setWasThereIds] = useState<Set<string>>(new Set());
  const [goingIds, setGoingIds] = useState<Set<string>>(new Set());
  const [iWasThere, setIWasThere] = useState(false);
  const [reminded, setReminded] = useState(false);

  const idsKey = useMemo(() => Array.from(new Set(commenterIds)).sort().join(','), [commenterIds]);
  const nextSlug = next?.slug ?? null;

  // Who was there + who is going
  useEffect(() => {
    let cancelled = false;
    setThereCount(0);
    setFaces([]);
    setGoingCount(0);
    if (!momentEventSlug) return;

    (async () => {
      const { data, count } = await supabase
        .from('event_attendance')
        .select('user_id', { count: 'exact' })
        .eq('event_slug', momentEventSlug)
        .eq('status', 'attended')
        .eq('is_public', true)
        .limit(3);
      if (cancelled) return;
      setThereCount(count ?? 0);
      const ids = (data ?? []).map((r: { user_id: string }) => r.user_id);
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', ids);
        if (!cancelled) setFaces((profs ?? []) as CrowdFace[]);
      }
      if (nextSlug) {
        const { count: going } = await supabase
          .from('event_attendance')
          .select('user_id', { count: 'exact', head: true })
          .eq('event_slug', nextSlug)
          .eq('status', 'going');
        if (!cancelled) setGoingCount(going ?? 0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [momentEventSlug, nextSlug, supabase]);

  // Commenter badges
  useEffect(() => {
    let cancelled = false;
    const ids = idsKey ? idsKey.split(',') : [];
    setWasThereIds(new Set());
    setGoingIds(new Set());
    if (!ids.length) return;

    (async () => {
      if (momentEventSlug) {
        const { data } = await supabase
          .from('event_attendance')
          .select('user_id')
          .eq('event_slug', momentEventSlug)
          .eq('status', 'attended')
          .in('user_id', ids);
        if (!cancelled) setWasThereIds(new Set((data ?? []).map((r: { user_id: string }) => r.user_id)));
      }
      if (nextSlug) {
        const [{ data: going }, { data: tix }] = await Promise.all([
          supabase.from('event_attendance').select('user_id').eq('event_slug', nextSlug).eq('status', 'going').in('user_id', ids),
          supabase.from('tickets').select('user_id').eq('event_slug', nextSlug).eq('status', 'active').in('user_id', ids),
        ]);
        if (!cancelled) {
          setGoingIds(new Set([...(going ?? []), ...(tix ?? [])].map((r: { user_id: string }) => r.user_id)));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [idsKey, momentEventSlug, nextSlug, supabase]);

  // Viewer state
  useEffect(() => {
    let cancelled = false;
    setIWasThere(false);
    setReminded(false);
    if (!userId) return;
    (async () => {
      if (momentEventSlug) {
        const { data } = await supabase
          .from('event_attendance')
          .select('status')
          .eq('user_id', userId)
          .eq('event_slug', momentEventSlug)
          .maybeSingle();
        if (!cancelled) setIWasThere(data?.status === 'attended');
      }
      if (nextSlug) {
        const { data } = await supabase
          .from('dream_events')
          .select('event_slug')
          .eq('user_id', userId)
          .eq('event_slug', nextSlug)
          .maybeSingle();
        if (!cancelled) setReminded(!!data);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, momentEventSlug, nextSlug, supabase]);

  const toggleWasThere = useCallback(async () => {
    if (!userId || !momentEventSlug) return;
    const nextVal = !iWasThere;
    setIWasThere(nextVal);
    setThereCount((c) => Math.max(0, c + (nextVal ? 1 : -1)));
    const { error } = nextVal
      ? await supabase.from('event_attendance').upsert(
          { user_id: userId, event_slug: momentEventSlug, status: 'attended', is_public: true },
          { onConflict: 'user_id,event_slug' },
        )
      : await supabase.from('event_attendance').delete().eq('user_id', userId).eq('event_slug', momentEventSlug).eq('status', 'attended');
    if (error) {
      setIWasThere(!nextVal);
      setThereCount((c) => Math.max(0, c + (nextVal ? -1 : 1)));
    }
  }, [userId, momentEventSlug, iWasThere, supabase]);

  const toggleReminder = useCallback(async () => {
    if (!userId || !next) return;
    const nextVal = !reminded;
    setReminded(nextVal);
    const { error } = nextVal
      ? await supabase.from('dream_events').upsert(
          { user_id: userId, event_slug: next.slug, event_title: next.title, event_image: next.image, is_public: true },
          { onConflict: 'user_id,event_slug' },
        )
      : await supabase.from('dream_events').delete().eq('user_id', userId).eq('event_slug', next.slug);
    if (error) setReminded(!nextVal);
  }, [userId, next, reminded, supabase]);

  return { thereCount, faces, goingCount, wasThereIds, goingIds, iWasThere, reminded, toggleWasThere, toggleReminder };
}
