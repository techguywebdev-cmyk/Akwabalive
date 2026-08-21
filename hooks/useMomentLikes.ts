'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Real likes for a moment.
 * Requires table: moment_likes (moment_id uuid, user_id uuid, primary key (moment_id, user_id))
 * Optional: moments.like_count integer (maintained by trigger or client).
 */
export function useMomentLikes(momentId: string | undefined, userId: string | undefined) {
  const supabase = createClient();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!momentId) {
      setLiked(false);
      setLikeCount(0);
      setReady(false);
      return;
    }

    let cancelled = false;

    async function load() {
      // Count
      const { count } = await supabase
        .from('moment_likes')
        .select('*', { count: 'exact', head: true })
        .eq('moment_id', momentId);

      if (!cancelled) setLikeCount(count ?? 0);

      // User liked?
      if (userId) {
        const { data } = await supabase
          .from('moment_likes')
          .select('moment_id')
          .eq('moment_id', momentId)
          .eq('user_id', userId)
          .maybeSingle();
        if (!cancelled) setLiked(!!data);
      } else {
        if (!cancelled) setLiked(false);
      }
      if (!cancelled) setReady(true);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [momentId, userId, supabase]);

  const toggle = useCallback(async () => {
    if (!momentId || !userId) return;

    // Optimistic
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => (wasLiked ? Math.max(0, c - 1) : c + 1));

    if (wasLiked) {
      const { error } = await supabase
        .from('moment_likes')
        .delete()
        .eq('moment_id', momentId)
        .eq('user_id', userId);
      if (error) {
        setLiked(true);
        setLikeCount((c) => c + 1);
      }
    } else {
      const { error } = await supabase.from('moment_likes').insert({
        moment_id: momentId,
        user_id: userId,
      });
      if (error) {
        setLiked(false);
        setLikeCount((c) => Math.max(0, c - 1));
      }
    }
  }, [momentId, userId, liked, supabase]);

  return { liked, likeCount, ready, toggle };
}
