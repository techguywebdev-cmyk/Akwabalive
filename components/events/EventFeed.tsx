'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bookmark, CalendarDays, Clock, ExternalLink, Info, Loader2, MapPin, Navigation, Share2, Ticket } from 'lucide-react';
import { C, G, R } from '@/lib/theme';
import type { GhanaEvent } from '@/lib/types';
import { isListedEvent } from '@/lib/types';
import { cityLabel, formatDistance } from '@/lib/utils';
import { daysUntil } from '@/lib/moments/series';
import { LineupChips } from '@/components/ui/LineupChips';
import { type RGB, categoryAccent, eventAccent, resetPageAccent, rgba, setPageAccent, BRAND_GREEN } from '@/lib/events/accent';

const mono = 'var(--font-dm-mono,monospace)';
const sans = 'var(--font-inter,sans-serif)';
const serif = 'var(--font-cormorant,serif)';
const shadowText = '0 2px 18px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.6)';

export interface FeedItem { event: GhanaEvent; dist: number | null }

function countdown(date: string): string | null {
  const d = daysUntil(date);
  if (d == null) return null;
  if (d < 0) return 'Past event';
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d <= 30) return `In ${d} days`;
  return null;
}

/** Image fit: fill the card when the flyer's shape is close to the screen's, otherwise show it whole. */
function useFit(src: string, wide: boolean) {
  const [fit, setFit] = useState<'cover' | 'contain'>('cover');
  const onLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const box = img.parentElement?.getBoundingClientRect();
    if (!box || !img.naturalWidth) return;
    const ratio = (img.naturalWidth / img.naturalHeight) / (box.width / box.height);
    setFit(ratio > 0.62 && ratio < 1.6 ? 'cover' : 'contain');
  }, []);
  useEffect(() => { setFit('cover'); }, [src, wide]);
  return { fit, onLoad };
}

function FeedCard({
  item, index, total, active, near, wide, saved, saving, onSave, onShare, topInset,
}: {
  item: FeedItem; index: number; total: number; active: boolean; near: boolean; wide: boolean;
  saved: boolean; saving: boolean; onSave: () => void; onShare: () => void; topInset: number;
}) {
  const { event, dist } = item;
  const { fit, onLoad } = useFit(event.image, wide);
  const accent = categoryAccent(event.category);
  const [acc, setAcc] = useState<RGB>(accent);
  useEffect(() => {
    if (!near) return;
    let live = true;
    eventAccent(event.image, event.category).then((c) => { if (live) setAcc(c); });
    return () => { live = false; };
  }, [near, event.image, event.category]);

  const listed = isListedEvent(event) && !!event.ticketUrl;
  const when = countdown(event.date);
  const titleSize = `clamp(34px, ${Math.max(6.5, 11 - event.title.length * 0.09)}vw, ${event.title.length > 34 ? 56 : 72}px)`;
  const maps = event.lat && event.lng
    ? `https://www.google.com/maps/search/?api=1&query=${event.lat},${event.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue}, ${cityLabel(event.city)}`)}`;
  const contain = fit === 'contain';

  return (
    <section
      aria-label={`${event.title}, ${index + 1} of ${total}`}
      data-index={index}
      style={{ position: 'relative', height: '100svh', width: '100%', overflow: 'hidden', scrollSnapAlign: 'start', scrollSnapStop: 'always', background: '#0D0B08' }}
    >
      {near ? (
        <>
          {/* Colour-washed blurred copy fills the screen behind the flyer */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.image} alt="" aria-hidden style={{ position: 'absolute', inset: -60, width: 'calc(100% + 120px)', height: 'calc(100% + 120px)', objectFit: 'cover', filter: 'blur(42px) saturate(1.35)', opacity: contain ? 0.7 : 0 }} />
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(120% 70% at 0% 0%, ${rgba(acc, 0.32)} 0%, transparent 70%), radial-gradient(120% 70% at 100% 100%, ${rgba(acc, 0.22)} 0%, transparent 70%)` }} />
          <div
            style={{
              position: 'absolute',
              ...(contain && wide ? { top: 80, bottom: 24, left: '44%', right: '3%' } : contain ? { top: topInset + 46, bottom: '36%', left: 12, right: 12 } : { inset: 0 }),
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.image}
              alt={event.title}
              onLoad={onLoad}
              style={{ width: '100%', height: '100%', objectFit: fit, objectPosition: contain ? 'center' : '50% 30%', borderRadius: contain ? 14 : 0, transform: active ? 'scale(1)' : 'scale(1.03)', transition: 'transform 1.2s ease' }}
            />
          </div>
        </>
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(170deg, #0D0B08 0%, ${rgba(accent, 0.25)} 60%, ${rgba(accent, 0.45)} 100%)` }} />
      )}

      {/* Legibility fades */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '28%', background: 'linear-gradient(to bottom, rgba(8,6,4,0.55) 0%, transparent 100%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: wide ? '70%' : '62%', background: 'linear-gradient(to top, rgba(8,6,4,0.96) 0%, rgba(8,6,4,0.82) 30%, rgba(8,6,4,0.3) 65%, transparent 100%)', pointerEvents: 'none' }} />
      {wide && <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '55%', background: 'linear-gradient(to right, rgba(8,6,4,0.7) 0%, transparent 100%)', pointerEvents: 'none' }} />}

      {/* Top chips */}
      <div style={{ position: 'absolute', top: topInset, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, zIndex: 3 }}>
        <span style={{ ...G.overlay, border: '1px solid rgba(255,255,255,0.14)', borderRadius: R.chip, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: mono, fontSize: 11, letterSpacing: '1px', color: 'rgba(245,236,215,0.8)' }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: rgba(acc, 1) }} />
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {event.badge && (
            <span style={{ ...G.overlay, border: `1px solid ${rgba(acc, 0.45)}`, borderRadius: R.chip, padding: '6px 12px', fontFamily: mono, fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.cream }}>{event.badge}</span>
          )}
          {when && (
            <span style={{ ...G.overlay, border: `1px solid ${rgba(acc, 0.45)}`, borderRadius: R.chip, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: sans, fontSize: 12, fontWeight: 700, color: C.cream }}>
              <CalendarDays size={13} color={rgba(acc, 1)} /> {when}
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div
        style={{
          position: 'absolute', zIndex: 3, left: 0, bottom: 0,
          right: wide ? 'auto' : 76, width: wide ? 'min(44%, 600px)' : undefined,
          padding: `0 ${wide ? 40 : 18}px calc(${wide ? 40 : 18}px + env(safe-area-inset-bottom, 0px))`,
          display: 'flex', flexDirection: 'column', gap: 10,
          opacity: active ? 1 : 0.55, transform: active ? 'none' : 'translateY(14px)', transition: 'opacity 450ms ease, transform 450ms ease',
        }}
      >
        <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: rgba(acc, 1), textShadow: shadowText }}>
          {event.category} · {event.area ? `${event.area}, ` : ''}{cityLabel(event.city)}
          {dist != null && ` · ${formatDistance(dist)} away`}
        </span>
        <Link href={`/events/${event.slug}`} style={{ textDecoration: 'none' }}>
          <h2 style={{ fontFamily: serif, fontSize: titleSize, fontWeight: 600, lineHeight: 0.98, letterSpacing: '-0.5px', color: '#FFFDF6', textShadow: `0 0 50px ${rgba(acc, 0.25)}, ${shadowText}` }}>
            {event.title}
          </h2>
        </Link>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontFamily: sans, fontSize: 13, color: 'rgba(245,236,215,0.86)', textShadow: shadowText }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><CalendarDays size={14} color={rgba(acc, 1)} />{event.dateLabel}</span>
          {event.time && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Clock size={14} color={rgba(acc, 1)} />{event.time}</span>}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}><MapPin size={14} color={rgba(acc, 1)} />{event.venue}</span>
        </div>
        <LineupChips event={event} compact max={4} />

        {/* Ticket bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px 10px 16px', marginTop: 4, borderRadius: R.card, ...G.panel, background: `linear-gradient(160deg, ${rgba(acc, 0.20)} 0%, ${rgba(acc, 0.06)} 60%, rgba(255,255,255,0.03) 100%), rgba(16,13,9,0.62)`, border: `1px solid ${rgba(acc, 0.35)}` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.c2 }}>{event.price === 0 ? 'Entry' : 'From'}</p>
            <p style={{ fontFamily: mono, fontSize: 22, color: event.price === 0 ? '#86EFAC' : C.cream, letterSpacing: '-0.5px' }}>
              {event.price === 0 ? 'Free' : <><span style={{ fontSize: 13, color: rgba(acc, 1) }}>₵</span>{event.price.toLocaleString()}</>}
            </p>
            {!!event.attending && event.attending > 0 && (
              <p style={{ fontFamily: sans, fontSize: 11, color: C.c3 }}>{event.attending.toLocaleString()} going</p>
            )}
          </div>
          {listed ? (
            <a href={event.ticketUrl!} target="_blank" rel="noopener noreferrer" style={{ height: 48, padding: '0 18px', borderRadius: R.btn, background: C.gold, color: C.onAccent, fontFamily: sans, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
              <ExternalLink size={16} /> Tickets
            </a>
          ) : (
            <Link href={`/events/${event.slug}?tickets=1`} style={{ height: 48, padding: '0 18px', borderRadius: R.btn, background: C.gold, color: C.onAccent, fontFamily: sans, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
              <Ticket size={17} /> {event.price === 0 ? 'RSVP' : 'Get tickets'}
            </Link>
          )}
        </div>
      </div>

      {/* Action rail */}
      <div style={{ position: 'absolute', zIndex: 4, right: wide ? 28 : 10, bottom: `calc(${wide ? 40 : 128}px + env(safe-area-inset-bottom, 0px))`, display: 'flex', flexDirection: 'column', gap: 8, opacity: active ? 1 : 0, transform: active ? 'none' : 'translateX(24px)', transition: 'all 450ms ease 120ms' }}>
        {[
          { key: 'save', label: saved ? 'Saved' : 'Save', on: saved, onClick: onSave, icon: saving ? <Loader2 size={20} className="animate-spin" /> : <Bookmark size={20} fill={saved ? rgba(acc, 1) : 'none'} /> },
          { key: 'share', label: 'Share', on: false, onClick: onShare, icon: <Share2 size={20} /> },
          { key: 'map', label: 'Map', on: false, href: maps, icon: <Navigation size={19} /> },
          { key: 'info', label: 'Details', on: false, link: `/events/${event.slug}`, icon: <Info size={20} /> },
        ].map((b) => {
          const style: React.CSSProperties = {
            width: 58, padding: '10px 0', borderRadius: 18, cursor: 'pointer', textDecoration: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            ...G.overlay, border: `1px solid ${b.on ? rgba(acc, 0.6) : 'rgba(255,255,255,0.12)'}`,
            background: b.on ? rgba(acc, 0.18) : G.overlay.background,
            color: b.on ? rgba(acc, 1) : C.cream,
          };
          const inner = <>{b.icon}<span style={{ fontFamily: sans, fontSize: 10, fontWeight: 700 }}>{b.label}</span></>;
          if ('href' in b && b.href) return <a key={b.key} href={b.href} target="_blank" rel="noopener noreferrer" aria-label={`${b.label}: ${event.venue}`} style={style}>{inner}</a>;
          if ('link' in b && b.link) return <Link key={b.key} href={b.link} aria-label={`${b.label}: ${event.title}`} style={style}>{inner}</Link>;
          return <button key={b.key} type="button" onClick={b.onClick} aria-pressed={b.key === 'save' ? saved : undefined} aria-label={`${b.label}: ${event.title}`} style={style}>{inner}</button>;
        })}
      </div>
    </section>
  );
}

/**
 * Full-bleed, snap-scrolling events feed (one event per screen).
 * Each event washes the whole page in a colour taken from its flyer.
 */
export default function EventFeed({
  items, saved, saveLoading, onToggleSave, topInset, onShowAll,
}: {
  items: FeedItem[];
  saved: Set<string>;
  saveLoading: string | null;
  onToggleSave: (e: GhanaEvent) => void;
  /** px from the top of the screen that the nav + filter bar cover */
  topInset: number;
  /** Offered when nothing matches */
  onShowAll?: () => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [wide, setWide] = useState(false);
  const [toast, setToast] = useState('');
  const hasItems = items.length > 0;

  useEffect(() => {
    const fn = () => setWide(window.innerWidth >= 900);
    fn();
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // Lock page scroll while the feed is showing
  useEffect(() => {
    if (!hasItems) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [hasItems]);
  useEffect(() => () => resetPageAccent(), []);

  // Track the active card
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => setActive(Math.round(el.scrollTop / Math.max(1, el.clientHeight)));
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [hasItems]);

  // Back to the first card when the list changes (filters)
  const listKey = items.map((i) => i.event.slug).join('|');
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
    setActive(0);
  }, [listKey]);

  // Wash the page in the active event's colour
  const current = items[Math.min(active, items.length - 1)]?.event;
  useEffect(() => {
    if (!current) return;
    let live = true;
    setPageAccent(categoryAccent(current.category), BRAND_GREEN);
    eventAccent(current.image, current.category).then((c) => { if (live) setPageAccent(c, c); });
    return () => { live = false; };
  }, [current?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard paging
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const el = scroller.current;
      if (!el) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'j') { e.preventDefault(); el.scrollBy({ top: el.clientHeight, behavior: 'smooth' }); }
      if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'k') { e.preventDefault(); el.scrollBy({ top: -el.clientHeight, behavior: 'smooth' }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const share = useCallback(async (e: GhanaEvent) => {
    const url = `${window.location.origin}/events/${e.slug}`;
    try {
      if (navigator.share) { await navigator.share({ title: e.title, text: `${e.title} — ${e.dateLabel} · ${e.venue}`, url }); return; }
    } catch { /* fall back to copy */ }
    try { await navigator.clipboard.writeText(url); setToast('Link copied'); setTimeout(() => setToast(''), 2000); } catch { /* ignore */ }
  }, []);

  if (!items.length) {
    return (
      <div style={{ minHeight: '62vh', paddingTop: topInset, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: `${topInset}px 24px 24px`, textAlign: 'center' }}>
        <p style={{ fontFamily: serif, fontSize: 30, color: C.cream }}>No events match</p>
        <p style={{ fontFamily: sans, fontSize: 14, color: C.c2 }}>Try another date, city or price.</p>
        {onShowAll && (
          <button type="button" onClick={onShowAll} style={{ marginTop: 6, height: 46, padding: '0 20px', borderRadius: R.btn, border: 'none', background: C.gold, color: C.onAccent, fontFamily: sans, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            Show all dates
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
        style={{ position: 'fixed', inset: 0, zIndex: 40, overflowY: 'auto', overflowX: 'hidden', scrollSnapType: 'y mandatory', overscrollBehavior: 'contain' }}
      >
        {items.map((item, i) => (
          <FeedCard
            key={item.event.slug}
            item={item}
            index={i}
            total={items.length}
            active={i === active}
            near={Math.abs(i - active) <= 2}
            wide={wide}
            saved={saved.has(item.event.slug)}
            saving={saveLoading === item.event.slug}
            onSave={() => onToggleSave(item.event)}
            onShare={() => share(item.event)}
            topInset={topInset}
          />
        ))}
      </div>
      {toast && (
        <div role="status" style={{ position: 'fixed', zIndex: 120, left: '50%', bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))', transform: 'translateX(-50%)', ...G.sheet, border: `1px solid ${C.bd2}`, borderRadius: R.chip, padding: '10px 16px', fontFamily: sans, fontSize: 13, color: C.cream }}>
          {toast}
        </div>
      )}
    </>
  );
}
