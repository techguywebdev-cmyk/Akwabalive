'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { GhanaEvent, City } from '@/lib/types';
import { hiRes } from '@/lib/events/image';
import FriendsStrip from '@/components/social/FriendsStrip';
import { Icon } from '@/components/ui/Icon';
import { EventTags, MetaRows, BTN, PriceTag } from '@/components/events/CardParts';
import { ticketsLabel } from '@/components/events/EventActions';
import { splitEventTitle } from '@/lib/events/title';
import { matchesWhen } from '@/lib/utils';
import { rankScore } from '@/lib/events/rank';
import { parseDay, shortDay } from '@/lib/dates';
import { T, FONT, ACCENTS, alpha } from '@/lib/thiscene';

const CITY_LIST: { value: City | 'all'; label: string }[] = [
  { value: 'all', label: 'Ghana' },
  { value: 'accra', label: 'Accra' },
  { value: 'kumasi', label: 'Kumasi' },
  { value: 'cape-coast', label: 'Cape Coast' },
  { value: 'takoradi', label: 'Takoradi' },
  { value: 'tamale', label: 'Tamale' },
  { value: 'ho', label: 'Ho' },
];

const CAT_ACCENT: Record<string, string> = {
  concert: ACCENTS.rose, festival: ACCENTS.gold, nightlife: ACCENTS.violet, culture: ACCENTS.emerald,
  food: ACCENTS.ember, sports: ACCENTS.sky, tech: ACCENTS.teal, art: ACCENTS.indigo, fashion: ACCENTS.rose, wellness: ACCENTS.lime,
};
const accentOf = (e: GhanaEvent) => CAT_ACCENT[e.category] ?? ACCENTS.gold;
const cityName = (c: string) => CITY_LIST.find((x) => x.value === c)?.label ?? c;

/**
 * One tall event card: the flyer at its own shape and full width (never cropped at the
 * sides), then the details and one button underneath — nothing laid over the flyer.
 */
function TallCard({ event, lead }: { event: GhanaEvent; lead?: string }) {
  const a = accentOf(event);
  const { title, subtitle } = splitEventTitle(event.title);
  const label = ticketsLabel(event);
  const d = parseDay(event.date);
  const when = [d ? shortDay(d) : event.dateLabel, event.time?.toLowerCase()].filter(Boolean).join(' · ');
  const src = hiRes(event.image, 1200) ?? event.image;

  return (
    <article
      aria-label={event.title}
      style={{ borderRadius: 28, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: `radial-gradient(120% 60% at 0% 100%, ${alpha(a, 0.1)} 0%, rgba(0,0,0,0) 70%), rgba(255,255,255,0.035)`, border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <Link href={`/events/${event.slug}`} aria-label={`Open ${event.title}`} style={{ display: 'block', background: '#000' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`${event.title} flyer`} loading="lazy" style={{ display: 'block', width: '100%', height: 'auto' }} />
      </Link>

      <div style={{ padding: '18px 18px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <EventTags event={event} accent={a} lead={lead} />
        <Link href={`/events/${event.slug}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: title.length > 22 ? 28 : 34, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.035em', color: T.white }}>{title}</h2>
          {subtitle && <span style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{subtitle}</span>}
        </Link>
        <FriendsStrip slug={event.slug} />
        <MetaRows when={when} where={event.venue} />
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {label === 'Ended'
            ? <Link href={`/events/${event.slug}`} style={{ ...BTN.secondary, flex: 1 }}>View event</Link>
            : <Link href={`/events/${event.slug}?tickets=1`} style={{ ...BTN.primary, flex: 1 }}>Get tickets <PriceTag text={label} /></Link>}
        </div>
      </div>
    </article>
  );
}

/**
 * Home: a short heading with a city switch, then tall event cards, one after another.
 * Search lives in the header only.
 */
export default function HomeV2({ events }: { events: GhanaEvent[] }) {
  const [city, setCity] = useState<City | 'all'>('all');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try { const c = localStorage.getItem('akw_city'); if (c && CITY_LIST.some((x) => x.value === c)) setCity(c as City | 'all'); } catch { /* ignore */ }
  }, []);
  const pick = (c: City | 'all') => { setCity(c); setOpen(false); try { localStorage.setItem('akw_city', c); } catch { /* ignore */ } };

  const byDate = (a: GhanaEvent, b: GhanaEvent) => (a.date || '').localeCompare(b.date || '');
  const upcoming = useMemo(() => events.filter((e) => matchesWhen(e, 'upcoming')).sort(byDate), [events]);
  const live = upcoming.length > 0;
  const cards = useMemo(() => {
    // Upcoming first (best first, then soonest); with nothing upcoming, the most recent ones
    const pool = (live ? upcoming : [...events].sort((a, b) => byDate(b, a))).filter((e) => city === 'all' || e.city === city);
    const top = [...pool].sort((a, b) => rankScore(b) - rankScore(a))[0];
    return top ? [top, ...pool.filter((e) => e.slug !== top.slug)].slice(0, 12) : [];
  }, [live, upcoming, events, city]);

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: 'calc(80px + env(safe-area-inset-top, 0px)) 12px 0' }}>
      <div style={{ position: 'relative', padding: '4px 8px 18px' }}>
        <h1 style={{ margin: 0, fontFamily: FONT.display, fontSize: 'clamp(30px, 6vw, 44px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.035em', color: T.white }}>
          {live ? 'What’s on in' : 'Recently in'}{' '}
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: 0, background: 'none', border: 'none', color: T.mint, font: 'inherit', letterSpacing: 'inherit', cursor: 'pointer' }}
          >
            {cityName(city)}
            <Icon name="chevron" size={24} strokeWidth={2.2} style={{ marginTop: 4, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }} />
          </button>
        </h1>
        {open && (
          <div role="listbox" aria-label="Choose a city" style={{ position: 'absolute', zIndex: 20, top: '100%', left: 8, marginTop: -6, minWidth: 220, padding: 6, borderRadius: 18, background: 'rgba(8,24,16,0.97)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
            {CITY_LIST.map((c) => (
              <button key={c.value} type="button" role="option" aria-selected={city === c.value} onClick={() => pick(c.value)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 46, padding: '0 14px', borderRadius: 12, border: 'none', background: city === c.value ? 'rgba(123,227,168,0.12)' : 'transparent', color: city === c.value ? T.mint : T.white, fontFamily: FONT.sans, fontSize: 15, fontWeight: 500, cursor: 'pointer', textAlign: 'left' }}>
                {c.value === 'all' ? 'All of Ghana' : c.label}
                {city === c.value && <Icon name="check" size={17} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {cards.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))', gap: 18, alignItems: 'start' }}>
          {cards.map((e, i) => <TallCard key={e.slug} event={e} lead={i === 0 ? (live ? 'Featured' : 'Recently') : undefined} />)}
        </div>
      ) : (
        <div style={{ padding: '60px 8px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 22, fontWeight: 700, color: T.white }}>Nothing listed in {cityName(city)} yet</p>
          <button type="button" onClick={() => pick('all')} style={{ ...BTN.secondary, marginTop: 16 }}>Show all of Ghana</button>
        </div>
      )}

      {cards.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 0 8px' }}>
          <Link href={`/events?view=list${city !== 'all' ? `&city=${city}` : ''}`} style={BTN.secondary}>See all events <Icon name="arrowRight" size={17} /></Link>
        </div>
      )}
    </main>
  );
}
