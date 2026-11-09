'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Heart, MessageSquareText, Reply, Star, Ticket } from 'lucide-react';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { T, FONT, GROUND, GRAD, BTN } from '@/lib/thiscene';

type Note = {
  id: string; kind: 'calendar_like' | 'calendar_rating' | 'calendar_comment' | 'comment_reply' | 'tickets_out'; created_at: string; read_at: string | null; stars: number | null; event_slug: string | null;
  profiles: { username: string | null; full_name: string | null; avatar_url: string | null } | null;
  calendars: { slug: string; title: string } | null;
  calendar_comments: { content: string } | null;
};

const ago = (iso: string) => {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const ICON = { calendar_like: Heart, calendar_rating: Star, calendar_comment: MessageSquareText, comment_reply: Reply, tickets_out: Ticket } as const;

/** What people did with your calendars and comments: likes, stars, comments and replies, newest first */
export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const db = useMemo(() => createClient(), []);
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [shows, setShows] = useState<Record<string, { title: string; image_url: string | null }>>({});

  useEffect(() => {
    if (!user) return;
    let live = true;
    db.from('notifications')
      .select('id, kind, created_at, read_at, stars, event_slug, profiles!notifications_actor_profile_fkey(username, full_name, avatar_url), calendars(slug, title), calendar_comments(content)')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(80)
      .then(async ({ data }) => {
        if (!live) return;
        const list = (data ?? []) as unknown as Note[];
        setNotes(list);
        // Shows named in "tickets are out" notifications
        const slugs = Array.from(new Set(list.map((n) => n.event_slug).filter(Boolean))) as string[];
        if (slugs.length) {
          const { data: ev } = await db.from('events').select('slug, title, image_url').in('slug', slugs);
          if (live) setShows(Object.fromEntries(((ev ?? []) as { slug: string; title: string; image_url: string | null }[]).map((e) => [e.slug, e])));
        }
        // Seeing them counts as read
        if ((data ?? []).some((n: { read_at: string | null }) => !n.read_at)) {
          await db.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null);
          window.dispatchEvent(new Event('akw:notifications-read'));
        }
      });
    return () => { live = false; };
  }, [user, db]);

  const line = (n: Note) => {
    const who = n.profiles?.full_name || n.profiles?.username || 'Someone';
    const cal = n.calendars?.title ?? 'your calendar';
    const b = (t: string) => <b style={{ color: T.white, fontWeight: 700 }}>{t}</b>;
    switch (n.kind) {
      case 'calendar_like': return <>{b(who)} liked your calendar {b(cal)}</>;
      case 'calendar_rating': return <>{b(who)} rated {b(cal)} {n.stars}★</>;
      case 'calendar_comment': return <>{b(who)} commented on {b(cal)}</>;
      case 'comment_reply': return <>{b(who)} replied to your comment on {b(cal)}</>;
      case 'tickets_out': return <>Tickets are out for {b(shows[n.event_slug ?? '']?.title ?? 'a show you’re waiting on')}</>;
    }
  };

  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed' }}>
      <Nav back="/" />
      <main style={{ maxWidth: 640, margin: '0 auto', padding: 'calc(100px + env(safe-area-inset-top, 0px)) 20px 60px' }}>
        <h1 style={{ margin: 0, fontFamily: FONT.display, fontSize: 'clamp(34px, 9vw, 48px)', fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.02, background: GRAD.text, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>Notifications</h1>

        {!loading && !user && (
          <div style={{ marginTop: 22 }}>
            <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 16, color: T.text2 }}>Sign in to see who liked and commented on your calendars.</p>
            <Link href="/auth?next=/notifications" style={{ ...BTN.primary, marginTop: 18, height: 50, padding: '0 22px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', textDecoration: 'none', fontSize: 15 }}>Sign in</Link>
          </div>
        )}

        {notes && !notes.length && (
          <div style={{ marginTop: 22 }}>
            <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 16, lineHeight: 1.55, color: T.text2 }}>Nothing yet. Share one of your calendars, or tap “Notify me when tickets drop” on a show, and updates land here.</p>
            <Link href="/calendars" style={{ ...BTN.primary, marginTop: 18, height: 50, padding: '0 22px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', textDecoration: 'none', fontSize: 15 }}>Your calendars</Link>
          </div>
        )}

        {notes && notes.length > 0 && (
          <ul style={{ listStyle: 'none', margin: '24px 0 0', padding: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 4 }}>
            {notes.map((n) => {
              const I = ICON[n.kind];
              const name = n.profiles?.full_name || n.profiles?.username || '?';
              return (
                <li key={n.id}>
                  <Link href={n.kind === 'tickets_out' && n.event_slug ? `/events/${n.event_slug}` : n.calendars ? `/c/${n.calendars.slug}${n.kind === 'calendar_comment' || n.kind === 'comment_reply' ? '?comments=1' : ''}` : '#'}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 12px', margin: '0 -12px', borderRadius: 16, textDecoration: 'none', background: n.read_at ? 'transparent' : 'rgba(123,227,168,0.07)' }}>
                    <span style={{ position: 'relative', flexShrink: 0 }}>
                      {n.kind === 'tickets_out' && shows[n.event_slug ?? '']?.image_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={shows[n.event_slug ?? '']!.image_url!} alt="" width={44} height={44} style={{ width: 44, height: 44, borderRadius: 14, objectFit: 'cover', display: 'block' }} />
                        : n.profiles?.avatar_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={n.profiles.avatar_url} alt="" width={44} height={44} style={{ width: 44, height: 44, borderRadius: 14, objectFit: 'cover', display: 'block' }} />
                        : <span style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#26302B', color: '#D6FBE6', fontFamily: FONT.display, fontSize: 17, fontWeight: 800 }}>{name.charAt(0).toUpperCase()}</span>}
                      <span style={{ position: 'absolute', right: -5, bottom: -5, width: 22, height: 22, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: GRAD.mint, color: T.onMint, boxShadow: '0 0 0 3px #0B110E' }}>
                        <I size={12} strokeWidth={2.6} fill={n.kind === 'calendar_like' || n.kind === 'calendar_rating' ? 'currentColor' : 'none'} />
                      </span>
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 14.5, lineHeight: 1.45, color: T.text2 }}>{line(n)}</span>
                      {n.calendar_comments?.content && (
                        <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: 4, fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.45, color: T.text }}>“{n.calendar_comments.content}”</span>
                      )}
                      <span style={{ display: 'block', marginTop: 4, fontFamily: FONT.sans, fontSize: 12.5, color: T.text3 }}>{ago(n.created_at)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  );
}
