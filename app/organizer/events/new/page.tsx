'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/supabase/AuthProvider';
import Nav from '@/components/layout/Nav';
import EventForm, { emptyDraft } from '@/components/organizer/EventForm';

export default function CreateEventPage() {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && !user) window.location.href = `/auth?next=${encodeURIComponent('/organizer/events/new')}`;
  }, [loading, user]);
  return (
    <div style={{ minHeight: '100vh' }}>
      <Nav active="Dashboard" back="/organizer/dashboard" />
      {user && <EventForm mode="create" userId={user.id} initial={emptyDraft()} />}
    </div>
  );
}
