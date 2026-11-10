'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';

const VISITOR = 'akw-visitor', PENDING = 'akw-ref-pending';
const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

/**
 * Counts people who arrive on someone's shared link (?by=username), and credits that sharer when the visitor
 * later signs in. Draws nothing.
 */
export default function RefTracker() {
  const { user, profile } = useAuth();

  // Arriving on a shared link
  useEffect(() => {
    const by = new URLSearchParams(window.location.search).get('by')?.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 40);
    if (!by) return;
    let visitor = get(VISITOR);
    if (!visitor) { visitor = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64); set(VISITOR, visitor); }
    if (profile?.username && profile.username === by) return; // your own link
    createClient().from('share_visits').insert({ by_username: by, path: window.location.pathname.slice(0, 200), visitor })
      .then(({ error }) => { if (!error || error.code === '23505') set(PENDING, '1'); });
  }, [profile?.username]);

  // Signed in after arriving from someone's link: count them as joined
  useEffect(() => {
    if (!user) return;
    const visitor = get(VISITOR);
    if (!visitor || !get(PENDING)) return;
    createClient().rpc('claim_share_visits', { p_visitor: visitor }).then(({ error }) => { if (!error) { try { localStorage.removeItem(PENDING); } catch { /* fine */ } } });
  }, [user]);

  return null;
}
