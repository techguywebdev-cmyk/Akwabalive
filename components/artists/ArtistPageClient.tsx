'use client';

import Link from 'next/link';
import { ArrowLeft, Instagram, ExternalLink, Ticket } from 'lucide-react';
import type { Artist, GhanaEvent } from '@/lib/types';
import { isListedEvent } from '@/lib/types';
import { C, BRAND_NAME } from '@/lib/theme';
import { cityLabel } from '@/lib/utils';
import { LineupChips } from '@/components/ui/LineupChips';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';

function TicketCta({ event }: { event: GhanaEvent }) {
  if (isListedEvent(event) && event.ticketUrl) {
    return (
      <a
        href={event.ticketUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        style={{
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
          textDecoration: 'none',
        }}
      >
        <ExternalLink size={12} />
        {event.ticketSource || 'Tickets'}
      </a>
    );
  }

  return (
    <Link
      href={`/events/${event.slug}?tickets=1`}
      onClick={(e) => e.stopPropagation()}
      style={{
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
        textDecoration: 'none',
      }}
    >
      <Ticket size={12} />
      {event.price === 0 ? 'RSVP' : 'Get Tickets'}
    </Link>
  );
}

export default function ArtistPageClient({
  artist,
  events,
}: {
  artist: Artist;
  events: GhanaEvent[];
}) {
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
      <div style={{ paddingTop: 62, maxWidth: 720, margin: '0 auto', paddingLeft: 16, paddingRight: 16, paddingBottom: 80 }}>
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

        {/* Header */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              overflow: 'hidden',
              border: `2px solid ${C.goldBd}`,
              background: C.bg3,
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={artist.image}
              alt={artist.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
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
              Artist
            </p>
            <h1
              style={{
                fontFamily: 'var(--font-cormorant,serif)',
                fontSize: 36,
                fontWeight: 400,
                color: C.cream,
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              {artist.name}
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-inter,sans-serif)',
                fontSize: 13,
                color: C.c2,
                marginTop: 8,
              }}
            >
              {events.length} show{events.length === 1 ? '' : 's'} on {BRAND_NAME}
              {upcoming.length > 0 ? ` · ${upcoming.length} upcoming` : ''}
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              {artist.instagram && (
                <a
                  href={`https://instagram.com/${artist.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: C.c3, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontSize: 12 }}
                >
                  <Instagram size={14} /> @{artist.instagram}
                </a>
              )}
            </div>
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
            }}
          >
            <p style={{ color: C.c2, fontFamily: 'var(--font-inter,sans-serif)', fontSize: 14 }}>
              No shows listed yet for {artist.name}. Check back — new dates land here as they&apos;re announced.
            </p>
            <Link
              href="/events"
              style={{
                display: 'inline-block',
                marginTop: 16,
                color: C.gold,
                fontFamily: 'var(--font-dm-mono,monospace)',
                fontSize: 9,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}
            >
              Browse all events
            </Link>
          </div>
        )}

        {upcoming.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <p
              style={{
                fontFamily: 'var(--font-dm-mono,monospace)',
                fontSize: 8,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: C.gold,
                opacity: 0.8,
                marginBottom: 14,
              }}
            >
              Upcoming
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcoming.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <p
              style={{
                fontFamily: 'var(--font-dm-mono,monospace)',
                fontSize: 8,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: C.c3,
                marginBottom: 14,
              }}
            >
              Past
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: 0.75 }}>
              {past.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}
      </div>
      <Footer />
    </div>
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
      <Link href={`/events/${event.slug}`} style={{ display: 'flex', gap: 14, alignItems: 'center', flex: 1, textDecoration: 'none', minWidth: 0 }}>
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
          <img
            src={event.image}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
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
              margin: '0 0 4px',
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
              margin: '0 0 6px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {cityLabel(event.city)} · {event.venue}
          </p>
          <LineupChips event={event} compact max={3} />
        </div>
      </Link>
      <div style={{ flexShrink: 0 }}>
        <TicketCta event={event} />
      </div>
    </div>
  );
}
