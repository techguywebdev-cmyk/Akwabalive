'use client';

import type { CSSProperties } from 'react';
import type { GhanaEvent } from '@/lib/types';
import { Icon, CATEGORY_ICONS } from '@/components/ui/Icon';
import { T, FONT, alpha, GRAD } from '@/lib/thiscene';
import { parseDay } from '@/lib/dates';
import type { Hype, HypeKind } from '@/lib/events/hype';
import { Flame, Sparkles, Star, RotateCcw, Zap, PartyPopper, Mic2, GraduationCap } from 'lucide-react';

/** Shared pieces for event cards (feed, home hero) so they stay identical. */

const CATEGORY_LABEL: Record<string, string> = {
  concert: 'Concert', festival: 'Festival', nightlife: 'Nightlife', food: 'Food & drink', culture: 'Culture',
  sports: 'Sports', tech: 'Tech', art: 'Art', fashion: 'Fashion', wellness: 'Wellness',
};

/** "Tonight" / "Tomorrow" / "In 5 days" / "Ended" */
export function whenTag(e: GhanaEvent): { text: string; soon: boolean; past: boolean } | null {
  const d = parseDay(e.date);
  if (!d) return null;
  const today = new Date(new Date().toDateString());
  const n = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (n < 0) return { text: 'Ended', soon: false, past: true };
  if (n === 0) return { text: 'Tonight', soon: true, past: false };
  if (n === 1) return { text: 'Tomorrow', soon: true, past: false };
  if (n <= 30) return { text: `In ${n} days`, soon: n <= 7, past: false };
  return null;
}

export const chip: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 11px', borderRadius: 999,
  fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 600, letterSpacing: '0.01em', whiteSpace: 'nowrap',
};

/**
 * Tags as small frosted chips: the category with its icon in the event's colour,
 * then how soon it is, then Free when it's free. Optional brand chip in front.
 */
const WARM_BG = 'linear-gradient(100deg, #FF6A3D 0%, #FFA53D 100%)';
const HYPE_STYLE: Record<HypeKind, { style: CSSProperties; icon: React.ReactNode }> = {
  fast: { style: { background: WARM_BG, color: '#1C0B03', boxShadow: '0 0 18px rgba(255,120,60,0.35)' }, icon: <Flame size={14} strokeWidth={2.4} fill="currentColor" /> },
  hot: { style: { background: WARM_BG, color: '#1C0B03', boxShadow: '0 0 18px rgba(255,120,60,0.35)' }, icon: <Flame size={14} strokeWidth={2.4} fill="currentColor" /> },
  last: { style: { background: WARM_BG, color: '#1C0B03', boxShadow: '0 0 18px rgba(255,120,60,0.35)' }, icon: <Zap size={14} strokeWidth={2.4} fill="currentColor" /> },
  soldout: { style: { background: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.85)' }, icon: null },
  pick: { style: { background: GRAD.mint, color: '#06140C' }, icon: <Sparkles size={14} strokeWidth={2.4} /> },
  special: { style: { background: 'rgba(255,255,255,0.94)', color: '#0B0F0D' }, icon: <Star size={13} strokeWidth={2.4} fill="currentColor" /> },
  stars: { style: { background: 'rgba(123,227,168,0.16)', color: T.mintText }, icon: <Mic2 size={14} strokeWidth={2.2} /> },
  returning: { style: { background: 'rgba(123,227,168,0.16)', color: T.mintText }, icon: <RotateCcw size={13} strokeWidth={2.4} /> },
  new: { style: { background: 'rgba(123,227,168,0.16)', color: T.mintText }, icon: <Zap size={13} strokeWidth={2.4} /> },
  campus: { style: { background: 'rgba(123,227,168,0.16)', color: T.mintText }, icon: <GraduationCap size={14} strokeWidth={2.2} /> },
  detty: { style: { background: 'rgba(123,227,168,0.16)', color: T.mintText }, icon: <PartyPopper size={14} strokeWidth={2.2} /> },
};

/** A special tag: selling fast, the organiser's own line, an Tsacoal pick… */
export function HypeChip({ hype }: { hype: Hype }) {
  const h = HYPE_STYLE[hype.kind];
  return <span style={{ ...chip, fontWeight: 700, ...h.style }}>{h.icon}{hype.text}</span>;
}

export function EventTags({ event, accent, lead, hype = [], extra, max }: {
  event: GhanaEvent; accent: string; lead?: string; hype?: Hype[];
  /** Ends the row (e.g. the moments button on feed cards) */
  extra?: React.ReactNode;
  /** At most this many tags (most telling first), so the row stays on one line */
  max?: number;
}) {
  const when = whenTag(event);
  const tags: React.ReactNode[] = [
    lead && <span key="lead" style={{ ...chip, background: 'rgba(123,227,168,0.16)', color: T.mintText }}>{lead}</span>,
    ...hype.map((h) => <HypeChip key={h.kind} hype={h} />),
    when && (
      <span key="when" style={{ ...chip, background: 'rgba(255,255,255,0.09)', color: when.past ? 'rgba(255,255,255,0.6)' : T.white }}>
        {when.soon && <span aria-hidden style={{ width: 6, height: 6, borderRadius: 3, background: T.mint, boxShadow: `0 0 8px ${T.mint}` }} />}
        {when.text}
      </span>
    ),
    hype.length < 2 && (
      <span key="cat" style={{ ...chip, background: alpha(accent, 0.18), color: T.white }}>
        <Icon name={CATEGORY_ICONS[event.category] ?? 'sparkle'} size={14} color={accent} strokeWidth={2} />
        {CATEGORY_LABEL[event.category] ?? event.category}
      </span>
    ),
    event.price === 0 && !event.priceUnknown && !when?.past && <span key="free" style={{ ...chip, background: 'rgba(255,255,255,0.09)', color: T.white }}>Free</span>,
  ].filter(Boolean);
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: max ? 'nowrap' : 'wrap', gap: 6, minWidth: 0 }}>
      {max ? tags.slice(0, max) : tags}
      {extra && <span style={{ flexShrink: 0, display: 'inline-flex' }}>{extra}</span>}
    </div>
  );
}

/** Date and place as two quiet rows with icons. */
export function MetaRows({ when, where }: { when: string; where: string }) {
  const row: CSSProperties = { display: 'flex', alignItems: 'center', gap: 9, fontFamily: FONT.sans, fontSize: 14, color: 'rgba(255,255,255,0.86)', minWidth: 0 };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={row}><Icon name="calendar" size={16} color="rgba(255,255,255,0.55)" /><span style={{ fontWeight: 600 }}>{when}</span></span>
      <span style={row}><Icon name="mapPin" size={16} color="rgba(255,255,255,0.55)" /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.7)' }}>{where}</span></span>
    </div>
  );
}

/** Buttons: solid mint for the main action, frosted glass for the rest. */
export const BTN = {
  primary: {
    height: 50, padding: '0 22px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    background: GRAD.mint, color: T.onMint, border: 'none', cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap',
    fontFamily: FONT.display, fontSize: 15, fontWeight: 700, boxShadow: '0 8px 24px rgba(123,227,168,0.22)',
  } as CSSProperties,
  secondary: {
    height: 50, padding: '0 20px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    background: 'rgba(20,24,22,0.6)', color: T.white, border: 'none', cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap',
    fontFamily: FONT.display, fontSize: 15, fontWeight: 600,
  } as CSSProperties,
};

/** Price inside the primary button, after a hairline */
export function PriceTag({ text }: { text: string }) {
  return (
    <>
      <span aria-hidden style={{ width: 1, height: 18, background: 'rgba(3,19,11,0.25)' }} />
      <span style={{ fontWeight: 600, opacity: 0.8 }}>{text}</span>
    </>
  );
}
