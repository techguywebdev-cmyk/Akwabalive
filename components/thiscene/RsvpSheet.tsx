'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { GhanaEvent } from '@/lib/types';
import { T, TYPE, RADIUS, EASE, ambient } from '@/lib/thiscene';
import { confirmTicket } from '@/lib/payments/client';
import { Icon } from '@/components/ui/Icon';
import GlassPill from './GlassPill';
import Ticket from './Ticket';
import { countdownText, dayName, statLine } from './dates';

/**
 * RSVP for free events, presented as a Thiscene Ticket on the event's ambient gradient.
 * "Going" issues a free ticket when the event has a free tier on Akwaaba, and marks the
 * viewer as going either way.
 */
export default function RsvpSheet({
  event, accent, user, alreadyGoing, onGoing, onClose,
}: {
  event: GhanaEvent;
  accent: string;
  user: User | null;
  alreadyGoing: boolean;
  /** Marks the viewer as going (event_attendance) */
  onGoing: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [state, setState] = useState<'invite' | 'busy' | 'done'>(alreadyGoing ? 'done' : 'invite');
  const [error, setError] = useState('');
  const [shown, setShown] = useState(false);

  useEffect(() => { const t = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(t); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const freeTier = event.tiers?.find((t) => t.price === 0 && t.quantity - t.sold > 0);

  async function going() {
    if (!user) { window.location.href = `/auth?next=${encodeURIComponent(window.location.pathname + window.location.search)}`; return; }
    setError('');
    setState('busy');
    try {
      if (freeTier) await confirmTicket({ eventSlug: event.slug, tierId: freeTier.id });
      await onGoing();
      setState('done');
    } catch (e: any) {
      setError(e?.message || 'Could not save your RSVP. Check your connection and try again.');
      setState('invite');
    }
  }

  const d = event.date?.slice(0, 10).replace(/-/g, '');
  const next = (() => {
    const t = new Date(`${event.date}T00:00:00`); t.setDate(t.getDate() + 1);
    return t.toISOString().slice(0, 10).replace(/-/g, '');
  })();
  const calendar = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${d}/${next}&location=${encodeURIComponent(`${event.venue}, Ghana`)}`;

  async function share() {
    const url = `${window.location.origin}/events/${event.slug}`;
    try {
      if (navigator.share) { await navigator.share({ title: event.title, text: `I'm going to ${event.title}`, url }); return; }
      await navigator.clipboard.writeText(url);
    } catch { /* ignore */ }
  }

  const done = state === 'done';

  return (
    <div role="dialog" aria-modal="true" aria-label={`RSVP to ${event.title}`} style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <button type="button" aria-label="Close" onClick={onClose} style={{ position: 'absolute', inset: 0, border: 'none', cursor: 'default', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', opacity: shown ? 1 : 0, transition: 'opacity 320ms ease' }} />
      <section
        style={{
          position: 'relative', width: '100%', maxWidth: 480, maxHeight: '92svh', overflowY: 'auto',
          background: ambient(accent), borderRadius: `${RADIUS.sheet}px ${RADIUS.sheet}px 0 0`,
          borderTop: `1px solid ${T.hairlineStrong}`,
          padding: '10px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
          transform: shown ? 'translateY(0)' : 'translateY(100%)', transition: `transform 320ms ${EASE.sheet}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 12 }}>
          <span style={{ width: 40, height: 4, borderRadius: 2, background: T.hairlineStrong }} />
        </div>
        <p style={{ ...TYPE.eyebrow, color: accent, marginBottom: 6 }}>{done ? 'Your RSVP' : 'Free entry · RSVP'}</p>
        <h2 style={{ ...TYPE.sheetTitle, color: T.text, marginBottom: 18 }}>{done ? "You're going" : 'Save your spot'}</h2>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Ticket
            width={340}
            title={event.title}
            image={event.image}
            accent={accent}
            eyebrow={dayName(event.date)}
            stat={statLine(event)}
            meta={[countdownText(event.date), event.venue].filter(Boolean).join(' · ')}
            notchColor={T.bg}
            stamp={done ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...TYPE.eyebrow, color: T.success }}>
                <Icon name="check" size={12} color={T.success} strokeWidth={2.4} /> Saved
              </span>
            ) : undefined}
            actions={done ? (
              <>
                <GlassPill variant="primary" accent={accent} compact href={calendar} external style={{ flex: 1 }}>
                  <Icon name="calendar" size={16} /> Add to calendar
                </GlassPill>
                <GlassPill variant="secondary" compact onClick={share} style={{ flex: 1 }}>
                  <Icon name="share" size={16} /> Share
                </GlassPill>
              </>
            ) : (
              <>
                <GlassPill variant="primary" accent={accent} compact onClick={going} disabled={state === 'busy'} style={{ flex: 1 }}>
                  {state === 'busy' ? 'Saving…' : 'Going'}
                </GlassPill>
                <GlassPill variant="secondary" compact onClick={onClose} style={{ flex: 1 }}>
                  Not this time
                </GlassPill>
              </>
            )}
          />
        </div>

        {error && <p role="alert" style={{ ...TYPE.meta, color: T.danger, textAlign: 'center', marginTop: 14 }}>{error}</p>}
        {!user && !done && (
          <p style={{ ...TYPE.meta, color: T.text2, textAlign: 'center', marginTop: 14 }}>You&apos;ll sign in first, then come back to save your spot.</p>
        )}
        {done && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            <GlassPill variant="secondary" compact onClick={onClose}>Done</GlassPill>
          </div>
        )}
      </section>
    </div>
  );
}
