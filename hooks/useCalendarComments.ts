'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Comment } from '@/components/moments/types';

const SELECT = '*, profiles(username, full_name, avatar_url)';

/** Comments on someone's calendar, live, with replies and edits (same shape as the moment and event threads) */
export function useCalendarComments(calendarId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    if (!calendarId) return;
    let cancelled = false;
    supabase.from('calendar_comments').select(SELECT).eq('calendar_id', calendarId).eq('hidden', false).order('created_at', { ascending: true }).limit(300)
      .then(({ data }) => { if (!cancelled && data) setComments(data as unknown as Comment[]); });
    const channel = supabase
      .channel(`cc-${calendarId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'calendar_comments', filter: `calendar_id=eq.${calendarId}` }, async (payload) => {
        const { data } = await supabase.from('calendar_comments').select(SELECT).eq('id', payload.new.id).single();
        if (data && !cancelled) setComments((prev) => (prev.some((c) => c.id === data.id) ? prev : [...prev, data as unknown as Comment]));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'calendar_comments', filter: `calendar_id=eq.${calendarId}` }, (payload) => {
        const n = payload.new as Comment & { hidden?: boolean };
        if (cancelled) return;
        setComments((prev) => (n.hidden ? prev.filter((c) => c.id !== n.id) : prev.map((c) => (c.id === n.id ? { ...c, content: n.content, edited_at: n.edited_at } : c))));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'calendar_comments' }, (payload) => {
        const id = (payload.old as { id?: string }).id;
        if (id && !cancelled) setComments((prev) => prev.filter((c) => c.id !== id && c.parent_id !== id));
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [calendarId, supabase]);

  async function send(userId: string, content: string, profile?: Comment['profiles'], parentId?: string | null) {
    if (!calendarId || !content.trim()) return;
    const temp = `temp-${Date.now()}`;
    setComments((prev) => [...prev, { id: temp, moment_id: '', user_id: userId, content: content.trim(), created_at: new Date().toISOString(), parent_id: parentId ?? null, profiles: profile } as Comment]);
    const { data } = await supabase.from('calendar_comments').insert({ calendar_id: calendarId, user_id: userId, content: content.trim(), parent_id: parentId ?? null }).select(SELECT).single();
    setComments((prev) => {
      const rest = prev.filter((c) => c.id !== temp);
      return !data || rest.some((c) => c.id === data.id) ? rest : [...rest, data as unknown as Comment];
    });
  }
  async function edit(id: string, content: string) {
    if (!content.trim()) return;
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, content: content.trim(), edited_at: new Date().toISOString() } : c)));
    await supabase.from('calendar_comments').update({ content: content.trim() }).eq('id', id);
  }
  async function remove(id: string) {
    setComments((prev) => prev.filter((c) => c.id !== id && c.parent_id !== id));
    await supabase.from('calendar_comments').delete().eq('id', id);
  }
  return { comments, send, edit, remove };
}
