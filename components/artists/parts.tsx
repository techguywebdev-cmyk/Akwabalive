'use client';

import Link from 'next/link';
import { Check, Play, Plus } from 'lucide-react';
import type { GhanaEvent } from '@/lib/types';
import type { Moment } from '@/components/moments/types';
import { BTN } from '@/components/events/CardParts';
import { ytThumb } from '@/lib/moments/match';
import { getTiers } from '@/lib/events/tiers';
import { parseDay, longDay, shortDay } from '@/lib/dates';
import { hiRes } from '@/lib/events/image';
import { cityLabel } from '@/lib/utils';
import { useFollow } from '@/components/follow/useFollow';
import { T, FONT } from '@/lib/thiscene';
import { ScoreChip } from '@/components/ratings/Stars';
import type { RatingSummary } from '@/lib/ratings';

export const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export function priceLine(e: GhanaEvent): string {
  if (e.priceUnknown || (e.listingType === 'listed' && !(e.price > 0))) return 'See prices';
  const prices = getTiers(e).map((t) => t.price).filter((p) => p > 0);
  const min = prices.length ? Math.min(...prices) : e.price;
  return min > 0 ? `From GH₵ ${min.toLocaleString()}` : 'Free entry';
}

/** "Venue, City", without repeating the city when the venue already names it */
export const place = (e: GhanaEvent) => {
  const city = e.city ? cityLabel(e.city) : '';
  return city && !e.venue?.toLowerCase().includes(city.toLowerCase()) ? [e.venue, city].filter(Boolean).join(', ') : e.venue;
};

/** "Tonight", "Tomorrow", "In 5 days", "In 3 weeks" */
export function countdown(date?: string | null): string | null {
  const d = parseDay(date);
  if (!d) return null;
  const days = Math.round((d.getTime() - today().getTime()) / 86400000);
  if (days < 0) return null;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 14) return `In ${days} days`;
  if (days < 60) return `In ${Math.round(days / 7)} weeks`;
  return `In ${Math.round(days / 30)} months`;
}

export const roundBtn: React.CSSProperties = {
  width: 46, height: 46, borderRadius: 23, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: T.white, cursor: 'pointer', textDecoration: 'none',
};

export function SpotifyLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 1.5a10.5 10.5 0 1 0 0 21 10.5 10.5 0 0 0 0-21zm4.82 15.15a.66.66 0 0 1-.9.22c-2.48-1.51-5.6-1.85-9.27-1.01a.65.65 0 1 1-.29-1.28c4.02-.92 7.47-.52 10.24 1.17.31.19.41.59.22.9zm1.29-2.86a.82.82 0 0 1-1.13.27c-2.83-1.74-7.15-2.25-10.5-1.23a.82.82 0 0 1-.48-1.57c3.83-1.16 8.59-.6 11.84 1.4.39.24.51.75.27 1.13zm.11-2.98C14.82 8.79 9.2 8.6 5.95 9.59a.98.98 0 1 1-.57-1.88c3.73-1.13 9.94-.91 13.85 1.41a.98.98 0 0 1-1.01 1.69z" />
    </svg>
  );
}

export function XLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3zm-1.08 16.2h1.7L7.4 4.7H5.57l11.1 14.5z" />
    </svg>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, margin: '0 0 12px' }}>
      <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 21, fontWeight: 800, letterSpacing: '-0.025em', color: T.white }}>{children}</h2>
      {action}
    </div>
  );
}

/** Round portrait: the photo, or initials on green. `ring` = mint ring (has shows coming up) */
export function Portrait({ name, url, size, ring = false }: { name: string; url?: string | null; size: number | string; ring?: boolean }) {
  return (
    <span style={{
      position: 'relative', display: 'block', width: size, aspectRatio: '1 / 1', borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      background: 'linear-gradient(150deg, #1E6E48 0%, #0B2A1C 75%)',
      boxShadow: ring ? `0 0 0 2px ${T.mint}, 0 0 0 5px rgba(3,8,6,0.9)` : '0 0 0 1px rgba(255,255,255,0.08)',
    }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 22%' }} />
      ) : (
        <span aria-hidden style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.display, fontSize: typeof size === 'number' ? size * 0.32 : 30, fontWeight: 800, color: 'rgba(214,251,230,0.55)' }}>{initials(name)}</span>
      )}
    </span>
  );
}

/** Small Follow / Following pill (artists or series) */
export function FollowPill({ kind, slug, label }: { kind: 'artist' | 'series'; slug: string; label?: string }) {
  const { following, busy, toggle } = useFollow(kind, slug);
  return (
    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(); }} disabled={busy}
      aria-pressed={following} aria-label={`${following ? 'Unfollow' : 'Follow'}${label ? ` ${label}` : ''}`}
      style={{
        height: 34, padding: '0 14px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, cursor: 'pointer',
        fontFamily: FONT.sans, fontSize: 13, fontWeight: 700,
        ...(following
          ? { background: 'rgba(255,255,255,0.08)', color: T.white, border: '1px solid rgba(255,255,255,0.14)' }
          : { background: 'rgba(123,227,168,0.14)', color: T.mintText, border: '1px solid rgba(123,227,168,0.35)' }),
      }}>
      {following ? <Check size={14} /> : <Plus size={14} />}{following ? 'Following' : 'Follow'}
    </button>
  );
}

/** The next show: the flyer at full width, whole thing tappable */
export function NextShow({ event }: { event: GhanaEvent }) {
  const d = parseDay(event.date);
  const soon = countdown(event.date);
  return (
    <Link href={`/events/${event.slug}`} style={{ display: 'block', textDecoration: 'none' }}>
      <span style={{ position: 'relative', display: 'block', borderRadius: 24, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={hiRes(event.image, 1200) ?? event.image} alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
        {soon && (
          <span style={{ position: 'absolute', top: 14, left: 14, padding: '6px 12px', borderRadius: 999, background: 'rgba(3,10,6,0.62)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', fontFamily: FONT.sans, fontSize: 13, fontWeight: 700, color: T.mintText }}>{soon}</span>
        )}
      </span>
      <span style={{ display: 'block', marginTop: 16, fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: T.mintText }}>
        {[d ? longDay(d) : event.dateLabel, event.time].filter(Boolean).join(' · ')}
      </span>
      <span style={{ display: 'block', marginTop: 4, fontFamily: FONT.display, fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, color: T.white }}>{event.title}</span>
      <span style={{ display: 'block', marginTop: 4, fontFamily: FONT.sans, fontSize: 15, color: T.text2 }}>{place(event)}</span>
      <span style={{ ...BTN.primary, width: '100%', marginTop: 16, boxSizing: 'border-box' }}>
        {event.price === 0 && !event.priceUnknown && event.listingType !== 'listed' ? 'Reserve a free spot' : 'Get tickets'}
        <span style={{ opacity: 0.65, fontWeight: 600 }}>· {priceLine(event)}</span>
      </span>
    </Link>
  );
}

/** A show in a list: date block, small flyer, title, place (and price when upcoming) */
export function ShowRow({ event, past, rating }: { event: GhanaEvent; past?: boolean; rating?: RatingSummary }) {
  const d = parseDay(event.date);
  return (
    <Link href={`/events/${event.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', textDecoration: 'none', opacity: past ? 0.7 : 1 }}>
      <span style={{ width: 46, flexShrink: 0, textAlign: 'center' }}>
        <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: past ? T.text3 : T.mintText }}>
          {d ? d.toLocaleDateString('en-GB', { month: 'short' }) : '—'}
        </span>
        <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 26, fontWeight: 800, lineHeight: 1.05, color: T.white }}>{d ? d.getDate() : ''}</span>
        {past && d && <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 11, color: T.text3 }}>{d.getFullYear()}</span>}
      </span>
      <span style={{ width: 52, height: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.06)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {event.image && <img src={hiRes(event.image, 240) ?? event.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontFamily: FONT.display, fontSize: 16, fontWeight: 700, lineHeight: 1.25, color: T.white }}>{event.title}</span>
        <span style={{ display: 'block', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT.sans, fontSize: 13, color: T.text3 }}>
          {place(event)}{!past && ` · ${priceLine(event)}`}
        </span>
      </span>
      {rating && <span style={{ flexShrink: 0 }}><ScoreChip score={rating.overall} count={rating.ratings} /></span>}
    </Link>
  );
}

/** A series in a list: last flyer as a thumbnail, name, next edition, follow */
export type SeriesSummary = { slug: string; name: string; usually: string; image: string | null; nextDate: string | null; hostNames: string[]; lastSlug?: string | null };

export function SeriesRow({ s, rating }: { s: SeriesSummary; rating?: RatingSummary }) {
  const d = parseDay(s.nextDate);
  return (
    <Link href={`/shows/${s.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', textDecoration: 'none' }}>
      <span style={{ width: 58, height: 58, borderRadius: 16, overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(150deg, #1E6E48 0%, #0B2A1C 75%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {s.image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={hiRes(s.image, 240) ?? s.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { const i = e.currentTarget; if (i.src.includes('/hq720.jpg')) i.src = i.src.replace('/hq720.jpg', '/hqdefault.jpg'); }} />
          : <span style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 800, color: 'rgba(214,251,230,0.55)' }}>{initials(s.name)}</span>}
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT.display, fontSize: 16, fontWeight: 700, color: T.white }}>{s.name}</span>
        <span style={{ display: 'block', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT.sans, fontSize: 13, color: d ? T.mintText : T.text3 }}>
          {d ? `Next: ${shortDay(d)}` : s.hostNames.length ? `By ${s.hostNames.join(' & ')}` : s.usually}
        </span>
        {rating && <span style={{ display: 'block', marginTop: 3 }}><ScoreChip score={rating.overall} count={rating.ratings} /> <span style={{ fontFamily: FONT.sans, fontSize: 12, color: T.text3 }}>last edition</span></span>}
      </span>
      <FollowPill kind="series" slug={s.slug} label={s.name} />
    </Link>
  );
}

/** Horizontal rail of videos; tapping one opens the viewer at that index */
export function MomentsStrip({ list, onOpen }: { list: Moment[]; onOpen: (i: number) => void }) {
  return (
    <div className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', margin: '0 -20px', padding: '0 20px', scrollSnapType: 'x mandatory' }}>
      {list.map((m, i) => (
        <button key={m.id} type="button" onClick={() => onOpen(i)} style={{ flexShrink: 0, width: 220, padding: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', scrollSnapAlign: 'start' }}>
          <span style={{ position: 'relative', display: 'block', aspectRatio: '16 / 10', borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ytThumb(m.youtube_id, 'hq')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 40, height: 40, borderRadius: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(3,10,6,0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', color: T.white }}>
                <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />
              </span>
            </span>
            {m.year && <span style={{ position: 'absolute', left: 8, top: 8, padding: '3px 8px', borderRadius: 999, background: 'rgba(3,10,6,0.6)', fontFamily: FONT.sans, fontSize: 11, fontWeight: 600, color: T.white }}>{m.year}</span>}
          </span>
          <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: 9, fontFamily: FONT.display, fontSize: 14, fontWeight: 700, lineHeight: 1.3, color: T.white }}>{m.title}</span>
          <span style={{ display: 'block', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT.sans, fontSize: 12, color: T.text3 }}>{m.event_name}</span>
        </button>
      ))}
    </div>
  );
}
