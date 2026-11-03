'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { T, FONT } from '@/lib/thiscene';

export type Person = { id: string; username: string; name: string; avatar: string | null; reason?: string };

export function PersonAvatar({ p, size }: { p: Pick<Person, 'name' | 'avatar'>; size: number }) {
  const initials = p.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return p.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.avatar} alt="" width={size} height={size} style={{ width: size, height: size, borderRadius: size / 2, objectFit: 'cover', flexShrink: 0, display: 'block' }} />
  ) : (
    <span aria-hidden style={{ width: size, height: size, borderRadius: size / 2, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(140deg, rgba(123,227,168,0.32), rgba(30,110,72,0.5))', color: T.mintText, fontFamily: FONT.display, fontWeight: 700, fontSize: size * 0.36 }}>{initials}</span>
  );
}

/** A person with a Follow button that works in place */
export default function PersonRow({ p, initiallyFollowing = false }: { p: Person; initiallyFollowing?: boolean }) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [busy, setBusy] = useState(false);
  async function toggle() {
    if (!user) { window.location.href = `/auth?next=${encodeURIComponent('/people')}`; return; }
    setBusy(true);
    const was = following;
    setFollowing(!was);
    const db = createClient();
    const { error } = was
      ? await db.from('follows').delete().eq('follower_id', user.id).eq('following_id', p.id)
      : await db.from('follows').insert({ follower_id: user.id, following_id: p.id });
    if (error) setFollowing(was);
    setBusy(false);
  }
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0' }}>
      <Link href={`/u/${p.username}`} style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0, textDecoration: 'none' }}>
        <PersonAvatar p={p} size={48} />
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 16, fontWeight: 600, color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
          <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 13.5, color: T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.reason ?? `@${p.username}`}</span>
        </span>
      </Link>
      {user?.id !== p.id && (
        <button type="button" onClick={toggle} disabled={busy} aria-pressed={following}
          style={{ height: 38, padding: '0 16px', borderRadius: 999, flexShrink: 0, cursor: 'pointer', fontFamily: FONT.display, fontSize: 14, fontWeight: 700,
            ...(following ? { background: 'transparent', color: T.white, border: '1px solid rgba(255,255,255,0.18)' } : { background: T.mint, color: T.onMint, border: 'none' }) }}>
          {following ? 'Following' : 'Follow'}
        </button>
      )}
    </li>
  );
}
