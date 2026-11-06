'use client';

import Link from 'next/link';
import type { GhanaEvent } from '@/lib/types';
import { cityLabel } from '@/lib/utils';
import { parseDay, shortDay } from '@/lib/dates';
import { T, FONT, GROUND } from '@/lib/thiscene';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import { PersonAvatar } from '@/components/social/PersonRow';

export type OrganizerPublic = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
};

const eyebrow: React.CSSProperties = { margin: '34px 0 4px', fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' };

const priceText = (e: GhanaEvent) => (e.priceUnknown ? 'Tickets' : e.price === 0 ? 'Free' : `GH₵ ${e.price.toLocaleString()}`);

/** An organiser's public page: who they are, then their upcoming and past events */
export default function OrganizerPageClient({ organizer, events }: { organizer: OrganizerPublic; events: GhanaEvent[] }) {
  const name = organizer.fullName?.trim() || organizer.username;
  const today = new Date(new Date().toDateString()).getTime();
  const upcoming = events.filter((e) => { const d = parseDay(e.date); return !d || d.getTime() >= today; });
  const past = events.filter((e) => !upcoming.includes(e)).reverse();

  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed' }}>
      <Nav back="/" tabs />
      <main style={{ maxWidth: 640, margin: '0 auto', padding: 'calc(76px + env(safe-area-inset-top, 0px)) 20px 60px' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <PersonAvatar p={{ name, avatar: organizer.avatarUrl }} size={84} />
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.mintText }}>Organiser</p>
            <h1 style={{ margin: '4px 0 0', fontFamily: FONT.display, fontSize: 30, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.05, color: T.white }}>{name}</h1>
            <p style={{ margin: '4px 0 0', fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>
              <Link href={`/u/${organizer.username}`} style={{ color: T.text2, textDecoration: 'none' }}>@{organizer.username}</Link> · {events.length} {events.length === 1 ? 'event' : 'events'} on Akwaaba
            </p>
          </div>
        </header>
        {organizer.bio && <p style={{ margin: '18px 0 0', fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.55, color: T.text }}>{organizer.bio}</p>}

        {events.length === 0 && (
          <div style={{ marginTop: 30, padding: '28px 20px', borderRadius: 20, background: T.surface, border: 'none', textAlign: 'center' }}>
            <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 17, fontWeight: 700, color: T.white }}>No events yet</p>
            <p style={{ margin: '6px 0 0', fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>New shows from {name} will show up here.</p>
          </div>
        )}

        {upcoming.length > 0 && <><p style={eyebrow}>Upcoming</p><ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{upcoming.map((e, i) => <Row key={e.slug} event={e} last={i === upcoming.length - 1} />)}</ul></>}
        {past.length > 0 && <><p style={eyebrow}>Past</p><ul style={{ listStyle: 'none', margin: 0, padding: 0, opacity: 0.7 }}>{past.map((e, i) => <Row key={e.slug} event={e} last={i === past.length - 1} />)}</ul></>}
      </main>
      <Footer />
    </div>
  );
}

function Row({ event, last }: { event: GhanaEvent; last: boolean }) {
  const d = parseDay(event.date);
  return (
    <li>
      <Link href={`/events/${event.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: last ? 'none' : `1px solid ${T.hairline}`, textDecoration: 'none' }}>
        <span style={{ width: 64, height: 80, borderRadius: 12, flex: 'none', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {event.image && <img src={event.image} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
        </span>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: T.mintText }}>{[d ? shortDay(d) : event.dateLabel, event.time].filter(Boolean).join(' · ')}</span>
          <span style={{ fontFamily: FONT.sans, fontSize: 16, fontWeight: 600, lineHeight: 1.25, color: T.white, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{event.title}</span>
          <span style={{ fontFamily: FONT.sans, fontSize: 13, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[event.venue, cityLabel(event.city)].filter(Boolean).join(' · ')}</span>
        </span>
        <span style={{ fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: event.price === 0 && !event.priceUnknown ? T.mintText : 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap' }}>{priceText(event)}</span>
      </Link>
    </li>
  );
}
