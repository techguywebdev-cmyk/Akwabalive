'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import type { GhanaEvent, City } from '@/lib/types';
import type { Moment } from '@/components/moments/types';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { Icon, CATEGORY_ICONS } from '@/components/ui/Icon';
import { EventTags, BTN, PriceTag } from '@/components/events/CardParts';
import { ticketsLabel } from '@/components/events/EventActions';
import { splitEventTitle } from '@/lib/events/title';
import { hiRes } from '@/lib/events/image';
import { matchesWhen } from '@/lib/utils';
import { rankScore } from '@/lib/events/rank';
import { parseDay, shortDay } from '@/lib/dates';
import { majorArtists, eventMatchesArtist } from '@/lib/data/artists';
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
const dayOf = (e: GhanaEvent) => { const d = parseDay(e.date); return d ? shortDay(d) : e.dateLabel; };
const cityName = (c: string) => CITY_LIST.find((x) => x.value === c)?.label ?? c.charAt(0).toUpperCase() + c.slice(1).replace(/-/g, ' ');
const priceText = (e: GhanaEvent) => (e.price === 0 ? 'Free' : `GH₵ ${e.price.toLocaleString()}`);

const h2: CSSProperties = { margin: 0, fontFamily: FONT.display, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: T.white };
const sub: CSSProperties = { margin: '6px 0 0', fontFamily: FONT.sans, fontSize: 13, color: T.text2 };
const rail: CSSProperties = { display: 'flex', gap: 14, overflowX: 'auto', padding: '0 20px', scrollSnapType: 'x mandatory', scrollPaddingLeft: 20 };
const seeAll: CSSProperties = { fontFamily: FONT.sans, fontSize: 13, fontWeight: 500, color: T.mintText, textDecoration: 'none', whiteSpace: 'nowrap' };

function Head({ title, note, href, label = 'See all', dot }: { title: string; note?: string; href?: string; label?: string; dot?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, padding: '0 20px 14px' }}>
      <div>
        <h2 style={{ ...h2, display: 'flex', alignItems: 'center', gap: 9 }}>
          {dot && <span aria-hidden style={{ width: 8, height: 8, borderRadius: 4, background: dot, boxShadow: `0 0 10px ${dot}` }} />}
          {title}
        </h2>
        {note && <p style={sub}>{note}</p>}
      </div>
      {href && <Link href={href} style={seeAll}>{label}</Link>}
    </div>
  );
}

/** Flyer shown whole: blurred copy behind, the flyer fitted on top. */
function Flyer({ src, ratio = '4 / 5', radius = 20 }: { src: string; ratio?: string; radius?: number }) {
  const url = hiRes(src, 1000) ?? src;
  return (
    <span style={{ position: 'relative', display: 'block', width: '100%', aspectRatio: ratio, borderRadius: radius, overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" aria-hidden loading="lazy" style={{ position: 'absolute', inset: '-10%', width: '120%', height: '120%', objectFit: 'cover', filter: 'blur(28px) brightness(0.55) saturate(1.2)' }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
    </span>
  );
}

interface FriendItem { slug: string; count: number; friends: { id: string; username: string; name: string; avatar: string | null }[] }

const AV_COLORS = ['#1F5A3F', '#3B2F5C', '#5C3A1F', '#1F3F5C', '#5C1F3A'];

export default function HomeV2({ events, moments }: { events: GhanaEvent[]; moments: Moment[] }) {
  const { user, profile } = useAuth();
  const [city, setCity] = useState<City | 'all'>('all');
  const [cityOpen, setCityOpen] = useState(false);
  const [greeting, setGreeting] = useState('Akwaaba');
  const [slide, setSlide] = useState(0);
  const [friendFeed, setFriendFeed] = useState<FriendItem[]>([]);
  const carousel = useRef<HTMLDivElement>(null);

  // Remembered city + time-of-day greeting (client only, avoids hydration mismatch)
  useEffect(() => {
    try { const c = localStorage.getItem('akw_city'); if (c && CITY_LIST.some((x) => x.value === c)) setCity(c as City | 'all'); } catch { /* ignore */ }
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
  }, []);
  const pickCity = (c: City | 'all') => { setCity(c); setCityOpen(false); try { localStorage.setItem('akw_city', c); } catch { /* ignore */ } };

  // Friends going (people you follow)
  useEffect(() => {
    if (!user) { setFriendFeed([]); return; }
    createClient().auth.getSession().then(({ data }) => {
      const t = data.session?.access_token;
      if (!t) return;
      fetch('/api/events/friends-feed', { headers: { authorization: `Bearer ${t}` } }).then((r) => r.json()).then((j) => setFriendFeed(j.items ?? [])).catch(() => {});
    });
  }, [user]);

  const inCity = (e: GhanaEvent) => city === 'all' || e.city === city;
  const byDate = (a: GhanaEvent, b: GhanaEvent) => (a.date || '').localeCompare(b.date || '');
  const upcomingAll = useMemo(() => events.filter((e) => matchesWhen(e, 'upcoming')).sort(byDate), [events]);
  const live = upcomingAll.length > 0;
  // Nothing upcoming yet: fall back to the most recent events so the page is never empty
  const pool = useMemo(() => (live ? upcomingAll : [...events].sort((a, b) => byDate(b, a))).filter(inCity), [live, upcomingAll, events, city]); // eslint-disable-line react-hooks/exhaustive-deps

  const featured = useMemo(() => [...pool].sort((a, b) => rankScore(b) - rankScore(a)).slice(0, 5), [pool]);
  const weekend = useMemo(() => {
    const w = pool.filter((e) => matchesWhen(e, 'weekend'));
    return (w.length >= 2 ? w : pool.filter((e) => !featured.slice(0, 1).includes(e))).slice(0, 10);
  }, [pool, featured]);
  const weekendTitle = live ? (pool.some((e) => matchesWhen(e, 'weekend')) ? 'This weekend' : 'Coming up') : 'Recent events';

  const artists = useMemo(() => majorArtists
    .map((a) => {
      const shows = upcomingAll.filter((e) => eventMatchesArtist(e, a));
      return { a, shows, next: shows[0] };
    })
    .filter((x) => x.next)
    .slice(0, 5), [upcomingAll]);

  const cityCounts = useMemo(() => CITY_LIST.filter((c) => c.value !== 'all').map((c) => ({
    ...c, count: (live ? upcomingAll : events).filter((e) => e.city === c.value).length,
  })).filter((c) => c.count > 0), [live, upcomingAll, events]);

  const bySlug = useMemo(() => new Map(events.map((e) => [e.slug, e])), [events]);
  const friendRows = friendFeed.map((f) => ({ ...f, event: bySlug.get(f.slug) })).filter((f) => f.event && matchesWhen(f.event, 'upcoming')).slice(0, 3);

  useEffect(() => {
    const el = carousel.current;
    if (!el) return;
    const on = () => setSlide(Math.round(el.scrollLeft / Math.max(1, (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? el.clientWidth)));
    el.addEventListener('scroll', on, { passive: true });
    return () => el.removeEventListener('scroll', on);
  }, [featured.length]);

  const firstName = (profile?.full_name || profile?.username || '').split(' ')[0];
  const chip = (on = false): CSSProperties => ({
    height: 38, padding: '0 15px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap', textDecoration: 'none',
    fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 500,
    background: on ? 'rgba(123,227,168,0.16)' : 'rgba(255,255,255,0.06)', color: on ? T.white : 'rgba(255,255,255,0.82)',
    border: `1px solid ${on ? 'rgba(123,227,168,0.55)' : 'transparent'}`,
  });
  const cityQ = city !== 'all' ? `&city=${city}` : '';

  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', paddingTop: 'calc(76px + env(safe-area-inset-top, 0px))' }}>
      {/* Greeting, city, search, quick chips */}
      <section style={{ padding: '6px 20px 0' }}>
        <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
          {greeting}{firstName ? `, ${firstName}` : ''}
        </p>
        <h1 style={{ margin: '6px 0 0', fontFamily: FONT.display, fontSize: 'clamp(34px, 7vw, 52px)', fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.035em', color: T.white, position: 'relative' }}>
          What’s on in{' '}
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={cityOpen}
            onClick={() => setCityOpen((o) => !o)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: 0, background: 'none', border: 'none', color: T.mint, font: 'inherit', letterSpacing: 'inherit', cursor: 'pointer' }}
          >
            {cityName(city)}
            <Icon name="chevron" size={26} strokeWidth={2.2} style={{ marginTop: 6, transform: cityOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }} />
          </button>
          {cityOpen && (
            <span role="listbox" aria-label="Choose a city" style={{ position: 'absolute', zIndex: 20, top: '100%', left: 0, marginTop: 10, minWidth: 220, padding: 6, borderRadius: 18, background: 'rgba(8,24,16,0.97)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
              {CITY_LIST.map((c) => (
                <button key={c.value} type="button" role="option" aria-selected={city === c.value} onClick={() => pickCity(c.value)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 46, padding: '0 14px', borderRadius: 12, border: 'none', background: city === c.value ? 'rgba(123,227,168,0.12)' : 'transparent', color: city === c.value ? T.mint : T.white, fontFamily: FONT.sans, fontSize: 15, fontWeight: 500, letterSpacing: 0, cursor: 'pointer', textAlign: 'left' }}>
                  {c.value === 'all' ? 'All of Ghana' : c.label}
                  {city === c.value && <Icon name="check" size={17} />}
                </button>
              ))}
            </span>
          )}
        </h1>

        <form action="/events" method="get" role="search" style={{ marginTop: 18, maxWidth: 640 }}>
          <input type="hidden" name="search" value="1" />
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, height: 52, padding: '0 8px 0 16px', borderRadius: 26, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
            <Icon name="search" size={20} />
            <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Search events</span>
            <input name="q" placeholder="Events, artists, venues" style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: T.white, fontFamily: FONT.sans, fontSize: 15 }} />
          </label>
        </form>

        <div className="no-scrollbar" style={{ display: 'flex', gap: 8, marginTop: 14, overflowX: 'auto', marginRight: -20, paddingRight: 20 }}>
          <Link href={`/events?view=list&when=tonight${cityQ}`} style={chip()}>Tonight</Link>
          <Link href={`/events?view=list&when=weekend${cityQ}`} style={chip()}>This weekend</Link>
          <Link href={`/events?view=list&when=week${cityQ}`} style={chip()}>Next 7 days</Link>
          <Link href={`/events?view=list&price=free${cityQ}`} style={chip()}>Free</Link>
        </div>
      </section>

      {/* Featured carousel */}
      {featured.length > 0 ? (
        <section aria-label="Featured" style={{ marginTop: 28 }}>
          <div ref={carousel} className="no-scrollbar" style={{ ...rail, gap: 12 }}>
            {featured.map((e, i) => {
              const { title, subtitle } = splitEventTitle(e.title);
              const label = ticketsLabel(e);
              return (
                <article key={e.slug} style={{ flex: '0 0 min(86vw, 380px)', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Link href={`/events/${e.slug}`} aria-label={e.title} style={{ display: 'block' }}>
                    <Flyer src={e.image} />
                  </Link>
                  <EventTags event={e} accent={accentOf(e)} lead={i === 0 ? (live ? 'Featured' : 'Recently') : undefined} />
                  <Link href={`/events/${e.slug}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 30, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.035em', color: T.white }}>{title}</h2>
                    {subtitle && <span style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{subtitle}</span>}
                  </Link>
                  <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>{[dayOf(e), e.time?.toLowerCase(), e.venue].filter(Boolean).join(' · ')}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {label === 'Ended'
                      ? <Link href={`/events/${e.slug}`} style={{ ...BTN.secondary, flex: 1, height: 46 }}>View event</Link>
                      : <Link href={`/events/${e.slug}?tickets=1`} style={{ ...BTN.primary, flex: 1, height: 46 }}>Get tickets <PriceTag text={label} /></Link>}
                  </div>
                </article>
              );
            })}
          </div>
          {featured.length > 1 && (
            <div aria-hidden style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
              {featured.map((e, i) => (
                <span key={e.slug} style={{ width: i === slide ? 18 : 6, height: 6, borderRadius: 3, background: i === slide ? T.mint : 'rgba(255,255,255,0.25)', transition: 'width 200ms ease, background 200ms ease' }} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section style={{ margin: '36px 20px 0', padding: '28px 0', borderTop: `1px solid ${T.hairline}`, borderBottom: `1px solid ${T.hairline}` }}>
          <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: T.white }}>Nothing listed in {cityName(city)} yet</p>
          <p style={{ ...sub, marginBottom: 14 }}>Try another city, or see everything on.</p>
          <button type="button" onClick={() => pickCity('all')} style={BTN.secondary}>Show all of Ghana</button>
        </section>
      )}

      {/* Friends going */}
      {friendRows.length > 0 && (
        <section style={{ margin: '36px 20px 0' }}>
          <h2 style={{ ...h2, fontSize: 18, marginBottom: 4 }}>Your friends are going</h2>
          {friendRows.map((f, idx) => (
            <Link key={f.slug} href={`/events/${f.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: idx === friendRows.length - 1 ? 'none' : `1px solid ${T.hairline}`, textDecoration: 'none' }}>
              <span style={{ display: 'flex' }}>
                {f.friends.slice(0, 3).map((p, i) => (
                  <span key={p.id} style={{ width: 34, height: 34, borderRadius: 17, marginLeft: i ? -10 : 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: AV_COLORS[p.id.charCodeAt(0) % AV_COLORS.length], color: '#fff', fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, boxShadow: '0 0 0 2px #030806' }}>
                    {p.avatar
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={p.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (p.name?.[0] ?? '?').toUpperCase()}
                  </span>
                ))}
              </span>
              <span style={{ flex: 1, minWidth: 0, fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.4, color: 'rgba(255,255,255,0.75)' }}>
                <span style={{ color: T.white, fontWeight: 600 }}>{f.friends[0]?.name.split(' ')[0]}{f.count > 1 ? ` and ${f.count - 1} other${f.count > 2 ? 's' : ''}` : ''}</span>
                {' '}{f.count > 1 ? 'are' : 'is'} going to {splitEventTitle(f.event!.title).title}
              </span>
              <Icon name="open" size={18} color="rgba(255,255,255,0.4)" />
            </Link>
          ))}
        </section>
      )}

      {/* This weekend / coming up */}
      {weekend.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <Head title={weekendTitle} href={`/events?view=list${live ? '&when=weekend' : ''}${cityQ}`} />
          <div className="no-scrollbar" style={rail}>
            {weekend.map((e) => (
              <Link key={e.slug} href={`/events/${e.slug}`} style={{ flex: '0 0 170px', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', gap: 10, textDecoration: 'none', color: T.white }}>
                <span style={{ position: 'relative', display: 'block' }}>
                  <Flyer src={e.image} radius={16} />
                  <span style={{ position: 'absolute', left: 10, top: 10, height: 26, padding: '0 10px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', background: 'rgba(3,10,6,0.62)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', fontFamily: FONT.sans, fontSize: 12, fontWeight: 600 }}>{dayOf(e)}</span>
                </span>
                <span style={{ fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{splitEventTitle(e.title).title}</span>
                <span style={{ marginTop: -6, fontFamily: FONT.sans, fontSize: 13, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cityName(e.city)} · {priceText(e)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Artists on tour (initials, never stock photos) */}
      {artists.length > 0 && (
        <section style={{ marginTop: 40, padding: '0 20px' }}>
          <h2 style={h2}>Artists on tour</h2>
          <p style={{ ...sub, marginBottom: 6 }}>Their next shows, as soon as they’re announced</p>
          {artists.map(({ a, shows, next }, i) => (
            <Link key={a.slug} href={`/artists/${a.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i === artists.length - 1 ? 'none' : `1px solid ${T.hairline}`, textDecoration: 'none', color: T.white }}>
              <span style={{ width: 46, height: 46, borderRadius: 23, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: AV_COLORS[i % AV_COLORS.length], fontFamily: FONT.display, fontSize: 16, fontWeight: 800 }}>
                {a.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontFamily: FONT.sans, fontSize: 15, fontWeight: 600 }}>{a.name}</span>
                <span style={{ fontFamily: FONT.sans, fontSize: 13, color: T.text2 }}>Next: {cityName(next!.city)}, {dayOf(next!)}{shows.length > 1 ? ` · ${shows.length} shows` : ''}</span>
              </span>
              <span style={{ height: 34, padding: '0 14px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.16)', fontFamily: FONT.sans, fontSize: 13, fontWeight: 600 }}>Dates</span>
            </Link>
          ))}
        </section>
      )}

      {/* Moments */}
      {moments.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <Head title="Moments" note="Relive shows through the crowd’s videos" href="/moments" label="Watch all" />
          <div className="no-scrollbar" style={{ ...rail, gap: 10 }}>
            {moments.slice(0, 8).map((m) => (
              <Link key={m.id} href={`/moments?id=${m.id}`} style={{ flex: '0 0 132px', height: 236, scrollSnapAlign: 'start', borderRadius: 16, overflow: 'hidden', position: 'relative', display: 'block', textDecoration: 'none', color: T.white, background: 'rgba(255,255,255,0.05)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://i.ytimg.com/vi/${m.youtube_id}/hqdefault.jpg`} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.8) 100%)' }} />
                <span style={{ position: 'absolute', left: 10, right: 10, bottom: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{m.event_name || m.title}</span>
                  {!!m.view_count && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: FONT.sans, fontSize: 12, color: 'rgba(255,255,255,0.75)' }}><Icon name="play" size={11} filled /> {m.view_count >= 1000 ? `${(m.view_count / 1000).toFixed(m.view_count >= 10000 ? 0 : 1)}k` : m.view_count}</span>}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Browse by vibe */}
      <section style={{ marginTop: 40, padding: '0 20px' }}>
        <h2 style={{ ...h2, marginBottom: 18 }}>Browse by vibe</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', gap: '20px 8px', maxWidth: 720 }}>
          {['concert', 'festival', 'nightlife', 'food', 'culture', 'sports', 'art', 'tech'].map((c) => (
            <Link key={c} href={`/events?category=${c}${cityQ}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'rgba(255,255,255,0.8)', fontFamily: FONT.sans, fontSize: 12, fontWeight: 500 }}>
              <span style={{ width: 56, height: 56, borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: alpha(CAT_ACCENT[c], 0.12), color: CAT_ACCENT[c] }}>
                <Icon name={CATEGORY_ICONS[c]} size={24} />
              </span>
              {{ concert: 'Concerts', festival: 'Festivals', nightlife: 'Nightlife', food: 'Food', culture: 'Culture', sports: 'Sports', art: 'Art', tech: 'Tech' }[c]}
            </Link>
          ))}
        </div>
      </section>

      {/* Around Ghana */}
      {cityCounts.length > 0 && (
        <section style={{ marginTop: 40, padding: '0 20px' }}>
          <h2 style={{ ...h2, marginBottom: 6 }}>Around Ghana</h2>
          {cityCounts.map((c, i) => (
            <Link key={c.value} href={`/events?view=list&city=${c.value}`} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '14px 0', borderBottom: i === cityCounts.length - 1 ? 'none' : `1px solid ${T.hairline}`, textDecoration: 'none', color: T.white }}>
              <span style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>{c.label}</span>
              <span style={{ fontFamily: FONT.sans, fontSize: 13, color: T.text2 }}>{c.count} {live ? 'upcoming' : ''} event{c.count === 1 ? '' : 's'}</span>
            </Link>
          ))}
        </section>
      )}

      {/* Organisers */}
      <section style={{ margin: '44px 20px 0', padding: 24, borderRadius: 24, background: 'radial-gradient(100% 120% at 0% 0%, rgba(123,227,168,0.16) 0%, rgba(123,227,168,0) 60%), rgba(255,255,255,0.03)' }}>
        <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.mint }}>For organizers</p>
        <h2 style={{ ...h2, marginTop: 10, fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05 }}>Sell tickets in minutes</h2>
        <p style={{ margin: '10px 0 18px', maxWidth: 520, fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.55, color: 'rgba(255,255,255,0.65)' }}>
          Set your ticket types, share one link, and get paid by MoMo, Telecel Cash, AirtelTigo or card.
        </p>
        <Link href="/organizer/events/new" style={BTN.primary}>List your event</Link>
      </section>

    </main>
  );
}
