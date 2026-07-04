'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, UserPlus, CheckCircle, X, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import type { Profile } from '@/lib/supabase/types';

const C = {
  bg: '#0D0B08', bg2: '#141109', bg3: '#1C1710',
  gold: '#C8922A', goldDim: 'rgba(200,146,42,0.14)', goldBd: 'rgba(200,146,42,0.28)',
  cream: '#F5ECD7', c2: 'rgba(245,236,215,0.55)', c3: 'rgba(245,236,215,0.24)',
  c4: 'rgba(245,236,215,0.08)', bd: 'rgba(245,236,215,0.07)', bd2: 'rgba(245,236,215,0.13)',
  greenL: '#4ade80', greenDim: 'rgba(45,106,79,0.15)', greenBd: 'rgba(45,106,79,0.35)',
};

interface GoingWithProps {
  eventSlug: string;
  eventTitle: string;
}

export default function GoingWith({ eventSlug, eventTitle }: GoingWithProps) {
  const { user, profile } = useAuth();
  const supabase = createClient();

  const [isGoing,       setIsGoing]       = useState(false);
  const [goingCount,    setGoingCount]    = useState(0);
  const [goingProfiles, setGoingProfiles] = useState<Profile[]>([]);
  const [followers,     setFollowers]     = useState<Profile[]>([]);
  const [showInvite,    setShowInvite]    = useState(false);
  const [invited,       setInvited]       = useState<Set<string>>(new Set());
  const [loading,       setLoading]       = useState(true);
  const [toast,         setToast]         = useState('');

  useEffect(() => {
    loadAttendance();
  }, [eventSlug, user]);

  async function loadAttendance() {
    setLoading(true);

    // Get all public attendees
    const { data: attendees } = await supabase
      .from('event_attendance')
      .select('user_id')
      .eq('event_slug', eventSlug)
      .eq('status', 'going')
      .eq('is_public', true);

    setGoingCount(attendees?.length ?? 0);

    if (attendees && attendees.length > 0) {
      const ids = attendees.map(a => a.user_id).slice(0, 8);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', ids);
      setGoingProfiles((profiles ?? []) as Profile[]);
    }

    // Check if current user is going
    if (user) {
      const { data: myAttendance } = await supabase
        .from('event_attendance')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_slug', eventSlug)
        .maybeSingle();
      setIsGoing(!!myAttendance);

      // Load followers for invite list
      const { data: followData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followData && followData.length > 0) {
        const followingIds = followData.map(f => f.following_id);
        const { data: followingProfiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', followingIds);
        setFollowers((followingProfiles ?? []) as Profile[]);
      }
    }
    setLoading(false);
  }

  async function toggleGoing() {
    if (!user) { window.location.href = '/auth'; return; }
    if (isGoing) {
      await supabase
        .from('event_attendance')
        .delete()
        .eq('user_id', user.id)
        .eq('event_slug', eventSlug);
      setIsGoing(false);
      setGoingCount(c => Math.max(0, c - 1));
      setGoingProfiles(p => p.filter(x => x.id !== user.id));
    } else {
      await supabase.from('event_attendance').upsert({
        user_id:   user.id,
        event_slug: eventSlug,
        status:    'going',
        is_public: true,
      }, { onConflict: 'user_id,event_slug' });
      setIsGoing(true);
      setGoingCount(c => c + 1);
      if (profile) setGoingProfiles(p => [profile, ...p].slice(0, 8));
    }
  }

  function sendInvite(followProfile: Profile) {
    // In production this would send a push notification / in-app message
    setInvited(prev => new Set([...prev, followProfile.id]));
    showToastMsg(`Invite sent to @${followProfile.username}`);
  }

  function showToastMsg(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  if (loading) return null;

  return (
    <div style={{ marginTop: 36 }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 600, background: C.bg2, border: `1px solid ${C.bd2}`, borderRadius: 10, padding: '12px 20px', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.cream, whiteSpace: 'nowrap', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          {toast}
        </div>
      )}

      <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'block', width: 16, height: 1, background: C.gold }} />
        Who&apos;s going
      </p>

      {/* Going count + avatars */}
      <div style={{ background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 14, padding: '18px 20px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: goingProfiles.length > 0 ? 16 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={16} style={{ color: C.gold }} />
            <span style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 18, color: C.cream }}>
              {goingCount === 0 ? 'Be the first to go' : `${goingCount} ${goingCount === 1 ? 'person' : 'people'} going`}
            </span>
          </div>
          <button
            onClick={toggleGoing}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase',
              border: `1px solid ${isGoing ? C.greenBd : C.goldBd}`,
              background: isGoing ? C.greenDim : C.goldDim,
              color: isGoing ? C.greenL : C.gold,
              padding: '10px 16px', borderRadius: 8, cursor: 'pointer', transition: 'all 200ms',
            }}
          >
            {isGoing ? <><CheckCircle size={13} /> Going!</> : <><Users size={13} /> I&apos;m Going</>}
          </button>
        </div>

        {/* Avatar stack */}
        {goingProfiles.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {goingProfiles.slice(0, 6).map((p, i) => (
              <Link key={p.id} href={`/u/${p.username}`}
                title={`@${p.username}`}
                style={{ display: 'block', width: 34, height: 34, borderRadius: '50%', border: `2px solid ${C.bg2}`, background: C.gold, marginLeft: i === 0 ? 0 : -10, zIndex: 6 - i, overflow: 'hidden', flexShrink: 0, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-syne,sans-serif)', fontSize: 12, fontWeight: 700, color: '#0D0B08' }}>
                {p.avatar_url
                  ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (p.username?.[0] ?? 'U').toUpperCase()
                }
              </Link>
            ))}
            {goingCount > 6 && (
              <div style={{ width: 34, height: 34, borderRadius: '50%', border: `2px solid ${C.bg2}`, background: C.bg3, marginLeft: -10, zIndex: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, color: C.c3 }}>
                +{goingCount - 6}
              </div>
            )}
            {goingProfiles.length > 0 && (
              <p style={{ marginLeft: 14, fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: C.c3 }}>
                {goingProfiles[0].full_name ?? `@${goingProfiles[0].username}`}
                {goingCount > 1 && ` and ${goingCount - 1} other${goingCount - 1 > 1 ? 's' : ''}`} going
              </p>
            )}
          </div>
        )}
      </div>

      {/* Invite followers */}
      {user && followers.length > 0 && (
        <div style={{ background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 14, overflow: 'hidden' }}>
          <button
            onClick={() => setShowInvite(v => !v)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserPlus size={15} style={{ color: C.gold }} />
              <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.c2 }}>
                Invite friends · {followers.length} following
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, color: C.c3 }}>
              {showInvite ? '▲' : '▼'}
            </span>
          </button>

          {showInvite && (
            <div style={{ borderTop: `1px solid ${C.bd}`, padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {followers.map(f => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Link href={`/u/${f.username}`} style={{ width: 36, height: 36, borderRadius: '50%', background: C.gold, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-syne,sans-serif)', fontSize: 14, fontWeight: 700, color: '#0D0B08', textDecoration: 'none', overflow: 'hidden' }}>
                    {f.avatar_url ? <img src={f.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (f.username?.[0] ?? 'U').toUpperCase()}
                  </Link>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.cream, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.full_name ?? f.username}
                    </p>
                    <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, color: C.c3 }}>@{f.username}</p>
                  </div>
                  <button
                    onClick={() => sendInvite(f)}
                    disabled={invited.has(f.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '1.5px', textTransform: 'uppercase', border: `1px solid ${invited.has(f.id) ? C.greenBd : C.goldBd}`, background: invited.has(f.id) ? C.greenDim : C.goldDim, color: invited.has(f.id) ? C.greenL : C.gold, padding: '8px 12px', borderRadius: 6, cursor: invited.has(f.id) ? 'default' : 'pointer', transition: 'all 200ms', flexShrink: 0 }}>
                    {invited.has(f.id) ? <><CheckCircle size={11} /> Invited</> : <><Send size={11} /> Invite</>}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Prompt non-logged-in users */}
      {!user && goingCount > 0 && (
        <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: C.c3, marginTop: 8 }}>
          <Link href="/auth" style={{ color: C.gold, textDecoration: 'none', fontWeight: 600 }}>Sign in</Link> to mark yourself as going and invite friends
        </p>
      )}
    </div>
  );
}
