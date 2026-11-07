'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Comment } from '@/components/moments/types';

/** The chat on an event page, live: new comments appear as they're posted */
export function useEventComments(slug: string | undefined) {
  const supabase = useMemo(() => createClient(), []);
  const [comments, setComments] = useState<Comment[]>([]);
  const [goingIds, setGoingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const select = '*, profiles(username, full_name, avatar_url)';
    supabase.from('event_comments').select(select).eq('event_slug', slug).order('created_at', { ascending: true }).limit(300)
      .then(({ data }) => { if (!cancelled && data) setComments(data as unknown as Comment[]); });
    supabase.from('event_attendance').select('user_id').eq('event_slug', slug).eq('status', 'going').eq('is_public', true).limit(1000)
      .then(({ data }) => { if (!cancelled && data) setGoingIds(new Set(data.map((d: { user_id: string }) => d.user_id))); });

    const channel = supabase
      .channel(`ec-${slug}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_comments', filter: `event_slug=eq.${slug}` }, async (payload) => {
        const { data } = await supabase.from('event_comments').select(select).eq('id', payload.new.id).single();
        if (data && !cancelled) setComments((prev) => (prev.some((c) => c.id === data.id) ? prev : [...prev, data as unknown as Comment]));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'event_comments', filter: `event_slug=eq.${slug}` }, (payload) => {
        const n = payload.new as Comment;
        if (!cancelled) setComments((prev) => prev.map((c) => (c.id === n.id ? { ...c, content: n.content, edited_at: n.edited_at } : c)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'event_comments' }, (payload) => {
        const id = (payload.old as { id?: string }).id;
        if (id && !cancelled) setComments((prev) => prev.filter((c) => c.id !== id && c.parent_id !== id));
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [slug, supabase]);

  async function send(userId: string, content: string, profile?: Comment['profiles'], parentId?: string | null) {
    if (!slug || !content.trim()) return;
    const temp = `temp-${Date.now()}`;
    setComments((prev) => [...prev, { id: temp, moment_id: '', user_id: userId, content: content.trim(), created_at: new Date().toISOString(), parent_id: parentId ?? null, profiles: profile } as Comment]);
    const { data } = await supabase.from('event_comments').insert({ event_slug: slug, user_id: userId, content: content.trim(), parent_id: parentId ?? null })
      .select('*, profiles(username, full_name, avatar_url)').single();
    setComments((prev) => {
      const rest = prev.filter((c) => c.id !== temp);
      return !data || rest.some((c) => c.id === data.id) ? rest : [...rest, data as unknown as Comment];
    });
  }

  /** Your own comment's text; shows straight away */
  async function edit(id: string, content: string) {
    if (!content.trim()) return;
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, content: content.trim(), edited_at: new Date().toISOString() } : c)));
    await supabase.from('event_comments').update({ content: content.trim() }).eq('id', id);
  }

  async function remove(id: string) {
    setComments((prev) => prev.filter((c) => c.id !== id && c.parent_id !== id));
    await supabase.from('event_comments').delete().eq('id', id);
  }
  async function report(id: string) {
    await supabase.from('comment_reports').insert({ kind: 'event', comment_id: id });
  }

  return { comments, goingIds, send, edit, remove, report };
}
