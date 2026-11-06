'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import type { GhanaEvent } from '@/lib/types';
import { cityLabel, formatDistance } from '@/lib/utils';
import { useAuth } from '@/lib/supabase/AuthProvider';
import RsvpSheet from '@/components/thiscene/RsvpSheet';
import PaystackCheckout from '@/components/payment/PaystackCheckout';
import FlyerCanvas, { Glow } from '@/components/events/FlyerCanvas';
import FriendsStrip from '@/components/social/FriendsStrip';
import { useEventMoments } from '@/components/moments/EventMoments';
import { ytThumb } from '@/lib/moments/match';
import CustomPlayer from '@/components/moments/CustomPlayer';
import { TicketsSheet, ticketsLabel } from '@/components/events/EventActions';
import { EventTags, BTN, chip } from '@/components/events/CardParts';
import { hypeTags, eventExcerpt } from '@/lib/events/hype';
import { trackEvent } from '@/lib/events/track';
import HotCarousel from '@/components/events/HotCarousel';
import { statusText } from '@/components/thiscene/dates';
import { parseDay, shortDay } from '@/lib/dates';
import { splitEventTitle, eventBlurb } from '@/lib/events/title';
import { type CheckoutTier } from '@/lib/events/tiers';
import { Heart, Share2, Mic2, Play, Image as ImageIcon } from 'lucide-react';
import { isListedEvent } from '@/lib/types';
import { T, TYPE, RADIUS, FONT, alpha, ambient, glass } from '@/lib/thiscene';
import { type RGB, categoryAccent, eventAccent, resetPageAccent, setPageAccent, toHex } from '@/lib/events/accent';

/** The card last on screen, kept for the whole visit so Back returns to it */
let lastSeen: string | null = null;

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
  item, active, near, wide, saved, going, onSave, onGoing, onShare, onTickets, topInset, performer,
}: {
  /** From a search for an artist: who is performing here */
  performer?: { name: string; slug: string } | null;
  item: FeedItem; active: boolean; near: boolean; wide: boolean;
  saved: boolean; going: boolean;
  onSave: () => void; onGoing: () => void; onShare: () => void; onTickets: (accent: string) => void;
  topInset: number;
}) {
  const { event, dist } = item;
  const [rgb, setRgb] = useState<RGB>(categoryAccent(event.category));
  const [more, setMore] = useState(false);
  // Watching a past edition's clips right on the card, in place of the flyer
  const [watching, setWatching] = useState(false);
  const [clip, setClip] = useState(0);
  const [prog, setProg] = useState(0);
  useEffect(() => { if (!active) setWatching(false); }, [active]);
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
      {watching && moments[clip] && (
        <div style={wide
          ? { position: 'absolute', zIndex: 3, top: topInset + 16, bottom: 40, right: '6%', left: '48%', display: 'flex', alignItems: 'center' }
          : { position: 'absolute', zIndex: 3, top: topInset + 4, bottom: blockH + bottom + 12, left: 0, right: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Glow src={ytThumb(moments[clip].youtube_id, 'hq')} />
          {/* The Moments player: our player, mint progress line, a dot per clip; the next clip follows on */}
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', flexShrink: 1, minHeight: 0, background: '#000', boxShadow: '0 20px 50px rgba(0,0,0,0.55)' }}>
            <CustomPlayer key={moments[clip].youtube_id} youtubeId={moments[clip].youtube_id} title={moments[clip].title} fit="contain" active={active}
              onTimeUpdate={(cur, len) => setProg(len ? Math.min(100, (cur / len) * 100) : 0)}
              onEnded={() => { if (clip < moments.length - 1) { setClip(clip + 1); setProg(0); } else setWatching(false); }} />
            {moments.length > 1 && (
              <span style={{ position: 'absolute', left: '50%', bottom: 10, transform: 'translateX(-50%)', zIndex: 9, display: 'flex', gap: 5, pointerEvents: 'none' }}>
                {moments.map((c, k) => <span key={c.id} style={{ width: k === clip ? 16 : 6, height: 6, borderRadius: 3, background: k === clip ? T.white : 'rgba(255,255,255,0.45)', transition: 'width 250ms ease' }} />)}
              </span>
            )}
            <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, zIndex: 9, background: 'rgba(255,255,255,0.16)', pointerEvents: 'none' }}>
              <span style={{ display: 'block', height: '100%', width: `${prog}%`, background: T.mint, transition: 'width 250ms linear' }} />
            </span>
          </div>
          <div style={{ position: 'relative', padding: '12px 20px 0' }}>
            <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.mintText }}>
              {moments[clip].event_name}{moments[clip].year ? ` · ${moments[clip].year}` : ''}
            </p>
            <p style={{ margin: '3px 0 0', fontFamily: FONT.display, fontSize: 16, fontWeight: 700, lineHeight: 1.25, color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{moments[clip].title}</p>
            {moments.length > 1 && (
              <div className="no-scrollbar" style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto' }}>
                {moments.map((m, k) => (
                  <button key={m.id} type="button" onClick={() => { setClip(k); setProg(0); }} aria-label={`Play ${m.title}`} aria-current={k === clip} style={{ position: 'relative', width: 64, aspectRatio: '16 / 9', flexShrink: 0, padding: 0, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: '#000', border: 'none', outline: k === clip ? `2px solid ${T.mint}` : '1px solid rgba(255,255,255,0.12)', outlineOffset: k === clip ? 1 : 0, opacity: k === clip ? 1 : 0.7 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ytThumb(m.youtube_id)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {near && !watching && (
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
        {performer && (
          <Link href={`/artists/${performer.slug}`} style={{ alignSelf: 'flex-start', pointerEvents: 'auto', display: 'inline-flex', alignItems: 'center', gap: 7, height: 32, padding: '0 13px', borderRadius: 16, background: T.mint, color: T.onMint, fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 700, textDecoration: 'none' }}>
            <Mic2 size={14} strokeWidth={2.4} /> {performer.name} is performing
          </Link>
        )}
        <span style={{ pointerEvents: 'auto' }}>
          <EventTags event={event} accent={a} hype={hype} max={watching ? 1 : moments.length ? 2 : undefined} extra={watching ? (
            <button type="button" onClick={() => setWatching(false)} style={{ ...chip, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(3,10,6,0.5)', color: T.white }}>
              <ImageIcon size={14} strokeWidth={2.2} /> Flyer
            </button>
          ) : moments.length > 0 ? (
            <button type="button" onClick={() => { setClip(0); setProg(0); setWatching(true); }} aria-label={`Watch moments from past editions, ${moments.length} video${moments.length > 1 ? 's' : ''}`} title="Watch moments"
              style={{ width: 28, height: 28, padding: 0, borderRadius: 14, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: T.mint, color: T.onMint, boxShadow: '0 0 14px rgba(123,227,168,0.45)' }}>
              <Play size={12} fill="currentColor" strokeWidth={0} style={{ marginLeft: 2 }} />
            </button>
          ) : null} />
        </span>

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

    </section>
  );
}

/**
 * Full-screen events feed. One card per screen, vertical snap. The page stays
 * green-black; each card's colour only tints its tags, title glow and main button.
 */
export default function EventFeed({
  items, saved, onToggleSave, going, onToggleGoing, topInset, onShowAll, showAllLabel, frameTop = 0, hot = [], performerFor, friendPlans,
}: {
  /** Upcoming shows people you follow are going to (with who), for the friends screen after the 2nd card */
  friendPlans?: { events: GhanaEvent[]; by: Record<string, import('@/components/social/FriendsStrip').Friend[]> } | null;
  /** Search for an artist: the artist on each card's bill */
  performerFor?: (e: GhanaEvent) => { name: string; slug: string } | null;
  items: FeedItem[];
  saved: Set<string>;
  saveLoading?: string | null;
  onToggleSave: (e: GhanaEvent) => void;
  going: Set<string>;
  onToggleGoing: (e: GhanaEvent) => void | Promise<void>;
  topInset: number;
  /** Where the feed starts (below the header and Hot rail); cards never sit under them */
  frameTop?: number;
  /** Hot shows: a sideways carousel screen after the 3rd card, then every 6 cards */
  hot?: GhanaEvent[];
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
  // Event cards with the Hot carousel screen woven in
  type Slide = { kind: 'event'; item: FeedItem } | { kind: 'hot'; key: string } | { kind: 'friends'; key: string };
  const friendCount = friendPlans?.events.length ?? 0;
  const slides = useMemo<Slide[]>(() => {
    const out: Slide[] = [];
    items.forEach((item, i) => {
      out.push({ kind: 'event', item });
      if (friendCount > 0 && i === 1 && i < items.length - 1) out.push({ kind: 'friends', key: 'friends' });
      if (hot.length >= 3 && (i === 2 || (i > 2 && (i - 2) % 6 === 0)) && i < items.length - 1) out.push({ kind: 'hot', key: `hot-${i}` });
    });
    return out;
  }, [items, hot.length, friendCount]);
  const eventAt = (i: number) => { const s = slides[i]; return s && s.kind === 'event' ? s.item : undefined; };

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

  // Coming back from an event: return to the card you were on. Any other list change starts at the top.
  const listKey = items.map((i) => i.event.slug).join('|');
  const [returnTo] = useState(() => lastSeen); // read once on mount
  const firstKey = useRef<string | null>(null);
  useEffect(() => {
    const el = scroller.current;
    if (!items.length) return;
    if (firstKey.current === null) firstKey.current = listKey;
    const back = listKey === firstKey.current && returnTo ? slides.findIndex((x) => x.kind === 'event' && x.item.event.slug === returnTo) : -1;
    if (el && back > 0) { el.scrollTo({ top: back * el.clientHeight, behavior: 'instant' as ScrollBehavior }); setActive(back); return; }
    el?.scrollTo({ top: 0 }); setActive(0);
  }, [listKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const slug = eventAt(active)?.event.slug; if (slug) { lastSeen = slug; trackEvent(slug, 'impression'); } }, [active, slides]); // eslint-disable-line react-hooks/exhaustive-deps

  // The live accent follows the active card
  const current = (eventAt(active) ?? eventAt(active - 1) ?? items[0])?.event;
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
        style={{ position: 'fixed', top: frameTop ? `calc(${frameTop}px + env(safe-area-inset-top, 0px))` : 0, left: 0, right: 0, bottom: 0, zIndex: 40, overflowY: 'auto', overflowX: 'hidden', scrollSnapType: 'y mandatory', overscrollBehavior: 'contain', background: T.bg }}
      >
        {slides.map((sl, i) => sl.kind === 'hot' || sl.kind === 'friends' ? (
          <HotCarousel key={sl.key} events={sl.kind === 'friends' ? friendPlans!.events : hot} friends={sl.kind === 'friends' ? friendPlans!.by : undefined} topInset={topInset} active={i === active} onNext={() => scroller.current?.scrollBy({ top: scroller.current.clientHeight, behavior: 'smooth' })} />
        ) : (
          <EventCard
            key={sl.item.event.slug}
            item={sl.item}
            performer={performerFor?.(sl.item.event) ?? null}
            active={i === active}
            near={Math.abs(i - active) <= 1}
            wide={wide}
            saved={saved.has(sl.item.event.slug)}
            going={going.has(sl.item.event.slug)}
            onSave={() => onToggleSave(sl.item.event)}
            onGoing={() => onToggleGoing(sl.item.event)}
            onShare={() => share(sl.item.event)}
            onTickets={(accent) => setTickets({ event: sl.item.event, accent })}
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
