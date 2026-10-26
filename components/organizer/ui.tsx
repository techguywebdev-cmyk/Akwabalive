'use client';

import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { T, FONT, alpha } from '@/lib/thiscene';

/** Shared pieces for the organiser pages, in the app's green design. */

export const card: CSSProperties = { borderRadius: 22, background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.08)' };

export function Stat({ label, value, note, accent = T.mint }: { label: string; value: string; note?: string; accent?: string }) {
  return (
    <div style={{ ...card, padding: '16px 16px 14px', minWidth: 0 }}>
      <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 500, color: T.text2 }}>{label}</p>
      <p style={{ margin: '6px 0 0', fontFamily: FONT.display, fontSize: value.length > 11 ? 19 : value.length > 8 ? 22 : 26, fontWeight: 800, letterSpacing: '-0.03em', color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
      {note && <p style={{ margin: '2px 0 0', fontFamily: FONT.sans, fontSize: 12, color: accent }}>{note}</p>}
    </div>
  );
}

export type EventStatus = 'live' | 'draft' | 'review' | 'ended';
const STATUS: Record<EventStatus, { label: string; color: string }> = {
  live: { label: 'Live', color: T.mint },
  draft: { label: 'Draft', color: 'rgba(255,255,255,0.6)' },
  review: { label: 'In review', color: '#F5C451' },
  ended: { label: 'Ended', color: 'rgba(255,255,255,0.45)' },
};
export function StatusPill({ status }: { status: EventStatus }) {
  const s = STATUS[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 10px', borderRadius: 999, background: alpha(s.color, 0.14), color: s.color, fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
      <span aria-hidden style={{ width: 6, height: 6, borderRadius: 3, background: s.color }} />{s.label}
    </span>
  );
}

/** Thin progress bar (sold / capacity) */
export function Bar({ value, max, color = T.mint }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <span aria-hidden style={{ display: 'block', height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <span style={{ display: 'block', height: '100%', width: `${pct}%`, borderRadius: 3, background: color, transition: 'width 400ms ease' }} />
    </span>
  );
}

export function QuickAction({ href, icon, label, badge, primary }: { href: string; icon: ReactNode; label: string; badge?: number; primary?: boolean }) {
  return (
    <Link href={href} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, padding: 14, minHeight: 92, borderRadius: 20, textDecoration: 'none', boxSizing: 'border-box', background: primary ? T.mint : 'rgba(255,255,255,0.06)', border: primary ? 'none' : '1px solid rgba(255,255,255,0.09)', color: primary ? T.onMint : T.white }}>
      <span style={{ display: 'flex' }}>{icon}</span>
      <span style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.15 }}>{label}</span>
      {!!badge && <span style={{ position: 'absolute', top: 12, right: 12, minWidth: 22, height: 22, padding: '0 6px', borderRadius: 11, background: '#F5C451', color: '#1A1300', fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>{badge}</span>}
    </Link>
  );
}

export const ghs = (n: number) => `GH₵ ${Math.round(n).toLocaleString()}`;
