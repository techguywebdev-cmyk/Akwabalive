'use client';

import type { CSSProperties } from 'react';
import type { GhanaEvent } from '@/lib/types';
import { Icon, CATEGORY_ICONS } from '@/components/ui/Icon';
import { T, FONT, alpha } from '@/lib/thiscene';
import { parseDay } from '@/lib/dates';

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

const chip: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 11px', borderRadius: 999,
  fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 600, letterSpacing: '0.01em', whiteSpace: 'nowrap',
  backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
};

/**
 * Tags as small frosted chips: the category with its icon in the event's colour,
 * then how soon it is, then Free when it's free. Optional brand chip in front.
 */
export function EventTags({ event, accent, lead }: { event: GhanaEvent; accent: string; lead?: string }) {
  const when = whenTag(event);
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
      {lead && (
        <span style={{ ...chip, background: 'rgba(123,227,168,0.16)', color: T.mintText }}>{lead}</span>
      )}
      <span style={{ ...chip, background: alpha(accent, 0.18), color: T.white }}>
        <Icon name={CATEGORY_ICONS[event.category] ?? 'sparkle'} size={14} color={accent} strokeWidth={2} />
        {CATEGORY_LABEL[event.category] ?? event.category}
      </span>
      {when && (
        <span style={{ ...chip, background: 'rgba(255,255,255,0.09)', color: when.past ? 'rgba(255,255,255,0.6)' : T.white }}>
          {when.soon && <span aria-hidden style={{ width: 6, height: 6, borderRadius: 3, background: T.mint, boxShadow: `0 0 8px ${T.mint}` }} />}
          {when.text}
        </span>
      )}
      {event.price === 0 && !event.priceUnknown && !when?.past && (
        <span style={{ ...chip, background: 'rgba(255,255,255,0.09)', color: T.white }}>Free</span>
      )}
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
    background: T.mint, color: T.onMint, border: 'none', cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap',
    fontFamily: FONT.display, fontSize: 15, fontWeight: 700, boxShadow: '0 8px 24px rgba(123,227,168,0.22)',
  } as CSSProperties,
  secondary: {
    height: 50, padding: '0 20px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    background: 'rgba(255,255,255,0.1)', color: T.white, border: '1px solid rgba(255,255,255,0.14)', cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap',
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', fontFamily: FONT.display, fontSize: 15, fontWeight: 600,
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
