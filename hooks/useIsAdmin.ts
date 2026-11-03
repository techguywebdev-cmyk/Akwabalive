'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';

let cached: { id: string; admin: boolean } | null = null;

/** True when the signed-in person is the Akwaaba admin (checked in the database) */
export function useIsAdmin() {
  const { user } = useAuth();
  const [admin, setAdmin] = useState(!!user && cached?.id === user.id ? cached.admin : false);
  useEffect(() => {
    if (!user) { setAdmin(false); return; }
    if (cached?.id === user.id) { setAdmin(cached.admin); return; }
    createClient().rpc('is_akwaaba_admin').then(({ data }) => {
      cached = { id: user.id, admin: data === true };
      setAdmin(cached.admin);
    });
  }, [user]);
  return admin;
}
