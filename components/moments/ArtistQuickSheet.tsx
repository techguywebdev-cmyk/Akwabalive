'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ArrowRight, CalendarDays, MapPin, Play } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { eventMatchesArtist, getArtistBySlug } from '@/lib/data/artists';
import { events as staticEvents } from '@/lib/data/events';
import { FollowPill, Portrait } from '@/components/artists/parts';
import { parseDay, shortDay } from '@/lib/dates';
import { T, FONT, EASE } from '@/lib/thiscene';

type NextShow = { slug: string; title: string; date: string; venue: string | null; city: string | null };
type Clip = { id: string; title: string; youtube_id: string; event_name: string; year: number | null };

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Tap a face under "On stage": who they are, follow them, their next show, and more of their moments —
 * without leaving the feed.
 */
export default function ArtistQuickSheet({ slug, name, photo, currentId, onClose }: {
  slug: string; name: string; photo: string | null; currentId: string; onClose: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const artist = getArtistBySlug(slug);
  const [shown, setShown] = useState(false);
  const [nextShow, setNextShow] = useState<NextShow | null | undefined>(undefined);
  const [clips, setClips] = useState<Clip[]>([]);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); };
  }, []);

  useEffect(() => {
    if (!artist) return;
    let cancelled = false;
    (async () => {
      const [{ data: evs }, { data: ms }] = await Promise.all([
        supabase.from('events').select('slug, title, date, venue, city, lineup, artist_slugs').eq('status', 'published').gte('date', today()).order('date').limit(120),
        supabase.from('moments').select('id, title, youtube_id, event_name, year').eq('status', 'live').contains('performers', [slug])
          .order('published_at', { ascending: false, nullsFirst: false }).limit(12),
      ]);
      if (cancelled) return;
      type Row = { slug: string; title: string; date: string; venue: string | null; city: string | null; lineup: string[] | null; artist_slugs: string[] | null };
      const live = ((evs ?? []) as Row[]).find((e) => eventMatchesArtist({ title: e.title, badge: '', description: '', lineup: e.lineup ?? undefined, artistSlugs: e.artist_slugs ?? undefined } as Parameters<typeof eventMatchesArtist>[0], artist));
      const local = staticEvents.filter((e) => e.date >= today()).sort((a, b) => a.date.localeCompare(b.date)).find((e) => eventMatchesArtist(e, artist));
      const pick = [live, local].filter(Boolean).sort((a, b) => a!.date.localeCompare(b!.date))[0];
      setNextShow(pick ? { slug: pick.slug, title: pick.title, date: pick.date, venue: pick.venue ?? null, city: pick.city ?? null } : null);
      setClips(((ms ?? []) as Clip[]).filter((c) => c.id !== currentId));
    })();
    return () => { cancelled = true; };
  }, [supabase, slug, artist, currentId]);

  const day = nextShow ? parseDay(nextShow.date) : null;

  return createPortal(
    <div role="dialog" aria-modal aria-label={name} style={{ position: 'fixed', inset: 0, zIndex: 330 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', opacity: shown ? 1 : 0, transition: 'opacity 280ms ease' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, maxWidth: 560, margin: '0 auto', maxHeight: '86svh', overflowY: 'auto',
        background: 'linear-gradient(180deg, #121614 0%, #0A0C0B 100%)', borderRadius: '26px 26px 0 0', borderTop: `1px solid ${T.hairlineStrong}`,
        padding: '10px 20px calc(22px + env(safe-area-inset-bottom, 0px))', transform: shown ? 'none' : 'translateY(100%)', transition: `transform 420ms ${EASE.sheet}`,
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 18px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Portrait name={name} url={photo} size={76} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: T.white }}>{name}</h2>
            {artist?.genre && <p style={{ margin: '3px 0 0', fontFamily: FONT.sans, fontSize: 14, color: T.text3 }}>{artist.genre}</p>}
          </div>
          <FollowPill kind="artist" slug={slug} label={name} />
        </div>

        {/* Next show */}
        <p style={{ margin: '24px 0 10px', fontFamily: FONT.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.text3 }}>Next show</p>
        {nextShow ? (
          <Link href={`/events/${nextShow.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', textDecoration: 'none' }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 16, fontWeight: 700, color: T.white, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nextShow.title}</span>
              <span style={{ display: 'flex', gap: 12, marginTop: 4, fontFamily: FONT.sans, fontSize: 13, color: T.text2 }}>
                {day && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', flexShrink: 0 }}><CalendarDays size={13} />{shortDay(day)}</span>}
                {(nextShow.venue || nextShow.city) && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><MapPin size={13} />{nextShow.venue ?? nextShow.city}</span>}
              </span>
            </span>
            <span style={{ height: 36, padding: '0 14px', borderRadius: 999, background: T.mint, color: T.onMint, display: 'inline-flex', alignItems: 'center', fontFamily: FONT.sans, fontSize: 13, fontWeight: 700 }}>Tickets</span>
          </Link>
        ) : (
          <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 14, color: T.text3 }}>
            {nextShow === undefined ? 'Looking…' : `No show announced yet. Follow ${name} and we’ll tell you when there is.`}
          </p>
        )}

        {/* More of their moments */}
        {clips.length > 0 && (
          <>
            <p style={{ margin: '24px 0 10px', fontFamily: FONT.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.text3 }}>More moments</p>
            <div className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', marginRight: -20, paddingRight: 20 }}>
              {clips.map((c) => (
                <a key={c.id} href={`/moments?id=${c.id}`} style={{ width: 168, flexShrink: 0, textDecoration: 'none' }}>
                  <span style={{ position: 'relative', display: 'block', aspectRatio: '16 / 9', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://i.ytimg.com/vi/${c.youtube_id}/mqdefault.jpg`} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <span style={{ position: 'absolute', left: 8, bottom: 8, width: 26, height: 26, borderRadius: 13, background: 'rgba(0,0,0,0.6)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: T.white }}><Play size={12} fill={T.white} /></span>
                  </span>
                  <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: 6, fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, lineHeight: 1.3, color: T.text } as React.CSSProperties}>{c.title}</span>
                </a>
              ))}
            </div>
          </>
        )}

        <Link href={`/artists/${slug}`} style={{ marginTop: 24, height: 48, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, color: T.white }}>
          Open {name}’s page <ArrowRight size={16} />
        </Link>
      </div>
    </div>,
    document.body,
  );
}
