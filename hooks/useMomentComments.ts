'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Comment } from '@/components/moments/types';

export function useMomentComments(momentId: string | undefined) {
  const supabase = createClient();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!momentId) {
      setComments([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    supabase
      .from('moment_comments')
      .select('*, profiles(username, full_name, avatar_url)')
      .eq('moment_id', momentId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!cancelled && data) setComments(data as Comment[]);
        if (!cancelled) setLoading(false);
      });

    const channel = supabase
      .channel(`mc-${momentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'moment_comments',
          filter: `moment_id=eq.${momentId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('moment_comments')
            .select('*, profiles(username, full_name, avatar_url)')
            .eq('id', payload.new.id)
            .single();
          if (data && !cancelled) {
            setComments((prev) => {
              if (prev.some((c) => c.id === data.id)) return prev;
              return [...prev, data as Comment];
            });
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [momentId, supabase]);

  async function send(userId: string, content: string) {
    if (!momentId || !content.trim()) return;
    await supabase.from('moment_comments').insert({
      moment_id: momentId,
      user_id: userId,
      content: content.trim(),
    });
  }

  return { comments, loading, send };
}
