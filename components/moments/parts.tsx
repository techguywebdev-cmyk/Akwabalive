'use client';

import Link from 'next/link';
import { Ticket } from 'lucide-react';
import { C, G, R } from '@/lib/theme';
import type { GhanaEvent } from '@/lib/types';
import type { MomentChapter } from './types';
import { activeChapterIndex, formatCount, formatTime } from './types';
import type { CrowdFace } from '@/hooks/useMomentCrowd';

export const mono = 'var(--font-inter), sans-serif';
export const sans = 'var(--font-inter, sans-serif)';
export const serif = 'var(--font-display), sans-serif';

const shadowText = '0 1px 3px rgba(0,0,0,0.75), 0 2px 14px rgba(0,0,0,0.45)';

/* ── Round glass button for controls over video ─────────────────────── */
export function GlassIcon({
  label, onClick, href, children, size = 44, active = false, activeColor,
}: {
  label: string; onClick?: () => void; href?: string; children: React.ReactNode;
  size?: number; active?: boolean; activeColor?: string;
}) {
  const style: React.CSSProperties = {
    width: size, height: size, borderRadius: size / 2, flexShrink: 0,
    ...G.overlay, border: `1px solid ${active && activeColor ? activeColor : 'rgba(255,255,255,0.18)'}`,
    color: active && activeColor ? activeColor : C.cream,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', padding: 0, textDecoration: 'none',
  };
  if (href) return <Link href={href} aria-label={label} style={style}>{children}</Link>;
  return <button type="button" aria-label={label} onClick={onClick} style={style}>{children}</button>;
}

/* ── Right rail item: glass button + count/label underneath ─────────── */
export function RailItem({
  label, caption, onClick, children, active, activeColor,
}: {
  label: string; caption: string; onClick: () => void; children: React.ReactNode; active?: boolean; activeColor?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <GlassIcon label={label} onClick={onClick} size={48} active={active} activeColor={activeColor}>{children}</GlassIcon>
      <span style={{ fontFamily: mono, fontSize: 11, color: C.cream, textShadow: shadowText }}>{caption}</span>
    </div>
  );
}

/* ── Who was there ───────────────────────────────────────────────────── */
export function CrowdLine({ faces, count, iWasThere }: { faces: CrowdFace[]; count: number; iWasThere: boolean }) {
  if (count <= 0) return null;
  const names = faces.slice(0, 2).map((f) => f.username);
  const others = Math.max(0, count - names.length);
  const palette = [C.gold, C.green, '#8E1B24'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex' }}>
        {faces.slice(0, 3).map((f, i) => (
          <span
            key={f.id}
            style={{
              width: 24, height: 24, borderRadius: 12, marginLeft: i ? -8 : 0, overflow: 'hidden',
              border: `2px solid ${C.bg}`, background: palette[i % 3], color: i === 0 ? C.onAccent : C.cream,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, fontSize: 10, fontWeight: 700,
            }}
          >
            {f.avatar_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={f.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : f.username[0]?.toUpperCase()}
          </span>
        ))}
      </div>
      <span style={{ fontFamily: sans, fontSize: 12, color: 'rgba(245,236,215,0.88)', textShadow: shadowText }}>
        {iWasThere ? <b style={{ color: C.cream }}>You{names.length ? ', ' : ''}</b> : null}
        {names.length > 0 && <b style={{ color: C.cream }}>{names.join(', ')}</b>}
        {others > 0 ? ` and ${formatCount(others)} ${others === 1 ? 'other' : 'others'}` : ''} were there
      </span>
    </div>
  );
}

/* ── Chapters: chips + segmented scrubber ───────────────────────────── */
export function ChapterBar({
  chapters, current, duration, onSeek,
}: {
  chapters: MomentChapter[]; current: number; duration: number; onSeek: (s: number) => void;
}) {
  if (!chapters.length) return null;
  const active = activeChapterIndex(chapters, current);
  const total = duration > 0 ? duration : chapters[chapters.length - 1].startSeconds + 60;
  const segs = chapters.map((c, i) => {
    const end = i < chapters.length - 1 ? chapters[i + 1].startSeconds : total;
    const len = Math.max(1, end - c.startSeconds);
    const fill = current >= end ? 100 : current <= c.startSeconds ? 0 : ((current - c.startSeconds) / len) * 100;
    return { len, fill };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -12px', padding: '0 12px' }}>
        {chapters.map((c, i) => {
          const on = i === active;
          return (
            <button
              key={`${c.label}-${c.startSeconds}`}
              type="button"
              onClick={() => onSeek(c.startSeconds)}
              aria-current={on ? 'true' : undefined}
              style={{
                flexShrink: 0, height: 40, padding: '0 14px', borderRadius: R.chip, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, fontFamily: mono, fontSize: 11, letterSpacing: '0.3px',
                ...(on
                  ? { background: C.gold, color: C.onAccent, border: `1px solid ${C.gold}` }
                  : { ...G.overlay, color: C.cream, border: '1px solid rgba(255,255,255,0.18)' }),
              }}
            >
              <span style={{ opacity: on ? 0.7 : 0.65 }}>{formatTime(c.startSeconds)}</span>
              {c.label}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: mono, fontSize: 10, color: C.cream, width: 36, textShadow: shadowText }}>{formatTime(current)}</span>
        <div
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(total)}
          aria-valuenow={Math.round(current)}
          tabIndex={0}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * total);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') { e.stopPropagation(); onSeek(Math.min(total, current + 5)); }
            if (e.key === 'ArrowLeft') { e.stopPropagation(); onSeek(Math.max(0, current - 5)); }
          }}
          style={{ flex: 1, display: 'flex', gap: 3, alignItems: 'center', height: 20, cursor: 'pointer' }}
        >
          {segs.map((s, i) => (
            <div key={i} style={{ flex: `${s.len} 1 0px`, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.26)', overflow: 'hidden' }}>
              <div style={{ height: 3, width: `${s.fill}%`, background: C.gold }} />
            </div>
          ))}
        </div>
        <span style={{ fontFamily: mono, fontSize: 10, color: 'rgba(245,236,215,0.75)', width: 36, textAlign: 'right', textShadow: shadowText }}>
          {duration > 0 ? formatTime(duration) : '--:--'}
        </span>
      </div>
    </div>
  );
}

/* ── Next edition ticket card ───────────────────────────────────────── */
export function NextEditionCard({ next, goingCount }: { next: GhanaEvent; goingCount: number }) {
  const d = new Date(`${next.date}T00:00:00`);
  const valid = !Number.isNaN(d.getTime());
  const month = valid ? d.toLocaleString('en-GB', { month: 'short' }).toUpperCase() : '';
  const day = valid ? d.getDate() : '';
  const price = next.price === 0 ? 'Free' : `from ₵${next.price.toLocaleString()}`;
  const href = next.ticketUrl ? next.ticketUrl : `/events/${next.slug}?tickets=1`;
  const external = Boolean(next.ticketUrl);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: R.card, ...G.sheet, border: `1px solid ${C.goldBd}` }}>
      <Link
        href={`/events/${next.slug}`}
        style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, textDecoration: 'none', color: C.cream }}
      >
        <span style={{ width: 52, height: 56, flexShrink: 0, borderRadius: 12, background: C.goldDim, border: `1px solid ${C.goldBd}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '1.5px', color: C.goldText }}>{month}</span>
          <span style={{ fontFamily: serif, fontSize: 26, lineHeight: 1, color: C.cream }}>{day}</span>
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
          <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '1.8px', textTransform: 'uppercase', color: C.goldText }}>Next edition</span>
          <span style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{next.title}</span>
          <span style={{ fontFamily: sans, fontSize: 12, lineHeight: 1.35, color: C.c2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {next.venue} · {price}{goingCount > 0 ? ` · ${formatCount(goingCount)} going` : ''}
          </span>
        </span>
      </Link>
      <a
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        style={{ height: 44, padding: '0 14px', flexShrink: 0, borderRadius: R.btn, background: C.gold, color: C.onAccent, fontFamily: sans, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
      >
        <Ticket size={16} strokeWidth={2.2} />
        {next.price === 0 ? 'RSVP' : 'Tickets'}
      </a>
    </div>
  );
}
