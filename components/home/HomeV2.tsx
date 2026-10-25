'use client';

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import type { GhanaEvent, City } from '@/lib/types';
import { hiRes } from '@/lib/events/image';
import HomeHero from '@/components/home/HomeHero';
import { Icon, CATEGORY_ICONS } from '@/components/ui/Icon';
import { BTN } from '@/components/events/CardParts';
import { ticketsLabel } from '@/components/events/EventActions';
import { splitEventTitle } from '@/lib/events/title';
import { matchesWhen } from '@/lib/utils';
import { rankScore } from '@/lib/events/rank';
import { parseDay, shortDay } from '@/lib/dates';
import { majorArtists, eventMatchesArtist } from '@/lib/data/artists';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { createClient } from '@/lib/supabase/client';
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
const CAT_LABEL: Record<string, string> = {
  concert: 'Concerts', festival: 'Festivals', nightlife: 'Nightlife', food: 'Food & drink', culture: 'Culture',
  sports: 'Sports', tech: 'Tech', art: 'Art', fashion: 'Fashion', wellness: 'Wellness',
};
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const AV_COLORS = ['#1F5A3F', '#3B2F5C', '#5C3A1F', '#1F3F5C', '#5C1F3A'];

const accentOf = (e: GhanaEvent) => CAT_ACCENT[e.category] ?? ACCENTS.gold;
const cityName = (c: string) => CITY_LIST.find((x) => x.value === c)?.label ?? c;
const whenOf = (e: GhanaEvent) => {
  const d = parseDay(e.date);
  return [d ? shortDay(d) : e.dateLabel, e.time?.toLowerCase()].filter(Boolean).join(' · ');
};

/* ── Pieces ─────────────────────────────────────────────────────────── */

/** The whole flyer in a fixed frame: never cropped, the gaps filled with a blurred copy of itself */
function FramedFlyer({ e, ratio = '4 / 5', radius = 20 }: { e: GhanaEvent; ratio?: string; radius?: number }) {
  const src = hiRes(e.image, 800) ?? e.image;
  return (
    <span style={{ position: 'relative', display: 'block', aspectRatio: ratio, borderRadius: radius, overflow: 'hidden', background: alpha(accentOf(e), 0.15) }}>
      {src && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" aria-hidden loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(22px) saturate(1.2) brightness(0.6)', transform: 'scale(1.2)' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`${e.title} flyer`} loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
        </>
      )}
    </span>
  );
}

function SectionHead({ title, note, href, label = 'See all' }: { title: string; note?: string; href?: string; label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, padding: '0 20px', marginBottom: 14 }}>
      <div style={{ minWidth: 0 }}>
        <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, color: T.white }}>{title}</h2>
        {note && <p style={{ margin: '4px 0 0', fontFamily: FONT.sans, fontSize: 13.5, color: T.text2 }}>{note}</p>}
      </div>
      {href && (
        <Link href={href} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: T.mintText, textDecoration: 'none', paddingBottom: 2 }}>
          {label} <Icon name="arrowRight" size={15} />
        </Link>
      )}
    </div>
  );
}

const rail: CSSProperties = { display: 'flex', gap: 14, overflowX: 'auto', scrollSnapType: 'x mandatory', padding: '0 20px 4px', scrollPaddingLeft: 20 };

function Section({ children, first }: { children: ReactNode; first?: boolean }) {
  return <section style={{ marginTop: first ? 20 : 48 }}>{children}</section>;
}

/** Rail card: whole flyer, then title, date and price */
function RailCard({ e, width = 230, foot }: { e: GhanaEvent; width?: number; foot?: ReactNode }) {
  const { title } = splitEventTitle(e.title);
  const price = ticketsLabel(e);
  return (
    <Link href={`/events/${e.slug}`} style={{ width, flexShrink: 0, scrollSnapAlign: 'start', textDecoration: 'none', color: T.white, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <FramedFlyer e={e} />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 2px' }}>
        <span style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        <span style={{ fontFamily: FONT.sans, fontSize: 13, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{whenOf(e)}</span>
        <span style={{ fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: price === 'Free' ? T.mintText : 'rgba(255,255,255,0.86)' }}>{price === 'Ended' ? e.venue : price === 'Free' ? 'Free' : `From ${price}`}</span>
        {foot}
      </span>
    </Link>
  );
}

type FriendItem = { slug: string; count: number; friends: { id: string; name: string; avatar: string | null }[] };

/* ── Home ───────────────────────────────────────────────────────────── */

/**
 * Home. Opens like an event page — the top event's flyer full width at its own shape, then
 * its title, friends going, date, place and the ticket button — and keeps going as you
 * scroll: this weekend, friends going, browse by vibe, the calendar, free events,
 * artists on tour, cities. Search lives in the header only.
 */
export default function HomeV2({ events }: { events: GhanaEvent[] }) {
  const { user } = useAuth();
  const [city, setCity] = useState<City | 'all'>('all');
  const [open, setOpen] = useState(false);
  const [friendFeed, setFriendFeed] = useState<FriendItem[]>([]);

  useEffect(() => {
    try { const c = localStorage.getItem('akw_city'); if (c && CITY_LIST.some((x) => x.value === c)) setCity(c as City | 'all'); } catch { /* ignore */ }
  }, []);
  const pick = (c: City | 'all') => { setCity(c); setOpen(false); try { localStorage.setItem('akw_city', c); } catch { /* ignore */ } };

  useEffect(() => {
    if (!user) { setFriendFeed([]); return; }
    createClient().auth.getSession().then(({ data }) => {
      const t = data.session?.access_token;
      if (!t) return;
      fetch('/api/events/friends-feed', { headers: { authorization: `Bearer ${t}` } }).then((r) => r.json()).then((j) => setFriendFeed(j.items ?? [])).catch(() => {});
    });
  }, [user]);

  const byDate = (a: GhanaEvent, b: GhanaEvent) => (a.date || '').localeCompare(b.date || '');
  const upcomingAll = useMemo(() => events.filter((e) => matchesWhen(e, 'upcoming')).sort(byDate), [events]);
  const live = upcomingAll.length > 0;
  const inCity = (e: GhanaEvent) => city === 'all' || e.city === city;
  // With nothing upcoming yet, fall back to the most recent events so the page is never empty
  const pool = useMemo(() => (live ? upcomingAll : [...events].sort((a, b) => byDate(b, a))).filter(inCity), [live, upcomingAll, events, city]); // eslint-disable-line react-hooks/exhaustive-deps

  const heroes = useMemo(() => [...pool].sort((a, b) => rankScore(b) - rankScore(a)).slice(0, 5), [pool]);
  const hero = heroes[0];
  // Rails skip what the hero already shows, unless that would leave them empty
  const rest = useMemo(() => { const r = pool.filter((e) => !heroes.includes(e)); return r.length >= 3 ? r : pool.filter((e) => e !== hero); }, [pool, heroes, hero]);

  const weekendOnly = rest.filter((e) => matchesWhen(e, 'weekend'));
  const firstRail = live && weekendOnly.length >= 2
    ? { title: 'This weekend', note: 'Friday to Sunday', items: weekendOnly.slice(0, 10), href: `/events?when=weekend${city !== 'all' ? `&city=${city}` : ''}` }
    : { title: live ? 'Coming up' : 'Recent events', note: live ? 'The next few weeks' : 'While new dates are announced', items: rest.slice(0, 10), href: `/events?view=list${city !== 'all' ? `&city=${city}` : ''}` };

  const bySlug = useMemo(() => new Map(events.map((e) => [e.slug, e])), [events]);
  const friendsGoing = friendFeed.map((f) => ({ f, e: bySlug.get(f.slug) })).filter((x): x is { f: FriendItem; e: GhanaEvent } => !!x.e && matchesWhen(x.e, 'upcoming'));

  const vibes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of pool) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [pool]);

  const calendar = live ? rest.filter((e) => !firstRail.items.includes(e)).slice(0, 6) : [];
  const free = live ? rest.filter((e) => ticketsLabel(e) === 'Free').slice(0, 10) : [];

  const artists = useMemo(() => majorArtists
    .map((a) => ({ a, shows: upcomingAll.filter((e) => eventMatchesArtist(e, a)) }))
    .filter((x) => x.shows.length)
    .slice(0, 10), [upcomingAll]);

  const cities = useMemo(() => CITY_LIST.filter((c) => c.value !== 'all').map((c) => ({
    ...c, n: (live ? upcomingAll : events).filter((e) => e.city === c.value).length,
  })).filter((c) => c.n > 0), [live, upcomingAll, events]);

  /* City switch: the heading under the hero */
  const citySwitch = (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: 0, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT.display, fontSize: 'clamp(30px, 6vw, 40px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.05, color: T.white, textAlign: 'left' }}
      >
        <span>{live ? 'What’s on in' : 'Recently in'} <span style={{ color: T.mint }}>{cityName(city)}</span></span>
        <Icon name="chevron" size={24} strokeWidth={2.4} color={T.mint} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }} />
      </button>
      {open && (
        <div role="listbox" aria-label="Choose a city" style={{ position: 'absolute', zIndex: 20, top: '100%', left: -6, marginTop: 8, minWidth: 220, padding: 6, borderRadius: 18, background: 'rgba(8,24,16,0.97)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
          {CITY_LIST.map((c) => (
            <button key={c.value} type="button" role="option" aria-selected={city === c.value} onClick={() => pick(c.value)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 46, padding: '0 14px', borderRadius: 12, border: 'none', background: city === c.value ? 'rgba(123,227,168,0.12)' : 'transparent', color: city === c.value ? T.mint : T.white, fontFamily: FONT.sans, fontSize: 15, fontWeight: 500, cursor: 'pointer', textAlign: 'left' }}>
              {c.value === 'all' ? 'All of Ghana' : c.label}
              {city === c.value && <Icon name="check" size={17} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (!hero) {
    return (
      <main style={{ maxWidth: 720, margin: '0 auto', padding: 'calc(110px + env(safe-area-inset-top, 0px)) 20px 40px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>{citySwitch}</div>
        <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 24, fontWeight: 700, color: T.white }}>Nothing listed in {cityName(city)} yet</p>
        <button type="button" onClick={() => pick('all')} style={{ ...BTN.secondary, marginTop: 18 }}>Show all of Ghana</button>
      </main>
    );
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* ── Top events, full screen ── */}
      <HomeHero events={heroes} accentOf={accentOf} live={live} />

      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        {/* ── This weekend / Coming up ── */}
        <div style={{ padding: '36px 20px 0' }}>{citySwitch}</div>
        {firstRail.items.length > 0 && (
          <Section first>
            <SectionHead title={firstRail.title} note={firstRail.note} href={firstRail.href} />
            <div className="no-scrollbar" style={rail}>
              {firstRail.items.map((e) => <RailCard key={e.slug} e={e} />)}
            </div>
          </Section>
        )}

        {/* ── Friends going ── */}
        {friendsGoing.length > 0 && (
          <Section>
            <SectionHead title="Your friends are going" note="Plans from people you follow" />
            <div className="no-scrollbar" style={rail}>
              {friendsGoing.map(({ f, e }) => (
                <RailCard
                  key={e.slug}
                  e={e}
                  width={200}
                  foot={
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span style={{ display: 'flex' }}>
                        {f.friends.slice(0, 3).map((p, i) => (
                          <span key={p.id} style={{ width: 24, height: 24, borderRadius: 12, marginLeft: i ? -7 : 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: AV_COLORS[i % AV_COLORS.length], boxShadow: '0 0 0 2px #030806', fontFamily: FONT.sans, fontSize: 10, fontWeight: 700, color: T.white }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {p.avatar ? <img src={p.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (p.name?.[0] ?? '?').toUpperCase()}
                          </span>
                        ))}
                      </span>
                      <span style={{ fontFamily: FONT.sans, fontSize: 12.5, color: T.text2 }}>{f.count} going</span>
                    </span>
                  }
                />
              ))}
            </div>
          </Section>
        )}

        {/* ── Browse by vibe ── */}
        {vibes.length > 1 && (
          <Section>
            <SectionHead title="Find your vibe" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, padding: '0 20px' }}>
              {vibes.map(([cat, n]) => {
                const c = CAT_ACCENT[cat] ?? ACCENTS.gold;
                return (
                  <Link key={cat} href={`/events?category=${cat}${city !== 'all' ? `&city=${city}` : ''}`} style={{ position: 'relative', height: 92, borderRadius: 20, overflow: 'hidden', padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textDecoration: 'none', color: T.white, background: `radial-gradient(120% 120% at 100% 0%, ${alpha(c, 0.32)} 0%, ${alpha(c, 0.06)} 60%), rgba(255,255,255,0.03)` }}>
                    <Icon name={CATEGORY_ICONS[cat] ?? 'sparkle'} size={24} color={c} strokeWidth={1.8} />
                    <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>{CAT_LABEL[cat] ?? cat}</span>
                      <span style={{ fontFamily: FONT.sans, fontSize: 12.5, color: 'rgba(255,255,255,0.6)' }}>{n}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </Section>
        )}

        {/* ── On the calendar: dated list ── */}
        {calendar.length > 0 && (
          <Section>
            <SectionHead title="On the calendar" note="Mark the dates" href={`/events?view=list${city !== 'all' ? `&city=${city}` : ''}`} />
            <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', columnGap: 28 }}>
              {calendar.map((e) => {
                const d = parseDay(e.date);
                const price = ticketsLabel(e);
                return (
                  <Link key={e.slug} href={`/events/${e.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: `1px solid ${T.hairline}`, textDecoration: 'none', color: T.white }}>
                    <span style={{ width: 52, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: accentOf(e) }}>{d ? MON[d.getMonth()] : ''}</span>
                      <span style={{ fontFamily: FONT.display, fontSize: 26, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em' }}>{d ? d.getDate() : '–'}</span>
                    </span>
                    <span style={{ width: 52, flexShrink: 0 }}><FramedFlyer e={e} ratio="1 / 1" radius={12} /></span>
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{splitEventTitle(e.title).title}</span>
                      <span style={{ fontFamily: FONT.sans, fontSize: 13, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[e.venue, cityName(e.city)].filter(Boolean).join(', ')}</span>
                    </span>
                    <span style={{ flexShrink: 0, fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: price === 'Free' ? T.mintText : 'rgba(255,255,255,0.8)' }}>{price}</span>
                  </Link>
                );
              })}
            </div>
          </Section>
        )}

        {/* ── Free ── */}
        {free.length > 1 && (
          <Section>
            <SectionHead title="Free to attend" note="Just show up" href={`/events?price=free${city !== 'all' ? `&city=${city}` : ''}`} />
            <div className="no-scrollbar" style={rail}>
              {free.map((e) => <RailCard key={e.slug} e={e} width={200} />)}
            </div>
          </Section>
        )}

        {/* ── Artists on tour ── */}
        {artists.length > 0 && (
          <Section>
            <SectionHead title="Artists on tour" note="Their next shows in Ghana" />
            <div className="no-scrollbar" style={{ ...rail, gap: 18 }}>
              {artists.map(({ a: ar, shows }, i) => (
                <Link key={ar.slug} href={`/artists/${ar.slug}`} style={{ width: 84, flexShrink: 0, scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textDecoration: 'none', color: T.white }}>
                  <span style={{ width: 76, height: 76, borderRadius: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: AV_COLORS[i % AV_COLORS.length], boxShadow: `0 0 0 2px #030806, 0 0 0 4px ${alpha(T.mint, 0.5)}`, fontFamily: FONT.display, fontSize: 22, fontWeight: 800 }}>
                    {ar.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                  <span style={{ fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, textAlign: 'center', lineHeight: 1.2, maxWidth: 84, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ar.name}</span>
                  <span style={{ marginTop: -5, fontFamily: FONT.sans, fontSize: 11.5, color: T.text2 }}>{shows.length} show{shows.length > 1 ? 's' : ''}</span>
                </Link>
              ))}
            </div>
          </Section>
        )}

        {/* ── Cities ── */}
        {cities.length > 1 && (
          <Section>
            <SectionHead title="Around Ghana" />
            <div className="no-scrollbar" style={{ ...rail, gap: 8 }}>
              {cities.map((c) => (
                <button key={c.value} type="button" onClick={() => { pick(c.value); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ flexShrink: 0, height: 44, padding: '0 18px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: city === c.value ? T.onMint : T.white, background: city === c.value ? T.mint : 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {c.label} <span style={{ opacity: 0.6, fontWeight: 500 }}>{c.n}</span>
                </button>
              ))}
            </div>
          </Section>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 20px 8px' }}>
          <Link href={`/events?view=list${city !== 'all' ? `&city=${city}` : ''}`} style={BTN.secondary}>See all events <Icon name="arrowRight" size={17} /></Link>
        </div>
      </div>
    </div>
  );
}
