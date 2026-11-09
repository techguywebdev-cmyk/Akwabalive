'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';

/** How many notifications you haven't seen, kept live (for the dot on your profile button) */
export function useUnreadCount() {
  const { user } = useAuth();
  const db = useMemo(() => createClient(), []);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!user) { setN(0); return; }
    let live = true;
    const load = () => db.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('read_at', null)
      .then(({ count, error }) => { if (live && !error) setN(count ?? 0); });
    load();
    const ch = db.channel(`notif-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    // Pages mark things read; let the dot know
    const onRead = () => load();
    window.addEventListener('akw:notifications-read', onRead);
    return () => { live = false; db.removeChannel(ch); window.removeEventListener('akw:notifications-read', onRead); };
  }, [user, db]);
  return n;
}
