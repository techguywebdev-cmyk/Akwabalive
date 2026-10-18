'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { GhanaEvent } from '@/lib/types';
import { isListedEvent } from '@/lib/types';
import { cityLabel, formatDistance } from '@/lib/utils';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { Icon } from '@/components/ui/Icon';
import RsvpSheet from '@/components/thiscene/RsvpSheet';
import { statusText } from '@/components/thiscene/dates';
import { parseDay, shortDay } from '@/lib/dates';
import { T, TYPE, SCRIM, RADIUS, FONT, alpha, ambient, cardTitleSize, glass } from '@/lib/thiscene';
import { type RGB, categoryAccent, eventAccent, resetPageAccent, setPageAccent, toHex } from '@/lib/events/accent';

export interface FeedItem { event: GhanaEvent; dist: number | null }

/** "Sat 14 Dec" */
function shortDate(e: GhanaEvent) {
  const d = parseDay(e.date);
  return d ? shortDay(d) : e.dateLabel || '';
}

const railBtn: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: 52, padding: 0,
  background: 'none', border: 'none', color: T.white, cursor: 'pointer', textDecoration: 'none',
  filter: 'drop-shadow(0 1px 6px rgba(0,0,0,0.45))',
};
const railLabel: React.CSSProperties = { fontFamily: FONT.sans, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.78)' };

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
  const tags = [event.category, statusText(event), event.badge ? event.badge.charAt(0) + event.badge.slice(1).toLowerCase() : '']
    .filter(Boolean)
    .filter((t, i, arr) => arr.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i)
    .slice(0, 3);
  const when = [shortDate(event), event.time?.toLowerCase()].filter(Boolean).join(' · ');
  const primary: React.CSSProperties = {
    height: 48, padding: '0 22px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', cursor: 'pointer',
    color: T.white, background: alpha(a, 0.2), border: `1px solid ${alpha(a, 0.6)}`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    fontFamily: FONT.display, fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap',
  };
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
            ref={(el) => {
              // The flyer can finish loading before React attaches onLoad (cached, or before hydration)
              if (el && el.complete && el.naturalWidth && !loaded) { setLoaded(true); setPortrait(el.naturalHeight > el.naturalWidth * 1.05); }
            }}
            onLoad={(e) => { setLoaded(true); setPortrait(e.currentTarget.naturalHeight > e.currentTarget.naturalWidth * 1.05); }}
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
          />
        </>
      )}

      {/* Scrims: fade into the green-black ground */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '22%', background: SCRIM.top, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '72%', background: SCRIM.bottom, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(90% 40% at 0% 100%, rgba(18,72,48,0.5) 0%, rgba(18,72,48,0) 70%)', pointerEvents: 'none' }} />
      {wide && <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '60%', background: 'linear-gradient(to right, rgba(3,8,6,0.8), rgba(3,8,6,0))', pointerEvents: 'none' }} />}

      {/* Centre play button — only when there's a promo video */}
      {event.promoVideoUrl && (
        <Link
          href={`/events/${event.slug}`}
          aria-label={`Watch the ${event.title} promo`}
          style={{ position: 'absolute', top: '40%', left: wide ? '30%' : '50%', transform: 'translate(-50%, -50%)', zIndex: 3, width: 68, height: 68, borderRadius: '50%', ...glass(true), display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="play" size={24} color="#fff" filled />
        </Link>
      )}

      {/* Bottom block: tags in the event colour, title with a soft glow, date, venue, actions */}
      <div
        style={{
          position: 'absolute', zIndex: 3, left: wide ? 40 : 20, bottom: `calc(${wide ? 40 : 108}px + env(safe-area-inset-bottom, 0px))`,
          right: wide ? undefined : 76, width: wide ? 'min(46%, 620px)' : undefined,
          opacity: active ? 1 : 0.4, transform: active ? 'translateY(0)' : 'translateY(18px)', transition: 'all 0.5s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14, fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: a }}>
          {tags.map((t, i) => (
            <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              {i > 0 && <span aria-hidden style={{ width: 3, height: 3, borderRadius: 2, background: a, opacity: 0.6 }} />}
              {t}
            </span>
          ))}
        </div>

        <Link href={`/events/${event.slug}`} style={{ textDecoration: 'none' }}>
          <h2 style={{ fontFamily: FONT.display, fontWeight: 800, lineHeight: 0.96, letterSpacing: '-0.035em', fontSize: wide ? Math.max(46, cardTitleSize(event.title, 72)) : cardTitleSize(event.title, 48), color: T.white, margin: '0 0 14px', textShadow: `0 0 42px ${alpha(a, 0.45)}, 0 2px 18px rgba(0,0,0,0.5)` }}>
            {event.title}
          </h2>
        </Link>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: overview ? 12 : 18 }}>
          <span style={{ fontFamily: FONT.sans, fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.92)' }}>{when}</span>
          <span style={{ fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>
            {[event.venue + (event.area ? `, ${event.area}` : ''), dist != null ? `${formatDistance(dist)} away` : ''].filter(Boolean).join(' · ')}
          </span>
        </div>

        {overview && (
          <p style={{ fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.55, color: T.text2, margin: '0 0 16px', ...(more ? {} : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }) }}>
            {overview}
            {overview.length > 110 && (
              <>
                {' '}
                <button type="button" onClick={() => setMore((m) => !m)} style={{ fontFamily: FONT.sans, fontSize: 14, fontWeight: 500, color: T.mintText, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                  {more ? 'Less' : 'More'}
                </button>
              </>
            )}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {free && !listed ? (
            <button type="button" onClick={() => onRsvp(a)} style={primary}>
              <span>{going ? "You're going" : 'RSVP'}</span>
              <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>Free</span>
            </button>
          ) : listed ? (
            <a href={event.ticketUrl!} target="_blank" rel="noopener noreferrer" style={primary}>
              <span>Get tickets</span>
              <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>{free ? 'Free' : `GH₵ ${event.price.toLocaleString()}`}</span>
            </a>
          ) : (
            <Link href={`/events/${event.slug}?tickets=1`} style={primary}>
              <span>Get tickets</span>
              <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>GH₵ {event.price.toLocaleString()}</span>
            </Link>
          )}
          <button
            type="button"
            onClick={onRemind}
            aria-label={reminded ? 'Saved — remove reminder' : 'Remind me'}
            aria-pressed={reminded}
            style={{ width: 48, height: 48, borderRadius: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: reminded ? T.mint : T.text, background: reminded ? 'rgba(123,227,168,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${reminded ? 'rgba(123,227,168,0.4)' : 'rgba(255,255,255,0.14)'}`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
          >
            <Icon name={reminded ? 'check' : 'bell'} size={21} />
          </button>
        </div>
      </div>

      {/* Action rail: plain icons with small labels, no boxes */}
      <div style={{ position: 'absolute', zIndex: 4, right: wide ? 28 : 12, bottom: `calc(${wide ? 40 : 250}px + env(safe-area-inset-bottom, 0px))`, display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', opacity: active ? 1 : 0, transform: active ? 'translateX(0)' : 'translateX(24px)', transition: 'all 0.45s ease 0.12s' }}>
        <button type="button" onClick={onGoing} aria-pressed={going} aria-label={going ? 'Not going' : "I'm going"} style={railBtn}>
          <Icon name="going" size={27} color={going ? a : T.white} strokeWidth={going ? 2 : 1.6} />
          <span style={railLabel}>{goingCount > 0 ? fmtCount(goingCount) : 'Going'}</span>
        </button>
        <button type="button" onClick={onShare} aria-label="Share" style={railBtn}>
          <Icon name="share" size={27} />
          <span style={railLabel}>Share</span>
        </button>
        <a href={maps} target="_blank" rel="noopener noreferrer" aria-label={`Map: ${event.venue}`} style={railBtn}>
          <Icon name="mapPin" size={27} />
          <span style={railLabel}>Map</span>
        </a>
        <Link href={`/events/${event.slug}`} aria-label="Details" style={railBtn}>
          <Icon name="info" size={27} />
          <span style={railLabel}>Details</span>
        </Link>
      </div>
    </section>
  );
}

/**
 * Full-screen events feed. One card per screen, vertical snap. The page stays
 * green-black; each card's colour only tints its tags, title glow and main button.
 */
export default function EventFeed({
  items, saved, onToggleSave, going, onToggleGoing, topInset, onShowAll, showAllLabel,
}: {
  items: FeedItem[];
  saved: Set<string>;
  saveLoading?: string | null;
  onToggleSave: (e: GhanaEvent) => void;
  going: Set<string>;
  onToggleGoing: (e: GhanaEvent) => void | Promise<void>;
  topInset: number;
  onShowAll?: () => void;
  showAllLabel?: string;
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
      <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: `${topInset + 20}px 24px 24px`, textAlign: 'center' }}>
        <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: T.white }}>Nothing matches yet</p>
        <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>Try another date, city or price.</p>
        {onShowAll && (
          <button type="button" onClick={onShowAll} style={{ marginTop: 14, height: 48, padding: '0 22px', borderRadius: 999, border: 'none', background: T.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            {showAllLabel ?? 'Show all dates'}
          </button>
        )}
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
