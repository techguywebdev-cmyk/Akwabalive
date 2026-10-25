'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import type { Moment } from '@/components/moments/types';
import { MOMENT_FIELDS, momentsForEvent, ytThumb } from '@/lib/moments/match';
import { T, FONT, EASE } from '@/lib/thiscene';

/* ── Data: every moment, loaded once per visit and shared ─────────────── */

let all: Promise<Moment[]> | null = null;
function loadAll(): Promise<Moment[]> {
  if (!all) {
    all = Promise.resolve(createClient().from('moments').select(MOMENT_FIELDS).order('year', { ascending: false }).limit(500))
      .then(({ data }) => (data ?? []) as Moment[])
      .catch(() => []);
  }
  return all;
}

/** Moments for one event (its own videos, then past editions). Empty until loaded. */
export function useEventMoments(event: { slug: string; title: string }, enabled = true) {
  const [list, setList] = useState<Moment[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    loadAll().then((m) => { if (live) setList(momentsForEvent(event, m)); });
    return () => { live = false; };
  }, [event.slug, event.title, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  return list;
}

const label = (list: Moment[], slug: string) => {
  const own = list[0]?.event_slug === slug;
  const year = list[0]?.year;
  return own ? 'Watch moments' : year ? `Watch ${year} moments` : 'Watch last edition';
};

/* ── Small pill on a feed card ─────────────────────────────────────── */

/** "▶ Watch 2025 moments · 3" with the first video's thumbnail. Nothing when there are none. */
export function MomentsPill({ list, slug, onOpen }: { list: Moment[]; slug: string; onOpen: () => void }) {
  if (!list.length) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${label(list, slug)}, ${list.length} video${list.length > 1 ? 's' : ''}`}
      style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 10, height: 44, padding: '0 14px 0 4px', borderRadius: 999, cursor: 'pointer', background: 'rgba(3,10,6,0.45)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', color: T.white }}
    >
      <span style={{ position: 'relative', width: 60, height: 36, borderRadius: 999, overflow: 'hidden', flexShrink: 0, background: '#000' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ytThumb(list[0].youtube_id)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="play" size={16} filled color={T.white} />
        </span>
      </span>
      <span style={{ fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 600 }}>{label(list, slug)}</span>
      {list.length > 1 && <span style={{ fontFamily: FONT.sans, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{list.length}</span>}
    </button>
  );
}

/* ── Rail on the event page ────────────────────────────────────────── */

export function MomentsRail({ list, onOpen }: { list: Moment[]; onOpen: (i: number) => void }) {
  if (!list.length) return null;
  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ margin: '0 0 12px', fontFamily: FONT.display, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>Moments</h2>
      <div className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', margin: '0 -20px', padding: '0 20px' }}>
        {list.map((m, i) => (
          <button key={m.id} type="button" onClick={() => onOpen(i)} aria-label={`Play ${m.title}`} style={{ flexShrink: 0, width: 220, padding: 0, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: T.white, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ position: 'relative', display: 'block', aspectRatio: '16 / 9', borderRadius: 16, overflow: 'hidden', background: '#000' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ytThumb(m.youtube_id, 'hq')} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.5))' }}>
                <span style={{ width: 44, height: 44, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}><Icon name="play" size={20} filled /></span>
              </span>
              {m.duration_label && <span style={{ position: 'absolute', right: 8, bottom: 8, padding: '2px 7px', borderRadius: 6, background: 'rgba(0,0,0,0.6)', fontFamily: FONT.sans, fontSize: 11.5, fontWeight: 600 }}>{m.duration_label}</span>}
            </span>
            <span style={{ fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{m.title}</span>
            {m.year && <span style={{ marginTop: -4, fontFamily: FONT.sans, fontSize: 12.5, color: T.text2 }}>{m.year}</span>}
          </button>
        ))}
      </div>
    </section>
  );
}

/* ── Player, over the page ─────────────────────────────────────────── */

/**
 * Watch an event's moments without leaving the page: the video plays in a dark layer
 * over the card, with the event's other clips underneath to switch between.
 */
export function MomentsViewer({ list, start = 0, eventTitle, onClose }: { list: Moment[]; start?: number; eventTitle: string; onClose: () => void }) {
  const [i, setI] = useState(start);
  const [shown, setShown] = useState(false);
  const m = list[i];

  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(t); document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  if (!m || typeof document === 'undefined') return null;

  // On top of everything (the feed cards are their own layer, below the header)
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Moments from ${eventTitle}`} style={{ position: 'fixed', inset: 0, zIndex: 340, background: 'rgba(1,4,3,0.96)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', opacity: shown ? 1 : 0, transform: shown ? 'none' : 'translateY(24px)', transition: `opacity 260ms ease, transform 320ms ${EASE.sheet}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(14px + env(safe-area-inset-top, 0px)) 16px 10px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.mintText }}>Moments{m.year ? ` · ${m.year}` : ''}</p>
          <p style={{ margin: '4px 0 0', fontFamily: FONT.display, fontSize: 17, fontWeight: 700, color: T.white, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</p>
        </div>
        <button type="button" aria-label="Close" onClick={onClose} style={{ width: 44, height: 44, borderRadius: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: T.white, cursor: 'pointer' }}>
          <Icon name="close" size={20} />
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0 8px' }}>
        <div style={{ width: '100%', maxWidth: 960, aspectRatio: '16 / 9', maxHeight: '100%', background: '#000' }}>
          <iframe
            key={m.youtube_id}
            title={m.title}
            src={`https://www.youtube.com/embed/${m.youtube_id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          />
        </div>
      </div>

      <div style={{ padding: '6px 0 calc(18px + env(safe-area-inset-bottom, 0px))' }}>
        {list.length > 1 && (
          <div className="no-scrollbar" style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 16px 14px' }}>
            {list.map((x, n) => (
              <button key={x.id} type="button" onClick={() => setI(n)} aria-label={`Play ${x.title}`} aria-current={n === i} style={{ flexShrink: 0, width: 132, padding: 0, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: T.white }}>
                <span style={{ display: 'block', aspectRatio: '16 / 9', borderRadius: 12, overflow: 'hidden', outline: n === i ? `2px solid ${T.mint}` : '1px solid rgba(255,255,255,0.1)', outlineOffset: n === i ? 2 : 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ytThumb(x.youtube_id)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: n === i ? 1 : 0.7 }} />
                </span>
                <span style={{ display: 'block', marginTop: 6, fontFamily: FONT.sans, fontSize: 12, fontWeight: 500, color: n === i ? T.white : T.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.year ? `${x.year} · ` : ''}{x.title}</span>
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Link href={`/moments?id=${m.id}`} style={{ fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 500, color: T.mintText, textDecoration: 'none' }}>
            Open in Moments for comments and more
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
