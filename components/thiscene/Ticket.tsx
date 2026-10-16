'use client';

import type { ReactNode } from 'react';
import { T, TYPE, RADIUS, alpha, ambient, DEFAULT_ACCENT } from '@/lib/thiscene';

/**
 * Ticket — the vertical invite card (Thiscene): art on top, a dashed perforation with
 * two notches, and a stub with the day, date/time, a countdown and two pills side by side.
 * Background is the ticket's own ambient gradient; border accent ~27%; radius-card.
 */
export default function Ticket({
  title, image, accent = DEFAULT_ACCENT, eyebrow, stat, meta, actions, notchColor = T.bg, stamp, width = 300,
}: {
  title: string;
  image?: string | null;
  accent?: string;
  /** Day in eyebrow style, e.g. "Saturday" */
  eyebrow: string;
  /** Date/time in stat style, e.g. "14 Dec · 6:00 pm" */
  stat: string;
  /** Countdown / venue line, e.g. "Starts in 2 days · Labadi" */
  meta?: string;
  /** Two pills side by side */
  actions?: ReactNode;
  /** Match the notch cut-outs to whatever the ticket sits on */
  notchColor?: string;
  /** Small status above the title, e.g. "You're going" */
  stamp?: ReactNode;
  width?: number | string;
}) {
  return (
    <article
      aria-label={`${title} ticket`}
      style={{
        width, maxWidth: '100%', borderRadius: RADIUS.card, overflow: 'hidden', color: T.text,
        border: `1px solid ${alpha(accent, 0.27)}`,
        background: `radial-gradient(120% 70% at 0% 0%, ${alpha(accent, 0.18)} 0%, transparent 70%), radial-gradient(120% 70% at 100% 100%, ${alpha(accent, 0.14)} 0%, transparent 70%), ${T.bg}`,
      }}
    >
      {/* Art */}
      <div style={{ position: 'relative', aspectRatio: '5 / 4', background: ambient(accent) }}>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: '40%', background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0))' }} />
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 12 }}>
          {stamp && <div style={{ marginBottom: 6 }}>{stamp}</div>}
          <h3 style={{ ...TYPE.cardTitle, fontSize: 24, letterSpacing: '-0.02em', lineHeight: 1.05, color: T.white, margin: 0 }}>{title}</h3>
        </div>
      </div>

      {/* Perforation */}
      <div aria-hidden style={{ position: 'relative', height: 20 }}>
        <span style={{ position: 'absolute', left: 14, right: 14, top: '50%', borderTop: `1.5px dashed ${T.hairlineStrong}` }} />
        <span style={{ position: 'absolute', top: 0, left: -10, width: 20, height: 20, borderRadius: '50%', background: notchColor }} />
        <span style={{ position: 'absolute', top: 0, right: -10, width: 20, height: 20, borderRadius: '50%', background: notchColor }} />
      </div>

      {/* Stub */}
      <div style={{ padding: '6px 16px 16px' }}>
        <div style={{ ...TYPE.eyebrow, color: accent }}>{eyebrow}</div>
        <div style={{ ...TYPE.stat, color: T.text, marginTop: 4 }}>{stat}</div>
        {meta && <div style={{ ...TYPE.meta, color: T.text2, marginTop: 2 }}>{meta}</div>}
        {actions && <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>{actions}</div>}
      </div>
    </article>
  );
}
