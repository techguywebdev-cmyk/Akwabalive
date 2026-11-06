'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import type { GhanaEvent } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { T, FONT } from '@/lib/thiscene';

type Kind = 'ticket' | 'going' | 'saved';
const ghDay = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10); // Ghana is on UTC

/**
 * "Tidal Rave is tomorrow": a slim reminder at the top of the list (a pill in the header on the feed) when a show you have a ticket for, said you're going to,
 * or saved is today or tomorrow. Dismissed per show per day.
 */
export default function ShowNudge({ events, compact = false }: {
  events: GhanaEvent[];
  /** In the swipe feed: a small pill in the middle of the header row, so it never sits on a flyer */
  compact?: boolean;
}) {
  const { user } = useAuth();
  const [mine, setMine] = useState<Record<string, Kind>>({});
  const [hidden, setHidden] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setMine({}); return; }
    let live = true;
    const db = createClient();
    Promise.all([
      db.from('tickets').select('event_slug').eq('user_id', user.id).eq('status', 'active'),
      db.from('event_attendance').select('event_slug').eq('user_id', user.id).eq('status', 'going'),
      db.from('dream_events').select('event_slug').eq('user_id', user.id),
    ]).then(([t, g, s]) => {
      if (!live) return;
      const out: Record<string, Kind> = {};
      (s.data ?? []).forEach((r: any) => { out[r.event_slug] = 'saved'; });
      (g.data ?? []).forEach((r: any) => { out[r.event_slug] = 'going'; });
      (t.data ?? []).forEach((r: any) => { out[r.event_slug] = 'ticket'; });
      setMine(out);
    }).catch(() => {});
    return () => { live = false; };
  }, [user]);

  const next = useMemo(() => {
    const today = ghDay(0), tomorrow = ghDay(1);
    const rank: Record<Kind, number> = { ticket: 0, going: 1, saved: 2 };
    return events
      .filter((e) => mine[e.slug] && (e.date === today || e.date === tomorrow))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)) || rank[mine[a.slug]] - rank[mine[b.slug]])[0] ?? null;
  }, [events, mine]);

  const key = next ? `ak-nudge-${next.slug}-${ghDay(0)}` : '';
  useEffect(() => {
    if (!key) return;
    try { setHidden(localStorage.getItem(key) ? key : null); } catch { setHidden(null); }
  }, [key]);

  if (!next || hidden === key) return null;
  const kind = mine[next.slug];
  const when = next.date === ghDay(0) ? 'today' : 'tomorrow';
  const time = next.time && !/tba/i.test(next.time) ? ` · ${next.time}` : '';
  const action = kind === 'ticket' ? { href: '/account/tickets', label: 'Your ticket' } : { href: `/events/${next.slug}`, label: kind === 'saved' ? 'Get tickets' : 'Details' };
  const dismiss = () => { try { localStorage.setItem(key, '1'); } catch { /* private mode */ } setHidden(key); };

  if (compact) {
    return (
      <Link href={action.href} onClick={dismiss} aria-label={`${next.title} is ${when}. ${action.label}`} style={{ position: 'fixed', zIndex: 205, top: 'calc(17px + env(safe-area-inset-top, 0px))', left: 72, maxWidth: 'calc(100vw - 200px)', height: 38, padding: '0 14px 0 11px', borderRadius: 19, display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0D1210', border: '1px solid rgba(123,227,168,0.4)', textDecoration: 'none', boxShadow: '0 8px 22px rgba(0,0,0,0.4)' }}>
        <span aria-hidden style={{ width: 7, height: 7, borderRadius: 4, flexShrink: 0, background: T.mint, boxShadow: `0 0 8px ${T.mint}` }} />
        <span style={{ minWidth: 0, fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ color: T.mintText }}>{when === 'today' ? 'Today' : 'Tomorrow'}</span> · {next.title}
        </span>
      </Link>
    );
  }

  return (
    <div role="status" style={{ margin: '0 0 22px', display: 'flex', alignItems: 'center', gap: 10, minHeight: 60, padding: '8px 6px 8px 14px', borderRadius: 18, background: '#0D1210', border: '1px solid rgba(123,227,168,0.35)', boxShadow: '0 14px 34px rgba(0,0,0,0.5)' }}>
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: 4, flexShrink: 0, background: T.mint, boxShadow: `0 0 10px ${T.mint}` }} />
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 700, color: T.mintText }}>{when === 'today' ? 'Today' : 'Tomorrow'}{time}</span>
        <span style={{ fontFamily: FONT.sans, fontSize: 14.5, fontWeight: 600, color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{next.title}</span>
      </span>
      <Link href={action.href} style={{ flexShrink: 0, height: 36, padding: '0 14px', borderRadius: 18, display: 'inline-flex', alignItems: 'center', background: T.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 13.5, fontWeight: 700, textDecoration: 'none' }}>{action.label}</Link>
      <button type="button" onClick={dismiss} aria-label="Dismiss" style={{ flexShrink: 0, width: 32, height: 32, border: 'none', background: 'none', color: T.text2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={17} /></button>
    </div>
  );
}
