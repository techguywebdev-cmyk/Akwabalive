'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { Icon } from '@/components/ui/Icon';
import { T, FONT } from '@/lib/thiscene';

export interface Friend { id: string; username: string; name: string; avatar: string | null; hasTicket: boolean }

// One request per event per visit, shared by every strip that shows it
const cache = new Map<string, Promise<Friend[]>>();

function load(slug: string, token: string) {
  if (!cache.has(slug)) {
    cache.set(slug, fetch(`/api/events/friends?slug=${encodeURIComponent(slug)}`, { headers: { authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { friends: [] }))
      .then((j) => (j.friends ?? []) as Friend[])
      .catch(() => []));
  }
  return cache.get(slug)!;
}

const COLORS = ['#1F5A3F', '#3B2F5C', '#5C3A1F', '#1F3F5C', '#5C1F3A'];

function Avatar({ f, size, ring }: { f: Friend; size: number; ring: string }) {
  return (
    <span style={{ width: size, height: size, borderRadius: size / 2, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS[f.id.charCodeAt(0) % COLORS.length], color: 'rgba(255,255,255,0.9)', fontFamily: FONT.sans, fontSize: size * 0.38, fontWeight: 600, boxShadow: `0 0 0 2px ${ring}` }}>
      {f.avatar
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={f.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : (f.name?.[0] ?? '?').toUpperCase()}
    </span>
  );
}

function sentence(friends: Friend[]) {
  const ticketed = friends.filter((f) => f.hasTicket);
  const list = ticketed.length ? ticketed : friends;
  const first = list[0]?.name.split(' ')[0];
  const others = friends.length - 1;
  const verb = ticketed.length ? (ticketed.length === 1 && others === 0 ? 'has a ticket' : 'have tickets') : (others === 0 ? 'is going' : 'are going');
  return others > 0 ? `${first} and ${others} friend${others === 1 ? '' : 's'} ${verb}` : `${first} ${verb}`;
}

/**
 * People you follow who have tickets for (or are going to) an event, as a row of
 * round profile pictures. Shows nothing when you're signed out or nobody is going.
 *  - compact: overlapping faces + one line (feed cards, home hero)
 *  - full: a scrollable row with first names (event page)
 */
export default function FriendsStrip({ slug, variant = 'compact', enabled = true }: { slug: string; variant?: 'compact' | 'full'; enabled?: boolean }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    if (!user || !enabled) return;
    let live = true;
    createClient().auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      if (!token) return;
      load(slug, token).then((f) => { if (live) setFriends(f); });
    });
    return () => { live = false; };
  }, [user, slug, enabled]);

  if (!friends.length) return null;

  if (variant === 'compact') {
    const shown = friends.slice(0, 4);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ display: 'flex' }}>
          {shown.map((f, i) => <span key={f.id} style={{ marginLeft: i ? -8 : 0 }}><Avatar f={f} size={26} ring="rgba(3,8,6,0.9)" /></span>)}
        </span>
        <span style={{ fontFamily: FONT.sans, fontSize: 13, color: 'rgba(255,255,255,0.82)' }}>{sentence(friends)}</span>
      </div>
    );
  }

  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ margin: '0 0 12px', fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
        Friends going · {friends.length}
      </h2>
      <div className="no-scrollbar" style={{ display: 'flex', gap: 16, overflowX: 'auto', marginRight: -20, paddingRight: 20 }}>
        {friends.map((f) => (
          <Link key={f.id} href={`/u/${f.username}`} style={{ flex: '0 0 auto', width: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, textDecoration: 'none' }}>
            <span style={{ position: 'relative' }}>
              <Avatar f={f} size={56} ring={f.hasTicket ? T.mint : 'rgba(255,255,255,0.12)'} />
              {f.hasTicket && (
                <span title="Has a ticket" style={{ position: 'absolute', right: -3, bottom: -3, width: 22, height: 22, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.mint, color: T.onMint, boxShadow: '0 0 0 2px #030806' }}>
                  <Icon name="tickets" size={13} strokeWidth={2} />
                </span>
              )}
            </span>
            <span style={{ maxWidth: 60, fontFamily: FONT.sans, fontSize: 12, color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {f.name.split(' ')[0]}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
