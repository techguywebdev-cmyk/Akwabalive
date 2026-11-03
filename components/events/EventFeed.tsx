'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { GhanaEvent } from '@/lib/types';
import { cityLabel, formatDistance } from '@/lib/utils';
import { useAuth } from '@/lib/supabase/AuthProvider';
import RsvpSheet from '@/components/thiscene/RsvpSheet';
import PaystackCheckout from '@/components/payment/PaystackCheckout';
import FlyerCanvas from '@/components/events/FlyerCanvas';
import FriendsStrip from '@/components/social/FriendsStrip';
import { useEventMoments, MomentsPill, MomentsViewer } from '@/components/moments/EventMoments';
import { TicketsSheet, ticketsLabel } from '@/components/events/EventActions';
import { EventTags, BTN } from '@/components/events/CardParts';
import { hypeTags, eventExcerpt } from '@/lib/events/hype';
import { statusText } from '@/components/thiscene/dates';
import { parseDay, shortDay } from '@/lib/dates';
import { splitEventTitle, eventBlurb } from '@/lib/events/title';
import { type CheckoutTier } from '@/lib/events/tiers';
import { Heart, Share2 } from 'lucide-react';
import { isListedEvent } from '@/lib/types';
import { T, TYPE, RADIUS, FONT, alpha, ambient, glass } from '@/lib/thiscene';
import { type RGB, categoryAccent, eventAccent, resetPageAccent, setPageAccent, toHex } from '@/lib/events/accent';

export interface FeedItem { event: GhanaEvent; dist: number | null }

/** "Sat 14 Dec" */
function shortDate(e: GhanaEvent) {
  const d = parseDay(e.date);
  return d ? shortDay(d) : e.dateLabel || '';
}

const fmtCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k` : String(n));

export const mapsLink = (e: GhanaEvent) => (e.lat && e.lng
  ? `https://www.google.com/maps/search/?api=1&query=${e.lat},${e.lng}`
  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${e.venue}, ${cityLabel(e.city)}`)}`);

/* ── Title clean-up ──────────────────────────────────────────────────── */
const SMALL = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with', 'x']);
/** 'ANNUAL GHANA HOLIDAY TOUR' → 'Annual Ghana Holiday Tour' (short words like DJ, VIP, II stay as they are) */
function calmCase(t: string) {
  const letters = t.replace(/[^A-Za-z]/g, '');
  if (letters.length < 8 || letters.replace(/[^A-Z]/g, '').length / letters.length < 0.7) return t;
  return t.split(/(\s+)/).map((w, i) => {
    if (/^\s+$/.test(w)) return w;
    const bare = w.replace(/[^A-Za-z]/g, '');
    if (bare.length <= 3 && !SMALL.has(bare.toLowerCase())) return w; // DJ, VIP, MTN, II
    const low = w.toLowerCase();
    if (i > 0 && SMALL.has(bare.toLowerCase())) return low;
    return low.replace(/[a-z]/, (c) => c.toUpperCase());
  }).join('');
}
/** Cut long titles at a word, not mid-line */
function shorten(t: string, max = 46) {
  return t.length <= max ? t : `${t.slice(0, max).replace(/\s+\S*$/, '').replace(/[\s&,·:–—-]+$/, '')}…`;
}

const roundBtn: React.CSSProperties = {
  width: 50, height: 50, flexShrink: 0, borderRadius: 25, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  background: 'rgba(20,24,22,0.62)', border: '1px solid rgba(255,255,255,0.14)', color: T.white,
  transition: 'background 200ms ease, color 200ms ease, border-color 200ms ease',
};

/* ── One event, full screen ────────────────────────────────────────── */
function EventCard({
  item, active, near, wide, saved, going, onSave, onGoing, onShare, onTickets, topInset,
}: {
  item: FeedItem; active: boolean; near: boolean; wide: boolean;
  saved: boolean; going: boolean;
  onSave: () => void; onGoing: () => void; onShare: () => void; onTickets: (accent: string) => void;
  topInset: number;
}) {
  const { event, dist } = item;
  const [rgb, setRgb] = useState<RGB>(categoryAccent(event.category));
  const [more, setMore] = useState(false);
  const [watching, setWatching] = useState(false);
  const moments = useEventMoments(event, near);
  const block = useRef<HTMLDivElement>(null);
  const [blockH, setBlockH] = useState(300);

  useEffect(() => {
    if (!near) return;
    let live = true;
    eventAccent(event.image, event.category).then((c) => { if (live) setRgb(c); });
    return () => { live = false; };
  }, [near, event.image, event.category]);

  // The flyer gets whatever room the details leave
  useEffect(() => {
    const el = block.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBlockH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const a = toHex(rgb);
  const split = splitEventTitle(event.title);
  const title = shorten(calmCase(split.title));
  const subtitle = shorten(calmCase(split.subtitle), 60);
  const hype = hypeTags(event, { returning: moments.length > 0 });
  const excerpt = eventExcerpt(event.description, event.title);
  const goingCount = (event.attending ?? 0) + (going ? 1 : 0);
  const tags = [event.category, statusText(event)]
    .filter(Boolean)
    .filter((t, i, arr) => arr.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i);
  const when = [shortDate(event), event.time && !/tba/i.test(event.time) ? event.time.toLowerCase() : 'time TBA'].filter(Boolean).join(' · ');
  const place = [event.area && !event.venue.toLowerCase().includes(event.area.toLowerCase()) ? event.area : '', event.venue.toLowerCase().includes(cityLabel(event.city).toLowerCase()) ? '' : cityLabel(event.city), dist != null ? `${formatDistance(dist)} away` : ''].filter(Boolean).join(' · ');
  const label = ticketsLabel(event);
  const listed = isListedEvent(event);
  const priceNote = label === 'See prices' || label === 'Free' || label === 'Ended' ? '' : `from ${label}`;
  const bottom = wide ? 40 : 28;
  // Long titles get smaller so the text block stays short and the flyer gets the room
  const titleSize = wide ? 'clamp(44px, 4.6vw, 68px)' : title.length > 34 ? 28 : title.length > 22 ? 32 : title.length > 14 ? 38 : 44;

  return (
    <section
      aria-label={event.title}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: ambient(a), color: T.text, scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
    >
      {near && (
        <FlyerCanvas
          src={event.image}
          accent={a}
          category={event.category}
          dim={!active}
          area={wide
            ? { top: topInset + 16, bottom: 40, right: '10%', left: '50%' }
            : { top: topInset + 4, bottom: blockH + bottom + 12, left: 0, right: 0 }}
          bleed={!wide}
        />
      )}

      {/* Tapping anywhere on the card opens the event */}
      <Link href={`/events/${event.slug}`} aria-label={`Open ${event.title}`} style={{ position: 'absolute', inset: 0, zIndex: 2 }} />

      {/* Details: tags, short title, subtitle, friends, description, when/where, packages, one action.
          Taps on plain text fall through to the card link; buttons take their own taps. */}
      <div
        ref={block}
        style={{
          position: 'absolute', zIndex: 3, pointerEvents: 'none', left: wide ? 48 : 20, right: wide ? undefined : 20, width: wide ? 'min(44%, 600px)' : undefined,
          bottom: `calc(${bottom}px + env(safe-area-inset-bottom, 0px))`,
          display: 'flex', flexDirection: 'column', gap: 12,
          opacity: active ? 1 : 0.4, transform: active ? 'translateY(0)' : 'translateY(14px)', transition: 'opacity 0.45s ease, transform 0.45s ease',
        }}
      >
        <span style={{ display: 'flex', pointerEvents: 'auto' }}><MomentsPill list={moments} slug={event.slug} onOpen={() => setWatching(true)} /></span>

        <EventTags event={event} accent={a} hype={hype} />

        <Link href={`/events/${event.slug}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 6, pointerEvents: 'auto' }}>
          <h2 style={{ margin: 0, fontFamily: FONT.display, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.035em', fontSize: titleSize, color: T.white, textShadow: `0 0 42px ${alpha(a, 0.45)}, 0 2px 18px rgba(0,0,0,0.5)` }}>
            {title}
          </h2>
          {subtitle && <span style={{ fontFamily: FONT.display, fontSize: wide ? 20 : 16, fontWeight: 600, letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</span>}
          {excerpt && <span style={{ marginTop: 4, fontFamily: FONT.sans, fontSize: wide ? 16 : 14.5, lineHeight: 1.45, color: 'rgba(255,255,255,0.72)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{excerpt}</span>}
        </Link>

        <div style={{ pointerEvents: 'auto' }}><FriendsStrip slug={event.slug} enabled={near} /></div>

        {/* When and where: two quiet lines, no boxes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 2 }}>
          <span style={{ fontFamily: FONT.sans, fontSize: 15.5, fontWeight: 600, color: T.white }}>{label === 'Ended' ? `${when} · ended` : when}</span>
          <span style={{ fontFamily: FONT.sans, fontSize: 14, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[event.venue, place].filter(Boolean).join(' · ')}</span>
        </div>

        {/* Tickets, plus save and share. The card itself opens the event. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, pointerEvents: 'auto' }}>
          {label !== 'Ended' ? (
            <button type="button" onClick={() => onTickets(a)} style={{ ...BTN.primary, flex: wide ? undefined : 1, minWidth: wide ? 240 : 0, paddingLeft: 16, paddingRight: 16, whiteSpace: 'nowrap', overflow: 'hidden' }}>
              {label === 'Free' && !listed ? 'Reserve a free spot' : 'Get tickets'}
              {priceNote && <span style={{ fontWeight: 500, opacity: 0.62, marginLeft: 8 }}>{priceNote}</span>}
            </button>
          ) : (
            <Link href={`/events/${event.slug}`} style={{ ...BTN.secondary, flex: wide ? undefined : 1 }}>See photos & details</Link>
          )}
          <button type="button" onClick={onSave} aria-label={saved ? 'Saved' : 'Save'} aria-pressed={saved} style={{ ...roundBtn, ...(saved ? { background: alpha(a, 0.2), borderColor: alpha(a, 0.5), color: a } : {}) }}>
            <Heart size={21} strokeWidth={2} fill={saved ? 'currentColor' : 'none'} />
          </button>
          <button type="button" onClick={onShare} aria-label="Share" style={roundBtn}>
            <Share2 size={20} strokeWidth={2} />
          </button>
        </div>
      </div>

      {watching && <MomentsViewer list={moments} eventTitle={event.title} onClose={() => setWatching(false)} />}
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
  const [tickets, setTickets] = useState<{ event: GhanaEvent; accent: string } | null>(null);
  const [checkout, setCheckout] = useState<{ event: GhanaEvent; tiers: CheckoutTier[] } | null>(null);
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
    // Work out the card on screen only once a swipe settles: updating mid-swipe re-rendered every card
    // and loaded flyers while the finger was still moving, which made scrolling stutter
    let t: ReturnType<typeof setTimeout> | null = null;
    const commit = () => setActive(Math.round(el.scrollTop / Math.max(1, el.clientHeight)));
    const onScroll = () => { if (t) clearTimeout(t); t = setTimeout(commit, 110); };
    const onEnd = () => { if (t) clearTimeout(t); commit(); };
    commit();
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('scrollend', onEnd);
    return () => { if (t) clearTimeout(t); el.removeEventListener('scroll', onScroll); el.removeEventListener('scrollend', onEnd); };
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
      if (rsvp || tickets || checkout) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const el = scroller.current;
      if (!el) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); el.scrollBy({ top: el.clientHeight, behavior: 'smooth' }); }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); el.scrollBy({ top: -el.clientHeight, behavior: 'smooth' }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rsvp, tickets, checkout]);

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
            near={Math.abs(i - active) <= 1}
            wide={wide}
            saved={saved.has(item.event.slug)}
            going={going.has(item.event.slug)}
            onSave={() => onToggleSave(item.event)}
            onGoing={() => onToggleGoing(item.event)}
            onShare={() => share(item.event)}
            onTickets={(accent) => setTickets({ event: item.event, accent })}
            topInset={topInset}
          />
        ))}
      </div>

      {tickets && (
        <TicketsSheet
          event={tickets.event}
          accent={tickets.accent}
          onClose={() => setTickets(null)}
          onBuy={(tiers) => { setCheckout({ event: tickets.event, tiers }); setTickets(null); }}
          onRsvp={() => { setRsvp(tickets); setTickets(null); }}
          footer={
            <Link href={`/events/${tickets.event.slug}`} style={{ display: 'block', textAlign: 'center', marginTop: 14, fontFamily: FONT.sans, fontSize: 14, fontWeight: 500, color: T.mintText, textDecoration: 'none' }}>
              See the full event page
            </Link>
          }
        />
      )}

      {checkout && (
        <PaystackCheckout
          event={checkout.event}
          tiers={checkout.tiers}
          onClose={() => setCheckout(null)}
          onSuccess={() => { setCheckout(null); flash('Ticket confirmed — it\'s in My tickets'); }}
        />
      )}

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
