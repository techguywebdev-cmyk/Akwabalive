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
import { EventTags, BTN, whenTag } from '@/components/events/CardParts';
import { statusText } from '@/components/thiscene/dates';
import { parseDay, shortDay } from '@/lib/dates';
import { splitEventTitle, eventBlurb } from '@/lib/events/title';
import { getTiers, type CheckoutTier } from '@/lib/events/tiers';
import { CalendarDays, CalendarPlus, MapPin, Navigation, Ticket, Heart, Share2 } from 'lucide-react';
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
  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.14)', color: T.white,
  backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', transition: 'background 200ms ease, color 200ms ease, border-color 200ms ease',
};

/* ── Details: when, where, tickets ─────────────────────────────────── */
function DetailRow({ icon, accent, main, sub, action }: { icon: React.ReactNode; accent: string; main: string; sub?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
      <span aria-hidden style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: alpha(accent, 0.18), border: `1px solid ${alpha(accent, 0.28)}`, color: accent, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{main}</span>
        {sub && <span style={{ fontFamily: FONT.sans, fontSize: 13, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>}
      </span>
      {action}
    </div>
  );
}

/** Small round icon button at the end of a detail row (Add to calendar, Directions) */
const rowAction: React.CSSProperties = {
  pointerEvents: 'auto', flexShrink: 0, width: 40, height: 40, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: T.white, textDecoration: 'none',
  backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
};

/* ── Ticket packages, right on the card ───────────────────────────── */
function TierChips({ event, accent, onOpen }: { event: GhanaEvent; accent: string; onOpen: () => void }) {
  const tiers = getTiers(event);
  if (!tiers.length) {
    return isListedEvent(event)
      ? <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 13, color: T.text2 }}>Tickets sold on {event.ticketSource || 'the official site'}</p>
      : null;
  }
  return (
    <div className="no-scrollbar" role="list" aria-label="Ticket types" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -20px', padding: '0 20px', pointerEvents: 'auto' }}>
      {tiers.map((t) => {
        const low = t.available && t.spots <= 20;
        return (
          <button
            key={t.name}
            type="button"
            role="listitem"
            onClick={onOpen}
            aria-label={`${t.name}, ${t.price === 0 ? 'free' : `GH₵ ${t.price}`}${!t.available ? ', sold out' : low ? `, only ${t.spots} left` : ''}`}
            style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '8px 14px', borderRadius: 16, cursor: 'pointer', textAlign: 'left', background: 'rgba(3,10,6,0.45)', border: `1px solid ${low ? alpha(accent, 0.55) : 'rgba(255,255,255,0.12)'}`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', color: t.available ? T.white : 'rgba(255,255,255,0.4)' }}
          >
            <span style={{ fontFamily: FONT.sans, fontSize: 12, fontWeight: 500, color: t.available ? 'rgba(255,255,255,0.7)' : undefined, whiteSpace: 'nowrap' }}>{t.name}</span>
            <span style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', textDecoration: t.available ? 'none' : 'line-through' }}>
              {t.price === 0 ? 'Free' : `GH₵ ${t.price.toLocaleString()}`}
              {!t.available && <span style={{ marginLeft: 6, fontFamily: FONT.sans, fontSize: 11.5, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>Sold out</span>}
              {low && <span style={{ marginLeft: 6, fontFamily: FONT.sans, fontSize: 11.5, fontWeight: 600, color: accent }}>{t.spots} left</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

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
  const goingCount = (event.attending ?? 0) + (going ? 1 : 0);
  const tags = [event.category, statusText(event)]
    .filter(Boolean)
    .filter((t, i, arr) => arr.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i);
  const when = [shortDate(event), event.time && !/tba/i.test(event.time) ? event.time.toLowerCase() : 'time TBA'].filter(Boolean).join(' · ');
  const place = [event.area && !event.venue.toLowerCase().includes(event.area.toLowerCase()) ? event.area : '', event.venue.toLowerCase().includes(cityLabel(event.city).toLowerCase()) ? '' : cityLabel(event.city), dist != null ? `${formatDistance(dist)} away` : ''].filter(Boolean).join(' · ');
  const label = ticketsLabel(event);
  const tierList = getTiers(event);
  const listed = isListedEvent(event);
  const ticketMain = label === 'See prices' ? 'Tickets available' : label === 'Free' ? 'Free entry' : `From ${label}`;
  const ticketSub = listed ? `Sold on ${event.ticketSource || 'the official site'}` : label === 'Free' ? 'Reserve your spot on Akwaaba' : 'MoMo or card · QR ticket';
  const calLink = (() => {
    const d = event.date?.slice(0, 10).replace(/-/g, '');
    return d ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${d}/${d}&location=${encodeURIComponent(`${event.venue}, Ghana`)}` : null;
  })();
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
          opacity: active ? 1 : 0.4, transform: active ? 'translateY(0)' : 'translateY(14px)', transition: 'all 0.5s ease',
        }}
      >
        <span style={{ display: 'flex', pointerEvents: 'auto' }}><MomentsPill list={moments} slug={event.slug} onOpen={() => setWatching(true)} /></span>

        <EventTags event={event} accent={a} />

        <Link href={`/events/${event.slug}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 6, pointerEvents: 'auto' }}>
          <h2 style={{ margin: 0, fontFamily: FONT.display, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.035em', fontSize: titleSize, color: T.white, textShadow: `0 0 42px ${alpha(a, 0.45)}, 0 2px 18px rgba(0,0,0,0.5)` }}>
            {title}
          </h2>
          {subtitle && <span style={{ fontFamily: FONT.display, fontSize: wide ? 20 : 16, fontWeight: 600, letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</span>}
        </Link>

        <div style={{ pointerEvents: 'auto' }}><FriendsStrip slug={event.slug} enabled={near} /></div>

        {/* When, where, tickets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 2 }}>
          <DetailRow
            accent={a}
            icon={<CalendarDays size={20} strokeWidth={2} />}
            main={when}
            sub={label === 'Ended' ? 'This event has ended' : whenTag(event)?.text}
            action={label !== 'Ended' && calLink ? <a href={calLink} target="_blank" rel="noopener noreferrer" aria-label="Add to calendar" title="Add to calendar" style={rowAction}><CalendarPlus size={19} strokeWidth={2} /></a> : undefined}
          />
          <DetailRow
            accent={a}
            icon={<MapPin size={20} strokeWidth={2} />}
            main={event.venue}
            sub={place || undefined}
            action={<a href={mapsLink(event)} target="_blank" rel="noopener noreferrer" aria-label="Directions" title="Directions" style={rowAction}><Navigation size={18} strokeWidth={2} /></a>}
          />
          {label !== 'Ended' && tierList.length < 2 && (
            <DetailRow accent={a} icon={<Ticket size={20} strokeWidth={2} />} main={ticketMain} sub={ticketSub} />
          )}
        </div>

        {label !== 'Ended' && tierList.length >= 2 && <TierChips event={event} accent={a} onOpen={() => onTickets(a)} />}

        {/* Tickets, plus save and share. The card itself opens the event. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, pointerEvents: 'auto' }}>
          {label !== 'Ended' ? (
            <button type="button" onClick={() => onTickets(a)} style={{ ...BTN.primary, flex: wide ? undefined : 1, minWidth: wide ? 240 : undefined }}>
              {label === 'Free' && !listed ? 'Reserve a free spot' : 'Get tickets'}
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
            near={Math.abs(i - active) <= 2}
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
