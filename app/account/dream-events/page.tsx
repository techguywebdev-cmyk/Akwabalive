'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { GROUND } from '@/lib/thiscene';

/** The old Dream List now lives on your profile, under Saved */
export default function DreamEventsPage() {
  const { user, profile, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    if (!user) { window.location.replace(`/auth?next=${encodeURIComponent('/account/dream-events')}`); return; }
    if (profile?.username) window.location.replace(`/u/${profile.username}?tab=saved`);
  }, [user, profile, loading]);
  return <div style={{ minHeight: '100svh', background: GROUND }} />;
}
