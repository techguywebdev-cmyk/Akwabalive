import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import OrganizerPageClient from '@/components/organizers/OrganizerPageClient';
import { fetchPublishedEvents, supabaseToGhanaEvent } from '@/lib/supabase/events';
import { BRAND_NAME, C } from '@/lib/theme';
import type { GhanaEvent } from '@/lib/types';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';

export const dynamic = 'force-dynamic';

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
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
  const raw = decodeURIComponent(params.username || '').trim();
  const username = raw.toLowerCase();

  // Reserved — real app routes under /organizer/*
  if (['dashboard', 'events', 'new', 'from-link', 'review'].includes(username)) {
    return (
      <SoftMissing
        title="Not an organizer profile"
        body={`/${username} is part of the organizer tools, not a public profile.`}
      />
    );
  }

  const supabase = serverClient();
  if (!supabase) {
    return (
      <SoftMissing
        title="Configuration needed"
        body="Supabase env vars are missing on this deploy."
      />
    );
  }

  // Case-insensitive username match (DB may store mixed case)
  let prof: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
  } | null = null;

  const { data: exact } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, bio')
    .eq('username', raw)
    .maybeSingle();

  if (exact) {
    prof = exact;
  } else {
    const { data: lowered } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, bio')
      .ilike('username', username)
      .maybeSingle();
    prof = lowered;
  }

  if (!prof) {
    return (
      <SoftMissing
        title={`@${raw} not found`}
        body="No profile with that username. Organizer pages use the same username as the account profile (set under account / auth). Publish an event while logged in, then open /organizer/your-username."
      />
    );
  }

  const rows = await fetchPublishedEvents();
  const events: GhanaEvent[] = rows
    .filter((r) => r.organizer_id === prof!.id)
    .map((r) => {
      const g = supabaseToGhanaEvent(r);
      return {
        ...g,
        organizerId: prof!.id,
        organizerUsername: prof!.username,
        organizerName: prof!.full_name,
        organizerAvatar: prof!.avatar_url,
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

function SoftMissing({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <Nav active="Events" />
      <div
        style={{
          paddingTop: 120,
          maxWidth: 480,
          margin: '0 auto',
          padding: '120px 20px 80px',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-dm-mono,monospace)',
            fontSize: 8,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: C.gold,
            marginBottom: 12,
          }}
        >
          Organizer
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-cormorant,serif)',
            fontSize: 28,
            color: C.cream,
            fontWeight: 400,
            marginBottom: 12,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-inter,sans-serif)',
            fontSize: 14,
            color: C.c2,
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          {body}
        </p>
        <Link
          href="/events"
          style={{
            color: C.gold,
            fontFamily: 'var(--font-dm-mono,monospace)',
            fontSize: 9,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          ← Back to events
        </Link>
      </div>
      <Footer />
    </div>
  );
}
