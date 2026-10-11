'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { C, G, R } from '@/lib/theme';
import type { GhanaEvent } from '@/lib/types';
import { isListedEvent } from '@/lib/types';
import { cityLabel, formatDistance } from '@/lib/utils';
import { daysUntil } from '@/lib/moments/series';
import { Icon, type IconName } from '@/components/ui/Icon';
import { type RGB, categoryAccent, eventAccent, resetPageAccent, rgba, setPageAccent, BRAND_GREEN } from '@/lib/events/accent';

const sans = 'var(--font-inter,sans-serif)';
const serif = 'var(--font-cormorant,serif)';
const NOISE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** Action colours — the This-scine rail palette. */
const ACT = {
  save: '#7BFF9E',
  going: '#FF6B8A',
  map: '#7BC8FF',
  remind: '#FFD166',
};

export interface FeedItem { event: GhanaEvent; dist: number | null }

function countdownLabel(date: string): string | null {
  const d = daysUntil(date);
  if (d == null) return null;
  if (d < 0) return 'Past';
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d <= 30) return `${d} days`;
  return null;
}

/* ── Action panel tile (This-scine rail) ─────────────────────────────── */
function RailTile({
  label, icon, color, active, filled, onClick, href, external,
}: {
  label: string; icon: IconName; color: string; active?: boolean; filled?: boolean;
  onClick?: () => void; href?: string; external?: boolean;
}) {
  const style: React.CSSProperties = {
    width: 56, padding: '11px 0', borderRadius: 18, boxSizing: 'border-box', cursor: 'pointer', textDecoration: 'none',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    background: active ? `${color}15` : 'rgba(0,0,0,0.42)',
    border: `1px solid ${active ? `${color}50` : 'rgba(255,255,255,0.09)'}`,
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    transition: 'all 0.2s ease',
  };
  const inner = (
    <>
      <Icon name={icon} size={20} color={active ? color : 'rgba(255,255,255,0.65)'} filled={filled} />
      <span style={{ fontFamily: sans, fontSize: 9, fontWeight: 700, letterSpacing: 0.2, marginTop: 1, color: active ? color : 'rgba(255,255,255,0.55)', textShadow: '0 1px 6px rgba(0,0,0,0.6)', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </>
  );
  if (href && external) return <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} style={style}>{inner}</a>;
  if (href) return <Link href={href} aria-label={label} style={style}>{inner}</Link>;
  return <button type="button" onClick={onClick} aria-label={label} aria-pressed={active} style={style}>{inner}</button>;
}

/* ── Glass chip used in the top row ──────────────────────────────────── */
function TopChip({ children, border }: { children: React.ReactNode; border?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: `1px solid ${border ?? 'rgba(255,255,255,0.08)'}`, borderRadius: 20, padding: '5px 12px' }}>
      {children}
    </div>
  );
}

/* ── Full-height card ────────────────────────────────────────────────── */
function FeedCard({
  item, index, total, active, near, wide, saved, saving, going, onSave, onGoing, onShare, topInset,
}: {
  item: FeedItem; index: number; total: number; active: boolean; near: boolean; wide: boolean;
  saved: boolean; saving: boolean; going: boolean;
  onSave: () => void; onGoing: () => void; onShare: () => void; topInset: number;
}) {
  const { event, dist } = item;
  const [acc, setAcc] = useState<RGB>(categoryAccent(event.category));
  const [loaded, setLoaded] = useState(false);
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    if (!near) return;
    let live = true;
    eventAccent(event.image, event.category).then((c) => { if (live) setAcc(c); });
    return () => { live = false; };
  }, [near, event.image, event.category]);

  const accent = rgba(acc, 1);
  const hex = `#${acc.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  const listed = isListedEvent(event) && !!event.ticketUrl;
  const when = countdownLabel(event.date);
  const titleSize = Math.min(wide ? 72 : 50, Math.max(28, (wide ? 80 : 54) - event.title.length * 0.9));
  const maps = event.lat && event.lng
    ? `https://www.google.com/maps/search/?api=1&query=${event.lat},${event.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue}, ${cityLabel(event.city)}`)}`;
  // On wide screens a portrait flyer is shown whole on the right instead of being cropped.
  const showWhole = wide && portrait;
  const ticketHref = listed ? event.ticketUrl! : `/events/${event.slug}?tickets=1`;
  const going_count = (event.attending ?? 0) + (going ? 1 : 0);

  return (
    <section
      aria-label={`${event.title}, ${index + 1} of ${total}`}
      style={{ position: 'relative', width: '100%', height: '100svh', overflow: 'hidden', background: '#06050A', scrollSnapAlign: 'start', scrollSnapStop: 'always', userSelect: 'none' }}
    >
      {/* Placeholder gradient until the flyer loads */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(170deg, #0a0806 0%, ${rgba(acc, 0.22)} 50%, ${rgba(acc, 0.5)} 100%)`, opacity: loaded ? 0 : 1, transition: 'opacity 0.6s ease' }} />

      {near && (
        <>
          {showWhole && (
            <div style={{ position: 'absolute', inset: -60, backgroundImage: `url(${event.image})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(44px) saturate(1.3)', opacity: loaded ? 0.6 : 0, transition: 'opacity 0.6s ease' }} />
          )}
          <div
            style={{
              position: 'absolute',
              ...(showWhole ? { top: 72, bottom: 28, right: '4%', width: '46%' } : { inset: 0 }),
              backgroundImage: `url(${event.image})`,
              backgroundSize: showWhole ? 'contain' : 'cover',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: showWhole ? 'center' : 'center top',
              opacity: loaded ? (active ? 1 : 0.7) : 0,
              transition: 'opacity 0.6s ease',
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.image}
            alt=""
            onLoad={(e) => { setLoaded(true); setPortrait(e.currentTarget.naturalHeight > e.currentTarget.naturalWidth * 1.05); }}
            style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
          />
        </>
      )}

      {/* Vignette + fades + grain (This-scine card treatment) */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 60% 25%, transparent 20%, rgba(0,0,0,0.6) 100%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '75%', background: 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.85) 28%, rgba(0,0,0,0.3) 60%, transparent 100%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '25%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)', pointerEvents: 'none' }} />
      {wide && <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '60%', background: 'linear-gradient(to right, rgba(0,0,0,0.75) 0%, transparent 100%)', pointerEvents: 'none' }} />}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.15, mixBlendMode: 'overlay', pointerEvents: 'none', backgroundImage: NOISE }} />

      {/* Top row: position + countdown / price */}
      <div style={{ position: 'absolute', top: topInset, left: 0, right: 0, zIndex: 10, padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: active ? 1 : 0.5, transition: 'opacity 0.4s ease' }}>
        <TopChip>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: accent, boxShadow: `0 0 6px ${accent}`, animation: when && when !== 'Past' ? 'csPulse 1.6s ease-in-out infinite' : undefined }} />
          <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'rgba(255,255,255,0.55)' }}>
            {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
        </TopChip>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {when && (
            <TopChip border={`${hex}30`}>
              <Icon name="calendar" size={12} color={accent} />
              <span style={{ fontFamily: sans, fontSize: 12.5, fontWeight: 800, color: '#fff' }}>{when}</span>
            </TopChip>
          )}
          <TopChip border={`${hex}30`}>
            <Icon name="ticket" size={12} color={accent} />
            <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 800, color: '#fff' }}>
              {event.price === 0 ? 'Free' : `₵${event.price.toLocaleString()}`}
            </span>
          </TopChip>
        </div>
      </div>

      {/* Bottom info block */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, zIndex: 10,
          right: wide ? undefined : 74, width: wide ? 'min(48%, 640px)' : undefined,
          padding: `0 ${wide ? 40 : 20}px calc(${wide ? 36 : 14}px + env(safe-area-inset-bottom, 0px))`,
          opacity: active ? 1 : 0.4, transform: active ? 'translateY(0)' : 'translateY(18px)', transition: 'all 0.5s ease',
        }}
      >
        {/* Tags */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 9, flexWrap: 'wrap', alignItems: 'center' }}>
          {[event.category, event.badge].filter(Boolean).map((t) => (
            <span key={t} style={{ fontFamily: sans, fontSize: 9, letterSpacing: 2.2, color: accent, fontWeight: 700, textTransform: 'uppercase', padding: '3px 8px', border: `1px solid ${hex}38`, borderRadius: 4 }}>{t}</span>
          ))}
          {dist != null && (
            <span style={{ fontFamily: sans, fontSize: 9, letterSpacing: 1, color: 'rgba(255,255,255,0.45)', fontWeight: 600, padding: '3px 8px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4 }}>{formatDistance(dist)} AWAY</span>
          )}
        </div>

        <Link href={`/events/${event.slug}`} style={{ textDecoration: 'none' }}>
          <h2 style={{ fontFamily: serif, fontSize: titleSize, fontWeight: 700, color: '#fff', margin: '0 0 7px', lineHeight: 1.02, letterSpacing: -0.5, textShadow: `0 0 50px ${hex}28, 0 4px 26px rgba(0,0,0,0.8)` }}>
            {event.title}
          </h2>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: serif, fontSize: 15, fontWeight: 600, color: `${hex}dd` }}>{event.dateLabel}</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }} />
          {event.time && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="clock" size={11} color="rgba(255,255,255,0.4)" />
              <span style={{ fontFamily: sans, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{event.time}</span>
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
            <Icon name="mapPin" size={11} color="rgba(255,255,255,0.4)" />
            <span style={{ fontFamily: sans, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{event.venue}{event.area ? `, ${event.area}` : ''} · {cityLabel(event.city)}</span>
          </span>
        </div>

        {(event.lineup?.length || event.description) && (
          <p style={{ fontFamily: sans, fontSize: 13.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: '0 0 14px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {event.lineup?.length ? <>With <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{event.lineup.join(', ')}</span>. </> : null}
            {event.description}
          </p>
        )}

        <a
          href={ticketHref}
          {...(listed ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 46, padding: '0 18px', borderRadius: 14, background: C.gold, color: C.onAccent, fontFamily: sans, fontSize: 14, fontWeight: 800, textDecoration: 'none' }}
        >
          <Icon name="ticket" size={17} strokeWidth={2} />
          {event.price === 0 ? 'RSVP free' : listed ? `Tickets on ${event.ticketSource || 'official site'}` : 'Get tickets'}
        </a>
      </div>

      {/* Action panel */}
      <div style={{ position: 'absolute', right: wide ? 28 : 12, bottom: `calc(${wide ? 36 : 16}px + env(safe-area-inset-bottom, 0px))`, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center', opacity: active ? 1 : 0, transform: active ? 'translateX(0)' : 'translateX(28px)', transition: 'all 0.45s ease 0.12s' }}>
        <RailTile label={saving ? '…' : saved ? 'Saved' : 'Save'} icon={saved ? 'check' : 'plus'} color={ACT.save} active={saved} onClick={onSave} />
        <RailTile label={going_count > 0 ? (going_count >= 1000 ? `${Math.round(going_count / 1000)}K` : String(going_count)) : 'Going'} icon="heart" color={ACT.going} active={going} filled={going} onClick={onGoing} />
        <RailTile label="Map" icon="mapPin" color={ACT.map} href={maps} external />
        <RailTile label="Share" icon="share" color={hex} onClick={onShare} />
        <RailTile label="Details" icon="info" color={hex} href={`/events/${event.slug}`} />
      </div>
    </section>
  );
}

/**
 * Full-height, snap-scrolling events feed (one event per screen), modelled on
 * This-scine's card. Each event washes the whole page in a colour from its flyer.
 */
export default function EventFeed({
  items, saved, saveLoading, onToggleSave, going, onToggleGoing, topInset, onShowAll,
}: {
  items: FeedItem[];
  saved: Set<string>;
  saveLoading: string | null;
  onToggleSave: (e: GhanaEvent) => void;
  going: Set<string>;
  onToggleGoing: (e: GhanaEvent) => void;
  /** px from the top of the screen covered by the header + filter row */
  topInset: number;
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
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
    setActive(0);
  }, [listKey]);

  const current = items[Math.min(active, items.length - 1)]?.event;
  useEffect(() => {
    if (!current) return;
    let live = true;
    setPageAccent(categoryAccent(current.category), BRAND_GREEN);
    eventAccent(current.image, current.category).then((c) => { if (live) setPageAccent(c, c); });
    return () => { live = false; };
  }, [current?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const el = scroller.current;
      if (!el) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); el.scrollBy({ top: el.clientHeight, behavior: 'smooth' }); }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); el.scrollBy({ top: -el.clientHeight, behavior: 'smooth' }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2200); };
  const share = useCallback(async (e: GhanaEvent) => {
    const url = `${window.location.origin}/events/${e.slug}`;
    try {
      if (navigator.share) { await navigator.share({ title: e.title, text: `${e.title} — ${e.dateLabel} · ${e.venue}`, url }); return; }
    } catch (err: any) { if (err?.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(url); flash('Link copied'); } catch { flash('Could not share'); }
  }, []);

  if (!hasItems) {
    return (
      <div style={{ minHeight: '62vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: `${topInset}px 24px 24px`, textAlign: 'center' }}>
        <Icon name="calendar" size={30} color="rgba(255,255,255,0.35)" />
        <p style={{ fontFamily: serif, fontSize: 30, color: C.cream }}>No events match</p>
        <p style={{ fontFamily: sans, fontSize: 14, color: C.c2 }}>Try another date, city or price.</p>
        {onShowAll && (
          <button type="button" onClick={onShowAll} style={{ marginTop: 6, height: 46, padding: '0 20px', borderRadius: 14, border: 'none', background: C.gold, color: C.onAccent, fontFamily: sans, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            Show all dates
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <style>{'@keyframes csPulse{0%,100%{opacity:1}50%{opacity:0.35}}'}</style>
      <div
        ref={scroller}
        className="no-scrollbar"
        style={{ position: 'fixed', inset: 0, zIndex: 40, overflowY: 'auto', overflowX: 'hidden', scrollSnapType: 'y mandatory', overscrollBehavior: 'contain', background: '#06050A' }}
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
            going={going.has(item.event.slug)}
            onSave={() => onToggleSave(item.event)}
            onGoing={() => onToggleGoing(item.event)}
            onShare={() => share(item.event)}
            topInset={topInset}
          />
        ))}
      </div>
      {toast && (
        <div role="status" style={{ position: 'fixed', zIndex: 120, left: '50%', top: '52%', transform: 'translateX(-50%)', ...G.sheet, border: `1px solid ${C.bd2}`, borderRadius: R.chip, padding: '9px 16px', fontFamily: sans, fontSize: 12.5, fontWeight: 700, color: '#fff' }}>
          {toast}
        </div>
      )}
    </>
  );
}
