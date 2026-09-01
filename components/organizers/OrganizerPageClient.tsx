'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Ticket, ExternalLink, Calendar } from 'lucide-react';
import type { GhanaEvent } from '@/lib/types';
import { isListedEvent } from '@/lib/types';
import { C, BRAND_NAME } from '@/lib/theme';
import { cityLabel } from '@/lib/utils';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';

export type OrganizerPublic = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
};

function TicketCta({ event }: { event: GhanaEvent }) {
  if (isListedEvent(event) && event.ticketUrl) {
    return (
      <a
        href={event.ticketUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        style={ctaStyle}
      >
        <ExternalLink size={12} />
        {event.ticketSource || 'Tickets'}
      </a>
    );
  }
  return (
    <Link href={`/events/${event.slug}?tickets=1`} onClick={(e) => e.stopPropagation()} style={ctaStyle}>
      <Ticket size={12} />
      {event.price === 0 ? 'RSVP' : 'Get Tickets'}
    </Link>
  );
}

const ctaStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: C.gold,
  color: C.onAccent,
  padding: '8px 12px',
  borderRadius: 6,
  fontFamily: 'var(--font-dm-mono,monospace)',
  fontSize: 8,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  fontWeight: 700,
  textDecoration: 'none' as const,
};

export default function OrganizerPageClient({
  organizer,
  events,
}: {
  organizer: OrganizerPublic;
  events: GhanaEvent[];
}) {
  const display = organizer.fullName || organizer.username;
  const upcoming = events.filter((e) => {
    if (!e.date) return true;
    const d = new Date(e.date);
    if (Number.isNaN(d.getTime())) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d >= today;
  });
  const past = events.filter((e) => !upcoming.includes(e));

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <Nav active="Events" />
      <div
        style={{
          paddingTop: 62,
          maxWidth: 720,
          margin: '0 auto',
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: 80,
        }}
      >
        <Link
          href="/events"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 16,
            marginBottom: 24,
            fontFamily: 'var(--font-dm-mono,monospace)',
            fontSize: 8,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: C.c3,
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={12} /> All events
        </Link>

        <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: '50%',
              overflow: 'hidden',
              border: `2px solid ${C.goldBd}`,
              background: C.bg3,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-cormorant,serif)',
              fontSize: 32,
              color: C.gold,
            }}
          >
            {organizer.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={organizer.avatarUrl}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              (display[0] || 'O').toUpperCase()
            )}
          </div>
          <div>
            <p
              style={{
                fontFamily: 'var(--font-dm-mono,monospace)',
                fontSize: 8,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: C.gold,
                marginBottom: 6,
              }}
            >
              Organizer
            </p>
            <h1
              style={{
                fontFamily: 'var(--font-cormorant,serif)',
                fontSize: 32,
                fontWeight: 400,
                color: C.cream,
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              {display}
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-inter,sans-serif)',
                fontSize: 13,
                color: C.c3,
                marginTop: 6,
              }}
            >
              @{organizer.username} · {events.length} event
              {events.length === 1 ? '' : 's'} on {BRAND_NAME}
            </p>
            {organizer.bio && (
              <p
                style={{
                  fontFamily: 'var(--font-inter,sans-serif)',
                  fontSize: 14,
                  color: C.c2,
                  marginTop: 10,
                  lineHeight: 1.5,
                }}
              >
                {organizer.bio}
              </p>
            )}
          </div>
        </div>

        {events.length === 0 && (
          <div
            style={{
              padding: 32,
              textAlign: 'center',
              border: `1px solid ${C.bd}`,
              borderRadius: 12,
              background: C.bg2,
              color: C.c2,
              fontSize: 14,
            }}
          >
            No published events yet.
          </div>
        )}

        {upcoming.length > 0 && (
          <Section title="Upcoming">
            {upcoming.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </Section>
        )}
        {past.length > 0 && (
          <Section title="Past" muted>
            {past.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </Section>
        )}
      </div>
      <Footer />
    </div>
  );
}

function Section({
  title,
  children,
  muted,
}: {
  title: string;
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <section style={{ marginBottom: 36, opacity: muted ? 0.75 : 1 }}>
      <p
        style={{
          fontFamily: 'var(--font-dm-mono,monospace)',
          fontSize: 8,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: muted ? C.c3 : C.gold,
          opacity: muted ? 1 : 0.85,
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Calendar size={11} /> {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </section>
  );
}

function EventRow({ event }: { event: GhanaEvent }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        alignItems: 'center',
        padding: 12,
        background: C.bg2,
        border: `1px solid ${C.bd}`,
        borderRadius: 12,
      }}
    >
      <Link
        href={`/events/${event.slug}`}
        style={{
          display: 'flex',
          gap: 14,
          alignItems: 'center',
          flex: 1,
          textDecoration: 'none',
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 8,
            overflow: 'hidden',
            background: C.bg3,
            flexShrink: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontFamily: 'var(--font-dm-mono,monospace)',
              fontSize: 8,
              color: C.gold,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              margin: '0 0 4px',
            }}
          >
            {event.dateLabel} · {event.time}
          </p>
          <h3
            style={{
              fontFamily: 'var(--font-cormorant,serif)',
              fontSize: 18,
              fontWeight: 400,
              color: C.cream,
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {event.title}
          </h3>
          <p
            style={{
              fontFamily: 'var(--font-inter,sans-serif)',
              fontSize: 12,
              color: C.c3,
              margin: '4px 0 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {cityLabel(event.city)} · {event.venue}
          </p>
        </div>
      </Link>
      <TicketCta event={event} />
    </div>
  );
}
