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

  /** Shows straight away, then swaps in the saved row (no waiting on the live feed) */
  async function send(userId: string, content: string, profile?: Comment['profiles']) {
    if (!momentId || !content.trim()) return;
    const temp = `temp-${Date.now()}`;
    setComments((prev) => [...prev, { id: temp, moment_id: momentId, user_id: userId, content: content.trim(), created_at: new Date().toISOString(), profiles: profile } as Comment]);
    const { data, error } = await supabase.from('moment_comments')
      .insert({ moment_id: momentId, user_id: userId, content: content.trim() })
      .select('*, profiles(username, full_name, avatar_url)').single();
    setComments((prev) => {
      const rest = prev.filter((c) => c.id !== temp);
      if (error || !data) return rest;
      return rest.some((c) => c.id === data.id) ? rest : [...rest, data as Comment];
    });
  }

  async function remove(id: string) {
    setComments((prev) => prev.filter((c) => c.id !== id));
    await supabase.from('moment_comments').delete().eq('id', id);
  }
  async function report(id: string) {
    await supabase.from('comment_reports').insert({ kind: 'moment', comment_id: id });
  }

  return { comments, loading, send, remove, report };
}
