'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase/AuthProvider';

/** /u on its own: your own profile, or pick a username first, or sign in */
export default function MyProfile() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    const tab = window.location.search;
    if (!user) router.replace('/auth?next=/u');
    else if (profile?.username) router.replace(`/u/${profile.username}${tab}`);
    else if (profile) router.replace('/auth?pick=1');
  }, [user, profile, loading, router]);
  return <div style={{ minHeight: '100svh' }} />;
}
