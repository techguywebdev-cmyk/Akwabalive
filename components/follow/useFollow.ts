'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';

const TABLES = {
  artist: { table: 'artist_follows', col: 'artist_slug', path: '/artists/' },
  series: { table: 'series_follows', col: 'series_slug', path: '/series/' },
} as const;

/** Follow state + follower count for an artist or an event series, with optimistic toggling */
export function useFollow(kind: keyof typeof TABLES, slug: string) {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const { table, col, path } = TABLES[kind];
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from(table).select('*', { count: 'exact', head: true }).eq(col, slug).then(({ count: c }) => setCount(c ?? 0));
    if (user) supabase.from(table).select(col).eq('user_id', user.id).eq(col, slug).maybeSingle().then(({ data }) => setFollowing(!!data));
  }, [supabase, table, col, slug, user]);

  const toggle = useCallback(async () => {
    if (!user) { window.location.href = `/auth?next=${encodeURIComponent(`${path}${slug}`)}`; return; }
    setBusy(true);
    const was = following;
    setFollowing(!was);
    setCount((n) => (n ?? 0) + (was ? -1 : 1));
    const { error } = was
      ? await supabase.from(table).delete().eq('user_id', user.id).eq(col, slug)
      : await supabase.from(table).insert({ user_id: user.id, [col]: slug });
    if (error) { setFollowing(was); setCount((n) => (n ?? 0) + (was ? 1 : -1)); }
    setBusy(false);
  }, [user, following, supabase, table, col, slug, path]);

  return { following, count, busy, toggle };
}

/** Slugs of everything the signed-in person follows of one kind */
export function useMyFollows(kind: keyof typeof TABLES) {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const { table, col } = TABLES[kind];
  const [slugs, setSlugs] = useState<string[]>([]);
  useEffect(() => {
    if (!user) { setSlugs([]); return; }
    supabase.from(table).select(col).eq('user_id', user.id).then(({ data }) => setSlugs((data ?? []).map((r: Record<string, string>) => r[col])));
  }, [supabase, table, col, user]);
  return slugs;
}

export const compactCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k` : String(n));
