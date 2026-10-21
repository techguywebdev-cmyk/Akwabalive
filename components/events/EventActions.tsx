'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { GhanaEvent } from '@/lib/types';
import { isListedEvent } from '@/lib/types';
import { Icon, type IconName } from '@/components/ui/Icon';
import { T, FONT, EASE, alpha } from '@/lib/thiscene';
import { getTiers, type CheckoutTier } from '@/lib/events/tiers';
import { parseDay } from '@/lib/dates';

/* ── Action bar ─────────────────────────────────────────────────────── */

export interface Action {
  key: string;
  icon: IconName;
  label: string;
  /** Accessible name when the visible label is short (a price, a count) */
  aria?: string;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  /** Switched on (going, saved) */
  on?: boolean;
  /** The event's main action, tinted with its colour */
  primary?: boolean;
}

/**
 * Round actions with small labels under them — a row (event page) or a column on the
 * right edge (full-screen feed cards):
 * Tickets (opens the quick ticket view), Going, Save, Share, Directions…
 */
export function ActionBar({ actions, accent, maxWidth = 400, vertical = false }: { actions: Action[]; accent: string; maxWidth?: number; vertical?: boolean }) {
  return (
    <div role="toolbar" aria-label="Event actions" aria-orientation={vertical ? 'vertical' : 'horizontal'} style={vertical ? { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 } : { display: 'flex', justifyContent: 'space-between', gap: 6, maxWidth }}>
      {actions.map((a) => {
        const circle = {
          width: 50, height: 50, borderRadius: 25, display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', transition: 'background 200ms ease, border-color 200ms ease, color 200ms ease',
          ...(a.primary
            ? { background: alpha(accent, 0.24), border: `1px solid ${alpha(accent, 0.65)}`, color: T.white }
            : a.on
              ? { background: alpha(accent, 0.16), border: `1px solid ${alpha(accent, 0.5)}`, color: accent }
              : { background: 'rgba(3,10,6,0.38)', border: '1px solid rgba(255,255,255,0.12)', color: T.white }),
        } as const;
        const inner = (
          <>
            <span style={circle}><Icon name={a.icon} size={22} strokeWidth={a.on ? 2 : 1.7} /></span>
            <span style={{ fontFamily: FONT.sans, fontSize: 11.5, fontWeight: 600, color: a.primary ? T.white : 'rgba(255,255,255,0.78)', textShadow: '0 1px 6px rgba(0,0,0,0.6)', whiteSpace: 'nowrap', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.label}</span>
          </>
        );
        const style = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, minWidth: 56, padding: 0, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'none', color: 'inherit' } as const;
        if (a.href) {
          return a.external
            ? <a key={a.key} href={a.href} target="_blank" rel="noopener noreferrer" aria-label={a.aria ?? a.label} style={style}>{inner}</a>
            : <Link key={a.key} href={a.href} aria-label={a.aria ?? a.label} style={style}>{inner}</Link>;
        }
        return <button key={a.key} type="button" onClick={a.onClick} aria-label={a.aria ?? a.label} aria-pressed={a.on} style={style}>{inner}</button>;
      })}
    </div>
  );
}

/** "GH₵ 150" / "Free" / "Ended" for the Tickets action */
export function ticketsLabel(e: GhanaEvent) {
  const d = parseDay(e.date);
  if (d && d.getTime() < new Date(new Date().toDateString()).getTime()) return 'Ended';
  const tiers = getTiers(e).filter((t) => t.available);
  const from = tiers.length ? Math.min(...tiers.map((t) => t.price)) : e.price;
  return from === 0 ? 'Free' : `GH₵ ${from.toLocaleString()}`;
}

/* ── Quick ticket view ──────────────────────────────────────────────── */

/**
 * Bottom sheet with the event's ticket types, opened from the Tickets action. Buying
 * hands over to the checkout (`onBuy`), RSVP for free events (`onRsvp`), or the
 * official site for events sold elsewhere.
 */
export function TicketsSheet({
  event, accent, onClose, onBuy, onRsvp, footer,
}: {
  event: GhanaEvent;
  accent: string;
  onClose: () => void;
  onBuy: (tiers: CheckoutTier[]) => void;
  onRsvp?: () => void;
  footer?: ReactNode;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(t); window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const tiers = getTiers(event);
  const listed = isListedEvent(event) && !!event.ticketUrl;
  const d = parseDay(event.date);
  const past = !!d && d.getTime() < new Date(new Date().toDateString()).getTime();
  const sellable = tiers.some((t) => t.id && t.available);
  const free = tiers.length > 0 && tiers.every((t) => t.price === 0);

  const cta = { flex: 1, height: 52, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: FONT.display, fontSize: 15, fontWeight: 700, textDecoration: 'none', cursor: 'pointer', color: T.white, background: alpha(accent, 0.24), border: `1px solid ${alpha(accent, 0.65)}` } as const;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 320, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <button type="button" aria-label="Close" onClick={onClose} style={{ position: 'absolute', inset: 0, border: 'none', cursor: 'default', background: 'rgba(1,4,3,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', opacity: shown ? 1 : 0, transition: 'opacity 260ms ease' }} />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Tickets for ${event.title}`}
        style={{
          position: 'relative', width: '100%', maxWidth: 520, maxHeight: '80svh', overflowY: 'auto',
          borderRadius: '28px 28px 0 0', borderTop: '1px solid rgba(255,255,255,0.1)',
          background: `radial-gradient(90% 40% at 0% 0%, ${alpha(accent, 0.12)} 0%, rgba(0,0,0,0) 70%), linear-gradient(180deg, rgba(14,44,30,0.98) 0%, #040B07 100%)`,
          padding: '10px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
          transform: shown ? 'translateY(0)' : 'translateY(100%)', transition: `transform 320ms ${EASE.sheet}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 12 }}>
          <span style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: accent }}>Tickets</p>
            <h2 style={{ margin: '6px 0 0', fontFamily: FONT.display, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, color: T.white }}>{event.title}</h2>
            <p style={{ margin: '6px 0 0', fontFamily: FONT.sans, fontSize: 13, color: T.text2 }}>{[event.dateLabel, event.time, event.venue].filter(Boolean).join(' · ')}</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: 'none', color: T.text, cursor: 'pointer' }}>
            <Icon name="close" size={20} />
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          {listed ? (
            <p style={{ margin: '8px 0 0', fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.6, color: T.text2 }}>
              Tickets are sold by {event.ticketSource || 'the organiser'}, not on Akwaaba. Buy only on the official page.
            </p>
          ) : (
            tiers.map((t, i) => (
              <div key={t.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderTop: i ? `1px solid ${T.hairline}` : 'none', color: t.available ? T.white : 'rgba(255,255,255,0.4)' }}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <span style={{ fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, textDecoration: t.available ? 'none' : 'line-through' }}>{t.name}</span>
                  <span style={{ fontFamily: FONT.sans, fontSize: 13, color: !t.available ? 'rgba(255,255,255,0.4)' : t.spots <= 20 ? accent : T.text2 }}>
                    {!t.available ? 'Sold out' : t.spots <= 20 ? `Only ${t.spots} left` : t.desc}
                  </span>
                </span>
                <span style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: 700, color: t.price === 0 && t.available ? T.mintText : undefined }}>
                  {t.price === 0 ? 'Free' : `GH₵ ${t.price.toLocaleString()}`}
                </span>
              </div>
            ))
          )}
        </div>

        {!listed && !past && (
          <p style={{ margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT.sans, fontSize: 12.5, color: 'rgba(255,255,255,0.5)' }}>
            <Icon name="lock" size={15} /> MoMo or card · secured by Paystack · QR ticket sent instantly
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          {past ? (
            <span style={{ ...cta, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: T.text2, cursor: 'default' }}>This event has ended</span>
          ) : listed ? (
            <a href={event.ticketUrl!} target="_blank" rel="noopener noreferrer" style={cta}>Buy on {event.ticketSource || 'official site'} <Icon name="open" size={16} /></a>
          ) : free && onRsvp ? (
            <button type="button" onClick={onRsvp} style={cta}>Reserve a free spot</button>
          ) : sellable ? (
            <button type="button" onClick={() => onBuy(tiers)} style={cta}>Choose tickets</button>
          ) : (
            <span style={{ ...cta, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: T.text2, cursor: 'default', fontSize: 14 }}>Not on sale on Akwaaba yet</span>
          )}
        </div>
        {footer}
      </section>
    </div>
  );
}
