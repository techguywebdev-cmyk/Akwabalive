'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import Nav from '@/components/layout/Nav';
import EventForm, { to24h, type EventDraft } from '@/components/organizer/EventForm';
import { majorArtists } from '@/lib/data/artists';
import { T, FONT } from '@/lib/thiscene';

export default function EditEventPage({ params }: { params: { id: string } }) {
  const { user, loading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { window.location.href = `/auth?next=${encodeURIComponent(`/organizer/events/${params.id}`)}`; return; }
    supabase.from('events').select('*, ticket_tiers(*)').eq('id', params.id).eq('organizer_id', user.id).maybeSingle().then(({ data: e }) => {
      if (!e) { setMissing(true); return; }
      const majorNames = new Set(majorArtists.map((a) => a.name.toLowerCase()));
      const slugs: string[] = Array.isArray(e.artist_slugs) ? e.artist_slugs : [];
      const extras = (Array.isArray(e.lineup) ? e.lineup : []).filter((n: string) => !majorNames.has(n.toLowerCase()));
      setDraft({
        id: e.id, status: e.status ?? 'draft',
        title: e.title ?? '', description: e.description ?? '', category: e.category ?? '',
        city: e.city ?? 'accra', venue: e.venue ?? '', area: e.area ?? '',
        date: (e.date ?? '').slice(0, 10), start: to24h(e.time), end: to24h(e.end_time),
        image: e.image_url ?? '',
        listing: e.listing_type === 'listed' ? 'listed' : 'hosted', ticketUrl: e.ticket_url ?? '', ticketSource: e.ticket_source ?? '',
        lineup: { enabled: slugs.length > 0 || extras.length > 0, artistSlugs: slugs, extraNames: extras.join(', ') },
        tiers: [...(e.ticket_tiers ?? [])].sort((a: any, b: any) => a.price - b.price).map((t: any) => ({ id: t.id, name: t.name, price: String(t.price), quantity: String(t.quantity), description: t.description ?? '', sold: t.sold ?? 0 })),
      });
    });
  }, [loading, user, params.id, supabase]);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Nav active="Dashboard" back={`/organizer/events/${params.id}/manage`} />
      {missing ? (
        <main style={{ maxWidth: 560, margin: '0 auto', padding: '120px 20px', textAlign: 'center' }}>
          <p style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 700, color: T.white }}>We couldn’t find that event in your account.</p>
          <Link href="/organizer/dashboard" style={{ color: T.mintText, fontFamily: FONT.sans }}>Back to dashboard</Link>
        </main>
      ) : draft && user ? <EventForm mode="edit" userId={user.id} initial={draft} /> : null}
    </div>
  );
}
