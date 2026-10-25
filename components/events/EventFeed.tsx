'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { GhanaEvent } from '@/lib/types';
import { isListedEvent } from '@/lib/types';
import { cityLabel, formatDistance } from '@/lib/utils';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { Icon } from '@/components/ui/Icon';
import GlassPill, { Capsule } from '@/components/thiscene/GlassPill';
import RsvpSheet from '@/components/thiscene/RsvpSheet';
import { dateSlot, statusText } from '@/components/thiscene/dates';
import { T, TYPE, SCRIM, RADIUS, alpha, ambient, cardTitleSize, glass } from '@/lib/thiscene';
import { type RGB, categoryAccent, eventAccent, resetPageAccent, setPageAccent, toHex } from '@/lib/events/accent';

export interface FeedItem { event: GhanaEvent; dist: number | null }

const fmtCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k` : String(n));

/* ── Thiscene Card: one event, full screen ─────────────────────────── */
function EventCard({
  item, active, near, wide, reminded, going, onRemind, onGoing, onShare, onRsvp, topInset,
}: {
  item: FeedItem; active: boolean; near: boolean; wide: boolean;
  reminded: boolean; going: boolean;
  onRemind: () => void; onGoing: () => void; onShare: () => void; onRsvp: (accent: string) => void;
  topInset: number;
}) {
  const { event, dist } = item;
  const [rgb, setRgb] = useState<RGB>(categoryAccent(event.category));
  const [loaded, setLoaded] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [more, setMore] = useState(false);

  useEffect(() => {
    if (!near) return;
    let live = true;
    eventAccent(event.image, event.category).then((c) => { if (live) setRgb(c); });
    return () => { live = false; };
  }, [near, event.image, event.category]);

  const a = toHex(rgb);
  const listed = isListedEvent(event) && !!event.ticketUrl;
  const free = event.price === 0;
  const showWhole = wide && portrait; // portrait flyer on a wide screen: show it whole, don't crop
  const overview = [event.lineup?.length ? `With ${event.lineup.join(', ')}.` : '', event.description || ''].filter(Boolean).join(' ');
  const goingCount = (event.attending ?? 0) + (going ? 1 : 0);
  const maps = event.lat && event.lng
    ? `https://www.google.com/maps/search/?api=1&query=${event.lat},${event.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue}, ${cityLabel(event.city)}`)}`;

  return (
    <section
      aria-label={event.title}
      style={{ position: 'relative', width: '100%', height: '100svh', overflow: 'hidden', background: ambient(a), color: T.text, scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
    >
      {/* Art */}
      {near && (
        <>
          <div
            style={{
              position: 'absolute',
              ...(showWhole ? { top: 76, bottom: 32, right: '4%', width: '46%', borderRadius: RADIUS.card, overflow: 'hidden' } : { inset: 0 }),
              backgroundImage: `url(${event.image})`, backgroundSize: showWhole ? 'contain' : 'cover',
              backgroundRepeat: 'no-repeat', backgroundPosition: showWhole ? 'center' : 'center top',
              opacity: loaded ? (active ? 1 : 0.7) : 0, transition: 'opacity 0.6s ease',
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.image}
            alt=""
            onLoad={(e) => { setLoaded(true); setPortrait(e.currentTarget.naturalHeight > e.currentTarget.naturalWidth * 1.05); }}
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
          />
        </>
      )}

      {/* Scrims */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '25%', background: SCRIM.top, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '75%', background: SCRIM.bottom, pointerEvents: 'none' }} />
      {wide && <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '60%', background: 'linear-gradient(to right, rgba(0,0,0,0.75), rgba(0,0,0,0))', pointerEvents: 'none' }} />}

      {/* 1 · Header row of glass capsules */}
      <div style={{ position: 'absolute', top: topInset, left: 16, right: 16, display: 'flex', gap: 8, zIndex: 3, opacity: active ? 1 : 0.5, transition: 'opacity 0.4s ease' }}>
        <Capsule><span style={{ width: 5, height: 5, borderRadius: '50%', background: a }} />{statusText(event)}</Capsule>
        <Capsule accent={a} accentBorder>{free ? 'Free' : `GH₵ ${event.price.toLocaleString()}`}</Capsule>
        {dist != null && <Capsule>{formatDistance(dist)} away</Capsule>}
      </div>

      {/* 2 · Centre play button — only when there's a promo video */}
      {event.promoVideoUrl && (
        <Link
          href={`/events/${event.slug}`}
          aria-label={`Watch the ${event.title} promo`}
          style={{ position: 'absolute', top: '42%', left: wide ? '30%' : '50%', transform: 'translate(-50%, -50%)', zIndex: 3, width: 68, height: 68, borderRadius: '50%', ...glass(true), border: `1.5px solid ${alpha(a, 0.55)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="play" size={22} color="#fff" filled />
        </Link>
      )}

      {/* 3 · Bottom block */}
      <div
        style={{
          position: 'absolute', zIndex: 3, left: wide ? 40 : 18, bottom: `calc(${wide ? 36 : 20}px + env(safe-area-inset-bottom, 0px))`,
          right: wide ? undefined : 66, width: wide ? 'min(46%, 620px)' : undefined,
          opacity: active ? 1 : 0.4, transform: active ? 'translateY(0)' : 'translateY(18px)', transition: 'all 0.5s ease',
        }}
      >
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {[event.category, event.badge].filter(Boolean).filter((t, i, arr) => arr.indexOf(t) === i).map((t) => (
            <span key={t} style={{ ...TYPE.eyebrow, fontSize: 9, color: a, padding: '3px 8px', border: `1px solid ${alpha(a, 0.22)}`, borderRadius: RADIUS.tag }}>{t}</span>
          ))}
        </div>

        <Link href={`/events/${event.slug}`} style={{ textDecoration: 'none' }}>
          <h2 style={{ ...TYPE.cardTitle, fontSize: cardTitleSize(event.title, wide ? 64 : 50), color: T.white, margin: '0 0 7px', textShadow: `0 0 50px ${alpha(a, 0.16)}` }}>
            {event.title}
          </h2>
        </Link>

        {/* Meta: date in the year's slot, venue in the meta slot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: TYPE.stat.fontFamily, fontWeight: 700, fontSize: 13, color: alpha(a, 0.73) }}>{dateSlot(event)}</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }} />
          <span style={{ ...TYPE.meta, color: T.text3 }}>{event.venue}{event.area ? `, ${event.area}` : ''} · {event.time}</span>
        </div>

        {overview && (
          <p style={{ ...TYPE.body, color: T.text2, margin: '0 0 14px', ...(more ? {} : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }) }}>
            {overview}
          </p>
        )}
        {overview.length > 110 && (
          <button type="button" onClick={() => setMore((m) => !m)} style={{ ...TYPE.meta, fontWeight: 700, color: T.text, background: 'none', border: 'none', padding: 0, margin: '-8px 0 14px', cursor: 'pointer' }}>
            {more ? 'Show less' : 'Read more'}
          </button>
        )}

        {/* Pills, side by side */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {free && !listed ? (
            <GlassPill variant="primary" accent={a} compact={!wide} onClick={() => onRsvp(a)}>
              <Icon name="ticket" size={17} /> {going ? "You're going" : 'RSVP'}
            </GlassPill>
          ) : (
            <GlassPill variant="primary" accent={a} compact={!wide} href={listed ? event.ticketUrl! : `/events/${event.slug}?tickets=1`} external={listed}>
              <Icon name="ticket" size={17} /> Get tickets
            </GlassPill>
          )}
          <GlassPill variant="secondary" compact={!wide} onClick={onRemind}>
            <Icon name={reminded ? 'check' : 'bell'} size={16} color={reminded ? T.success : '#fff'} />
            <span style={{ color: reminded ? T.success : undefined }}>{reminded ? 'Saved' : 'Remind me'}</span>
          </GlassPill>
        </div>
      </div>

      {/* 4 · Action rail: round glass buttons */}
      <div style={{ position: 'absolute', zIndex: 4, right: wide ? 28 : 12, bottom: `calc(${wide ? 36 : 150}px + env(safe-area-inset-bottom, 0px))`, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', opacity: active ? 1 : 0, transform: active ? 'translateX(0)' : 'translateX(24px)', transition: 'all 0.45s ease 0.12s' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <GlassPill variant="round" accent={a} active={going} label={going ? 'Not going' : "I'm going"} onClick={onGoing}>
            <Icon name="heart" size={19} filled={going} color={going ? a : '#fff'} />
          </GlassPill>
          {goingCount > 0 && <span style={{ ...TYPE.meta, fontSize: 11, color: T.text2 }}>{fmtCount(goingCount)}</span>}
        </div>
        <GlassPill variant="round" label="Share" onClick={onShare}><Icon name="share" size={18} color="#fff" /></GlassPill>
        <GlassPill variant="round" label={`Map: ${event.venue}`} href={maps} external><Icon name="mapPin" size={18} color="#fff" /></GlassPill>
        <GlassPill variant="round" label="Details" href={`/events/${event.slug}`}><Icon name="info" size={18} color="#fff" /></GlassPill>
      </div>
    </section>
  );
}

/**
 * Full-screen events feed on the Thiscene Card. One card per screen, vertical snap;
 * the active card's accent drives the page's ambient gradient.
 */
export default function EventFeed({
  items, saved, onToggleSave, going, onToggleGoing, topInset, onShowAll,
}: {
  items: FeedItem[];
  saved: Set<string>;
  saveLoading?: string | null;
  onToggleSave: (e: GhanaEvent) => void;
  going: Set<string>;
  onToggleGoing: (e: GhanaEvent) => void | Promise<void>;
  topInset: number;
  onShowAll?: () => void;
}) {
  const { user } = useAuth();
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [wide, setWide] = useState(false);
  const [toast, setToast] = useState('');
  const [rsvp, setRsvp] = useState<{ event: GhanaEvent; accent: string } | null>(null);
  const hasItems = items.length > 0;

  useEffect(() => {
    const fn = () => setWide(window.innerWidth >= 900);
    fn();
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  useEffect(() => {
    if (!hasItems) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [hasItems]);
  useEffect(() => () => resetPageAccent(), []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => setActive(Math.round(el.scrollTop / Math.max(1, el.clientHeight)));
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [hasItems]);

  const listKey = items.map((i) => i.event.slug).join('|');
  useEffect(() => { scroller.current?.scrollTo({ top: 0 }); setActive(0); }, [listKey]);

  // The live accent follows the active card
  const current = items[Math.min(active, items.length - 1)]?.event;
  useEffect(() => {
    if (!current) return;
    let live = true;
    const cat = categoryAccent(current.category);
    setPageAccent(cat, cat);
    eventAccent(current.image, current.category).then((c) => { if (live) setPageAccent(c, c); });
    return () => { live = false; };
  }, [current?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (rsvp) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const el = scroller.current;
      if (!el) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); el.scrollBy({ top: el.clientHeight, behavior: 'smooth' }); }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); el.scrollBy({ top: -el.clientHeight, behavior: 'smooth' }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rsvp]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2200); };
  const share = useCallback(async (e: GhanaEvent) => {
    const url = `${window.location.origin}/events/${e.slug}`;
    try {
      if (navigator.share) { await navigator.share({ title: e.title, text: `${e.title} — ${e.dateLabel} · ${e.venue}`, url }); return; }
    } catch (err: any) { if (err?.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(url); flash('Link copied'); } catch { flash('Could not share — copy the link from the address bar.'); }
  }, []);

  if (!hasItems) {
    return (
      <div style={{ minHeight: '62vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: `${topInset}px 24px 24px`, textAlign: 'center' }}>
        <p style={{ ...TYPE.eyebrow, color: 'rgb(var(--accent-rgb))' }}>Nothing on</p>
        <p style={{ ...TYPE.sheetTitle, color: T.text }}>No events match</p>
        <p style={{ ...TYPE.body, color: T.text2 }}>Try another date, city or price.</p>
        {onShowAll && <div style={{ marginTop: 8 }}><GlassPill variant="primary" accent="#F5A623" onClick={onShowAll}>Show all dates</GlassPill></div>}
      </div>
    );
  }

  return (
    <>
      <div
        ref={scroller}
        className="no-scrollbar"
        style={{ position: 'fixed', inset: 0, zIndex: 40, overflowY: 'auto', overflowX: 'hidden', scrollSnapType: 'y mandatory', overscrollBehavior: 'contain', background: T.bg }}
      >
        {items.map((item, i) => (
          <EventCard
            key={item.event.slug}
            item={item}
            active={i === active}
            near={Math.abs(i - active) <= 2}
            wide={wide}
            reminded={saved.has(item.event.slug)}
            going={going.has(item.event.slug)}
            onRemind={() => onToggleSave(item.event)}
            onGoing={() => onToggleGoing(item.event)}
            onShare={() => share(item.event)}
            onRsvp={(accent) => setRsvp({ event: item.event, accent })}
            topInset={topInset}
          />
        ))}
      </div>

      {rsvp && (
        <RsvpSheet
          event={rsvp.event}
          accent={rsvp.accent}
          user={user}
          alreadyGoing={going.has(rsvp.event.slug)}
          onGoing={async () => { if (!going.has(rsvp.event.slug)) await onToggleGoing(rsvp.event); }}
          onClose={() => setRsvp(null)}
        />
      )}

      {toast && (
        <div role="status" style={{ position: 'fixed', zIndex: 320, left: '50%', top: '52%', transform: 'translateX(-50%)', ...glass(true), borderRadius: RADIUS.pill, padding: '9px 16px', ...TYPE.meta, fontWeight: 700, color: T.white, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </>
  );
}
