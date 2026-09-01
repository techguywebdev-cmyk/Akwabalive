import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import OrganizerPageClient from '@/components/organizers/OrganizerPageClient';
import { fetchPublishedEvents, supabaseToGhanaEvent } from '@/lib/supabase/events';
import { BRAND_NAME } from '@/lib/theme';
import type { GhanaEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

function serverClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}) {
  return {
    title: `@${params.username} — Organizer · ${BRAND_NAME}`,
    description: `Events presented by @${params.username} on ${BRAND_NAME}.`,
  };
}

export default async function OrganizerPage({
  params,
}: {
  params: { username: string };
}) {
  const username = params.username.toLowerCase();
  const supabase = serverClient();

  const { data: prof } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, bio')
    .eq('username', username)
    .maybeSingle();

  if (!prof) notFound();

  const rows = await fetchPublishedEvents();
  const events: GhanaEvent[] = rows
    .filter((r) => r.organizer_id === prof.id)
    .map((r) => {
      const g = supabaseToGhanaEvent(r);
      return {
        ...g,
        organizerId: prof.id,
        organizerUsername: prof.username,
        organizerName: prof.full_name,
        organizerAvatar: prof.avatar_url,
      };
    })
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  return (
    <OrganizerPageClient
      organizer={{
        id: prof.id,
        username: prof.username,
        fullName: prof.full_name,
        avatarUrl: prof.avatar_url,
        bio: prof.bio,
      }}
      events={events}
    />
  );
}
