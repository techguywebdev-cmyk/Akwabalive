'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Share2, Check, X } from 'lucide-react';
import Nav from '@/components/layout/Nav';
import PersonRow, { type Person } from '@/components/social/PersonRow';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { T, FONT, GROUND } from '@/lib/thiscene';
import { BTN } from '@/components/events/CardParts';

const label: React.CSSProperties = { margin: '28px 0 6px', fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' };

/** Find friends: search by name or @username, suggestions, and an invite link */
export default function PeoplePage() {
  const { user, profile } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Person[] | null>(null);
  const [suggested, setSuggested] = useState<Person[] | null>(null);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  // Who I already follow, so search results show the right button
  useEffect(() => {
    if (!user) return;
    supabase.from('follows').select('following_id').eq('follower_id', user.id).limit(2000)
      .then(({ data }) => setFollowing(new Set((data ?? []).map((r: { following_id: string }) => r.following_id))));
  }, [user, supabase]);

  useEffect(() => {
    if (!user) { setSuggested([]); return; }
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      if (!token) { setSuggested([]); return; }
      fetch('/api/people/suggest', { headers: { authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : { people: [] })).then((j) => setSuggested(j.people ?? [])).catch(() => setSuggested([]));
    });
  }, [user, supabase]);

  // Search as you type (names and usernames)
  useEffect(() => {
    const term = q.trim().replace(/^@/, '').replace(/[,()%*\\]/g, '').slice(0, 40);
    if (term.length < 2) { setResults(null); return; }
    let live = true;
    const t = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('id, username, full_name, avatar_url')
        .or(`username.ilike.%${term}%,full_name.ilike.%${term}%`).not('username', 'is', null).limit(25);
      if (!live) return;
      setResults((data ?? []).filter((p) => p.id !== user?.id).map((p) => ({ id: p.id, username: p.username, name: p.full_name?.trim() || p.username, avatar: p.avatar_url })));
    }, 220);
    return () => { live = false; clearTimeout(t); };
  }, [q, supabase, user]);

  async function invite() {
    const url = profile?.username ? `${location.origin}/u/${profile.username}` : location.origin;
    const text = 'I’m on Akwaaba — follow me to see what I’m going to this season.';
    try {
      if (navigator.share) { await navigator.share({ title: 'Akwaaba', text, url }); return; }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    } catch { /* cancelled */ }
  }

  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed' }}>
      <Nav back={profile?.username ? `/u/${profile.username}` : '/'} tabs />
      <main style={{ maxWidth: 640, margin: '0 auto', padding: 'calc(76px + env(safe-area-inset-top, 0px)) 20px 120px' }}>
        <h1 style={{ margin: '0 0 6px', fontFamily: FONT.display, fontSize: 34, fontWeight: 800, letterSpacing: '-0.035em', color: T.white }}>Find friends</h1>
        <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.5, color: T.text2 }}>Follow friends to see who’s going where, right on every event.</p>

        <label style={{ position: 'relative', display: 'block', marginTop: 22 }}>
          <span style={{ position: 'absolute', left: 16, top: 0, bottom: 0, display: 'flex', alignItems: 'center', color: T.text3 }}><Search size={18} /></span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search names or @usernames" aria-label="Search people" autoComplete="off"
            style={{ width: '100%', boxSizing: 'border-box', height: 52, padding: '0 44px 0 46px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: 'none', color: T.white, fontFamily: FONT.sans, fontSize: 16, outline: 'none' }} />
          {q && <button type="button" onClick={() => setQ('')} aria-label="Clear" style={{ position: 'absolute', right: 8, top: 8, width: 36, height: 36, borderRadius: 18, border: 'none', background: 'transparent', color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>}
        </label>

        {results ? (
          <>
            <p style={label}>Results</p>
            {results.length
              ? <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{results.map((p) => <PersonRow key={p.id} p={p} initiallyFollowing={following.has(p.id)} />)}</ul>
              : <p style={{ fontFamily: FONT.sans, fontSize: 15, color: T.text2 }}>No one called “{q.trim()}” yet. Invite them below.</p>}
          </>
        ) : !user ? (
          <div style={{ marginTop: 28, padding: 20, borderRadius: 20, background: T.surface, border: 'none' }}>
            <p style={{ margin: '0 0 14px', fontFamily: FONT.sans, fontSize: 15, color: T.text }}>Sign in to follow friends and see suggestions.</p>
            <Link href="/auth?next=%2Fpeople" style={BTN.primary}>Sign in</Link>
          </div>
        ) : (
          <>
            <p style={label}>Suggested for you</p>
            {!suggested ? <p style={{ fontFamily: FONT.sans, color: T.text3 }}>Loading…</p>
              : suggested.length
                ? <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{suggested.map((p) => <PersonRow key={p.id} p={p} />)}</ul>
                : <p style={{ fontFamily: FONT.sans, fontSize: 15, color: T.text2 }}>No suggestions yet. Say you’re going to a few events and they’ll appear.</p>}
          </>
        )}

        <div style={{ marginTop: 28, padding: 20, borderRadius: 20, background: 'linear-gradient(140deg, rgba(123,227,168,0.14), rgba(123,227,168,0.04))', border: 'none'}}>
          <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 18, fontWeight: 700, color: T.white }}>Bring your crew</p>
          <p style={{ margin: '6px 0 14px', fontFamily: FONT.sans, fontSize: 14.5, lineHeight: 1.5, color: T.text2 }}>Send your profile link on WhatsApp. When friends follow you, you’ll see each other on the events you’re going to.</p>
          <button type="button" onClick={invite} style={BTN.primary}>{copied ? <><Check size={18} /> Link copied</> : <><Share2 size={18} /> Invite friends</>}</button>
        </div>
      </main>
    </div>
  );
}
