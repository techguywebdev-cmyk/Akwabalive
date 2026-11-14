'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/supabase/AuthProvider';
import Nav from '@/components/layout/Nav';
import EventForm, { emptyDraft } from '@/components/organizer/EventForm';
import { T, FONT, GRAD } from '@/lib/thiscene';

const NEXT = encodeURIComponent('/organizer/events/new');

export default function CreateEventPage() {
  const { user, loading } = useAuth();
  // No automatic bounce to the sign-in page: on a weak connection the session can take a moment to come back,
  // and a bounce then looks like being signed out. Signed-out people get a clear prompt instead.
  return (
    <div style={{ minHeight: '100vh' }}>
      <Nav active="Dashboard" back="/organizer/dashboard" />
      {user ? <EventForm mode="create" userId={user.id} initial={emptyDraft()} /> : (
        <main style={{ maxWidth: 520, margin: '0 auto', padding: 'calc(140px + env(safe-area-inset-top, 0px)) 24px 40px', textAlign: 'center' }}>
          {loading ? <p style={{ fontFamily: FONT.sans, fontSize: 15, color: T.text3 }}>One moment…</p> : (
            <>
              <h1 style={{ margin: 0, fontFamily: FONT.display, fontSize: 32, fontWeight: 800, letterSpacing: '-0.035em', color: T.white }}>List your event</h1>
              <p style={{ margin: '10px 0 0', fontFamily: FONT.sans, fontSize: 15.5, lineHeight: 1.55, color: T.text2 }}>Sign in or make a free account, then add your flyer, date and ticket code.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 26 }}>
                <Link href={`/auth?mode=signup&next=${NEXT}`} style={{ height: 52, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: GRAD.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 15.5, fontWeight: 700, textDecoration: 'none' }}>Create an account</Link>
                <Link href={`/auth?next=${NEXT}`} style={{ height: 52, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)', color: T.white, fontFamily: FONT.display, fontSize: 15.5, fontWeight: 700, textDecoration: 'none' }}>I already have one. Sign in</Link>
              </div>
            </>
          )}
        </main>
      )}
    </div>
  );
}
