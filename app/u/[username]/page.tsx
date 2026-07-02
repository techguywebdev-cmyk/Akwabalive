'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Share2, UserPlus, UserCheck,
  Ticket, Lock, Star, Heart,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import type { Profile, Ticket as TicketType, DreamEvent } from '@/lib/supabase/types';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import { events } from '@/lib/data/events';

const C = {
  bg: '#0D0B08', bg2: '#141109', bg3: '#1C1710', bg4: '#242018',
  gold: '#C8922A', goldDim: 'rgba(200,146,42,0.14)', goldBd: 'rgba(200,146,42,0.28)',
  cream: '#F5ECD7', c2: 'rgba(245,236,215,0.55)', c3: 'rgba(245,236,215,0.24)',
  c4: 'rgba(245,236,215,0.08)', bd: 'rgba(245,236,215,0.07)', bd2: 'rgba(245,236,215,0.13)',
  red: '#CE1126', green: '#2D6A4F', greenL: '#4ade80',
};

type Tab = 'moments' | 'tickets' | 'dream';

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { user, profile: myProfile } = useAuth();
  const supabase = createClient();

  const [profile,        setProfile]        = useState<Profile | null>(null);
  const [tickets,        setTickets]        = useState<TicketType[]>([]);
  const [dreamEvents,    setDreamEvents]    = useState<DreamEvent[]>([]);
  const [followerCount,  setFollowerCount]  = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing,    setIsFollowing]    = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [tab,            setTab]            = useState<Tab>('moments');
  const [followLoading,  setFollowLoading]  = useState(false);

  const isOwnProfile = myProfile?.username === username;

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (!prof) { setLoading(false); return; }
      setProfile(prof as Profile);

      const [{ count: frs }, { count: fing }] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', prof.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', prof.id),
      ]);
      setFollowerCount(frs ?? 0);
      setFollowingCount(fing ?? 0);

      if (user) {
        const { data: followRow } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq('following_id', prof.id)
          .maybeSingle();
        setIsFollowing(!!followRow);
      }

      if (isOwnProfile || prof.is_public) {
        const { data: tix } = await supabase
          .from('tickets')
          .select('*')
          .eq('user_id', prof.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        setTickets((tix ?? []) as TicketType[]);
      }

      const { data: dreams } = await supabase
        .from('dream_events')
        .select('*')
        .eq('user_id', prof.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false });
      setDreamEvents((dreams ?? []) as DreamEvent[]);

      setLoading(false);
    }
    load();
  }, [username, user, isOwnProfile]);

  async function toggleFollow() {
    if (!user || !profile || isOwnProfile) return;
    setFollowLoading(true);
    if (isFollowing) {
      await supabase.from('follows').delete()
        .eq('follower_id', user.id).eq('following_id', profile.id);
      setIsFollowing(false);
      setFollowerCount(c => c - 1);
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: profile.id });
      setIsFollowing(true);
      setFollowerCount(c => c + 1);
    }
    setFollowLoading(false);
  }

  if (loading) return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <Nav active="Events" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: C.c3 }}>Loading…</p>
      </div>
    </div>
  );

  if (!profile) return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <Nav active="Events" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
        <p style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 28, color: C.c2 }}>User not found</p>
        <Link href="/events" style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, textDecoration: 'none', border: `1px solid ${C.goldBd}`, padding: '10px 20px', borderRadius: 6 }}>
          Browse Events
        </Link>
      </div>
    </div>
  );

  const attendedSlugs  = Array.from(new Set(tickets.map(t => t.event_slug)));
  const attendedEvents = attendedSlugs.map(s => events.find(e => e.slug === s)).filter(Boolean);
  const dreamMatched   = dreamEvents
    .map(d => ({ dream: d, event: events.find(e => e.slug === d.event_slug) }))
    .filter(x => x.event);

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <Nav active="Events" />
      <div style={{ paddingTop: 62 }}>

        {/* HEADER */}
        <div style={{ background: C.bg2, borderBottom: `1px solid ${C.bd}` }}>
          <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 0' }}>

            <Link href="/events" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.c3, textDecoration: 'none', marginBottom: 24 }}>
              <ArrowLeft size={12} /> Back
            </Link>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', flexShrink: 0, background: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-syne,sans-serif)', fontSize: 28, fontWeight: 700, color: '#0D0B08', overflow: 'hidden', border: `2px solid ${C.goldBd}` }}>
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (profile.username?.[0] ?? 'U').toUpperCase()
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 26, fontWeight: 400, color: C.cream, lineHeight: 1.1, marginBottom: 4 }}>
                  {profile.full_name ?? profile.username}
                </h1>
                <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 10, letterSpacing: '1px', color: C.c3, marginBottom: 8 }}>
                  @{profile.username}
                </p>
                {profile.bio && (
                  <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c2, lineHeight: 1.6 }}>{profile.bio}</p>
                )}
              </div>
              <button style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${C.bd}`, background: 'transparent', color: C.c3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Share2 size={15} />
              </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', marginBottom: 20, borderTop: `1px solid ${C.bd}`, borderBottom: `1px solid ${C.bd}`, padding: '14px 0' }}>
              {[
                { label: 'Events',    value: attendedEvents.length },
                { label: 'Followers', value: followerCount         },
                { label: 'Following', value: followingCount        },
                { label: 'Dreams',    value: dreamMatched.length   },
              ].map((stat, i) => (
                <div key={stat.label} style={{ flex: 1, textAlign: 'center', borderRight: i < 3 ? `1px solid ${C.bd}` : 'none' }}>
                  <p style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 24, fontWeight: 400, color: C.cream, lineHeight: 1, marginBottom: 4 }}>{stat.value}</p>
                  <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.c3 }}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              {isOwnProfile ? (
                <button style={{ flex: 1, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', border: `1px solid ${C.bd}`, color: C.c2, padding: 11, borderRadius: 8, background: 'transparent', cursor: 'pointer' }}>
                  Edit Profile
                </button>
              ) : user ? (
                <button onClick={toggleFollow} disabled={followLoading}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', border: `1px solid ${isFollowing ? C.bd : C.goldBd}`, background: isFollowing ? 'transparent' : C.goldDim, color: isFollowing ? C.c2 : C.gold, padding: 11, borderRadius: 8, cursor: 'pointer', transition: 'all 200ms' }}>
                  {isFollowing ? <><UserCheck size={13} /> Following</> : <><UserPlus size={13} /> Follow</>}
                </button>
              ) : (
                <Link href="/auth" style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', border: `1px solid ${C.goldBd}`, color: C.gold, padding: 11, borderRadius: 8, textDecoration: 'none', background: C.goldDim, display: 'block' }}>
                  Sign in to follow
                </Link>
              )}
              {!isOwnProfile && dreamMatched.length > 0 && (
                <button onClick={() => setTab('dream')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', border: '1px solid rgba(45,106,79,0.35)', background: 'rgba(45,106,79,0.1)', color: C.greenL, padding: '11px 16px', borderRadius: 8, cursor: 'pointer' }}>
                  <Heart size={13} /> Gift a ticket
                </button>
              )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${C.bd}` }}>
              {([
                { key: 'moments', label: 'Moments',   icon: '🎭' },
                { key: 'tickets', label: isOwnProfile ? 'My Tickets' : 'Events', icon: '🎟' },
                { key: 'dream',   label: 'Dream List', icon: '✨' },
              ] as { key: Tab; label: string; icon: string }[]).map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '1.5px', textTransform: 'uppercase', color: tab === t.key ? C.gold : C.c3, background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.key ? C.gold : 'transparent'}`, padding: '12px 0', cursor: 'pointer', transition: 'all 180ms' }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px 80px' }}>

          {/* MOMENTS TAB */}
          {tab === 'moments' && (
            attendedEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <p style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 22, color: C.c3, marginBottom: 8 }}>No moments yet</p>
                <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c3 }}>
                  {isOwnProfile ? 'Buy tickets to collect your event moments.' : 'No public events attended yet.'}
                </p>
                {isOwnProfile && (
                  <Link href="/events" style={{ display: 'inline-block', marginTop: 16, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, textDecoration: 'none', border: `1px solid ${C.goldBd}`, padding: '10px 20px', borderRadius: 6 }}>
                    Browse Events
                  </Link>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {attendedEvents.map(ev => ev && (
                  <Link key={ev.id} href={`/events/${ev.slug}`} style={{ display: 'block', borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.bd}`, background: C.bg2, textDecoration: 'none' }}>
                    <div style={{ position: 'relative', paddingTop: '60%', backgroundImage: `url(${ev.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${C.bg2} 0%, transparent 55%)` }} />
                      <span style={{ position: 'absolute', bottom: 8, left: 10, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 6.5, letterSpacing: '1px', textTransform: 'uppercase', padding: '3px 7px', borderRadius: 3, background: 'rgba(45,106,79,0.25)', color: C.greenL, border: '1px solid rgba(45,106,79,0.4)' }}>
                        ✓ Attended
                      </span>
                    </div>
                    <div style={{ padding: '10px 12px 12px' }}>
                      <h4 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 15, fontWeight: 400, color: C.cream, lineHeight: 1.2, marginBottom: 4 }}>{ev.title}</h4>
                      <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3 }}>{ev.dateLabel} · {ev.venue}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )
          )}

          {/* TICKETS TAB */}
          {tab === 'tickets' && (
            !isOwnProfile && !profile.is_public ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <Lock size={32} style={{ color: C.c3, margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 22, color: C.c3 }}>Private profile</p>
              </div>
            ) : tickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <Ticket size={32} style={{ color: C.c3, margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 22, color: C.c3, marginBottom: 8 }}>No tickets yet</p>
                {isOwnProfile && (
                  <Link href="/events" style={{ display: 'inline-block', marginTop: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, textDecoration: 'none', border: `1px solid ${C.goldBd}`, padding: '10px 20px', borderRadius: 6 }}>
                    Find Events
                  </Link>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tickets.map(ticket => {
                  const ev = events.find(e => e.slug === ticket.event_slug);
                  return (
                    <div key={ticket.id} style={{ background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 12, overflow: 'hidden', display: 'flex' }}>
                      {ev && <div style={{ width: 80, backgroundImage: `url(${ev.image})`, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0, filter: 'brightness(0.65)' }} />}
                      <div style={{ flex: 1, padding: '14px 16px' }}>
                        <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.gold, marginBottom: 4 }}>{ticket.ticket_tier}</p>
                        <h4 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 16, fontWeight: 400, color: C.cream, lineHeight: 1.2, marginBottom: 4 }}>{ticket.event_title}</h4>
                        <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3, marginBottom: 10 }}>{ticket.event_date} · {ticket.event_venue}</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                          <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 13, color: ticket.total_paid === 0 ? C.greenL : C.cream }}>
                            {ticket.total_paid === 0 ? 'FREE' : `₵${ticket.total_paid}`}
                          </span>
                          {ticket.gifted_by && (
                            <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1px', textTransform: 'uppercase', color: C.greenL, background: 'rgba(45,106,79,0.15)', border: '1px solid rgba(45,106,79,0.3)', padding: '3px 8px', borderRadius: 3 }}>
                              🎁 Gifted
                            </span>
                          )}
                          <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1px', textTransform: 'uppercase', color: ticket.status === 'active' ? C.greenL : C.c3, background: ticket.status === 'active' ? 'rgba(45,106,79,0.15)' : C.c4, border: `1px solid ${ticket.status === 'active' ? 'rgba(45,106,79,0.3)' : C.bd}`, padding: '3px 8px', borderRadius: 3 }}>
                            {ticket.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* DREAM LIST TAB */}
          {tab === 'dream' && (
            dreamMatched.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <Star size={32} style={{ color: C.c3, margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 22, color: C.c3, marginBottom: 8 }}>
                  {isOwnProfile ? 'Your dream list is empty' : 'No dream events yet'}
                </p>
                <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c3, maxWidth: 280, margin: '0 auto 16px', lineHeight: 1.6 }}>
                  {isOwnProfile
                    ? 'Pin events you want to attend — friends can gift you tickets from this list.'
                    : "This user hasn't added any dream events yet."}
                </p>
                {isOwnProfile && (
                  <Link href="/events" style={{ display: 'inline-block', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, textDecoration: 'none', border: `1px solid ${C.goldBd}`, padding: '10px 20px', borderRadius: 6 }}>
                    Browse Events
                  </Link>
                )}
              </div>
            ) : (
              <>
                {!isOwnProfile && (
                  <div style={{ background: 'rgba(45,106,79,0.1)', border: '1px solid rgba(45,106,79,0.25)', borderRadius: 10, padding: '14px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Heart size={16} style={{ color: C.greenL, flexShrink: 0 }} />
                    <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c2, lineHeight: 1.5 }}>
                      Gift <strong style={{ color: C.cream }}>{profile.full_name ?? profile.username}</strong> a ticket to one of their dream events.
                    </p>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {dreamMatched.map(({ dream, event }) => event && (
                    <div key={dream.id} style={{ background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 12, overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: 90, backgroundImage: `url(${event.image})`, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0, filter: 'brightness(0.65)' }} />
                      <div style={{ flex: 1, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                          <Star size={11} style={{ color: C.gold }} />
                          <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.gold }}>Dream Event</span>
                        </div>
                        <h4 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 16, fontWeight: 400, color: C.cream, lineHeight: 1.2, marginBottom: 4 }}>{event.title}</h4>
                        <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3, marginBottom: 10 }}>{event.dateLabel} · {event.venue}</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 13, color: C.cream }}>
                            {event.price === 0
                              ? <span style={{ color: C.greenL, fontSize: 10, letterSpacing: '2px' }}>FREE</span>
                              : `₵${event.price}`}
                          </span>
                          {isOwnProfile ? (
                            <Link href={`/events/${event.slug}`} style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, textDecoration: 'none', border: `1px solid ${C.goldBd}`, padding: '6px 12px', borderRadius: 5 }}>
                              View Event
                            </Link>
                          ) : (
                            <Link href={`/events/${event.slug}`} style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '2px', textTransform: 'uppercase', color: '#0D0B08', textDecoration: 'none', background: C.gold, padding: '7px 14px', borderRadius: 5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                              🎁 Gift Ticket
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
