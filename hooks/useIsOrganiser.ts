'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';

let cached: { id: string; yes: boolean } | null = null;

/** True when the signed-in person has created at least one event (drafts count), so they're an organiser */
export function useIsOrganiser() {
  const { user } = useAuth();
  const [yes, setYes] = useState(!!user && cached?.id === user.id ? cached.yes : false);
  useEffect(() => {
    if (!user) { setYes(false); return; }
    if (cached?.id === user.id && cached.yes) { setYes(true); return; }
    createClient().from('events').select('id', { count: 'exact', head: true }).eq('organizer_id', user.id).then(({ count }) => {
      cached = { id: user.id, yes: (count ?? 0) > 0 };
      setYes(cached.yes);
    });
  }, [user]);
  return yes;
}
