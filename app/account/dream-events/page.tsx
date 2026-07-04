'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Star, Trash2, Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import type { DreamEvent } from '@/lib/supabase/types';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import { events } from '@/lib/data/events';

const C = {
  bg: '#0D0B08', bg2: '#141109', bg3: '#1C1710',
  gold: '#C8922A', goldDim: 'rgba(200,146,42,0.14)', goldBd: 'rgba(200,146,42,0.28)',
  cream: '#F5ECD7', c2: 'rgba(245,236,215,0.55)', c3: 'rgba(245,236,215,0.24)',
  c4: 'rgba(245,236,215,0.08)', bd: 'rgba(245,236,215,0.07)',
  red: '#CE1126', greenL: '#4ade80',
};

export default function DreamEventsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = createClient();
  const [dreams,  setDreams]  = useState<DreamEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { window.location.href = '/auth'; return; }
    supabase
      .from('dream_events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setDreams((data ?? []) as DreamEvent[]); setLoading(false); });
  }, [user, authLoading]);

  async function removeDream(slug: string) {
    await supabase.from('dream_events').delete().eq('user_id', user!.id).eq('event_slug', slug);
    setDreams(d => d.filter(x => x.event_slug !== slug));
  }

  const matched = dreams.map(d => ({ dream: d, event: events.find(e => e.slug === d.event_slug) })).filter(x => x.event);

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <Nav active="Events" />
      <div style={{ paddingTop: 62, maxWidth: 680, margin: '0 auto', padding: '80px 20px 80px' }}>

        <div style={{ marginBottom: 28 }}>
          <Link href={`/u/${profile?.username ?? ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.c3, textDecoration: 'none', marginBottom: 20 }}>
            <ArrowLeft size={12} /> My Profile
          </Link>
          <h1 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 32, fontWeight: 300, color: C.cream, letterSpacing: '-1px', marginBottom: 6 }}>
            Dream List
          </h1>
          <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c3 }}>
            {dreams.length} event{dreams.length !== 1 ? 's' : ''} · friends can gift you tickets from this list
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: C.c3 }}>Loading…</p>
          </div>
        ) : matched.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Star size={40} style={{ color: C.c3, margin: '0 auto 16px', display: 'block', opacity: 0.4 }} />
            <p style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 24, color: C.c2, marginBottom: 8 }}>Your dream list is empty</p>
            <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c3, marginBottom: 20, maxWidth: 280, margin: '0 auto 20px', lineHeight: 1.6 }}>
              Pin events you want to attend. Friends who visit your profile can gift you a ticket from this list.
            </p>
            <Link href="/events" style={{ display: 'inline-block', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, textDecoration: 'none', border: `1px solid ${C.goldBd}`, padding: '11px 22px', borderRadius: 6, background: C.goldDim }}>
              Browse Events
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {matched.map(({ dream, event }) => event && (
              <div key={dream.id} style={{ background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 14, overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: 100, backgroundImage: `url(${event.image})`, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0, filter: 'brightness(0.6) saturate(0.75)' }} />
                <div style={{ flex: 1, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Star size={11} style={{ color: C.gold }} />
                    <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.gold }}>Dream Event</span>
                    <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1px', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 3, background: dream.is_public ? 'rgba(45,106,79,0.15)' : C.c4, color: dream.is_public ? C.greenL : C.c3, border: `1px solid ${dream.is_public ? 'rgba(45,106,79,0.3)' : C.bd}`, marginLeft: 'auto' }}>
                      {dream.is_public ? 'Public' : 'Private'}
                    </span>
                  </div>
                  <h4 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 18, fontWeight: 400, color: C.cream, lineHeight: 1.2, marginBottom: 4 }}>{event.title}</h4>
                  <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3, marginBottom: 12 }}>{event.dateLabel} · {event.venue}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 15, color: event.price === 0 ? C.greenL : C.cream }}>
                      {event.price === 0 ? 'Free' : `₵${event.price}`}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => removeDream(event.slug)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '1.5px', textTransform: 'uppercase', border: '1px solid rgba(206,17,38,0.2)', background: 'transparent', color: 'rgba(206,17,38,0.6)', padding: '7px 12px', borderRadius: 6, cursor: 'pointer' }}>
                        <Trash2 size={11} /> Remove
                      </button>
                      <Link href={`/events/${event.slug}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '1.5px', textTransform: 'uppercase', border: `1px solid ${C.goldBd}`, background: C.goldDim, color: C.gold, padding: '7px 12px', borderRadius: 6, textDecoration: 'none' }}>
                        View →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
