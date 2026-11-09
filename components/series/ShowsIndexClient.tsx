'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import ExploreSwitch from '@/components/explore/ExploreSwitch';
import { ToolsCapsule, SearchDrop, ChoiceSheet } from '@/components/explore/Tools';
import Nav from '@/components/layout/Nav';
import { parseDay, shortDay } from '@/lib/dates';
import { hiRes } from '@/lib/events/image';
import { useMyFollows } from '@/components/follow/useFollow';
import { useRatingSummaries, type RatingSummary } from '@/lib/ratings';
import { ScoreChip } from '@/components/ratings/Stars';
import { SectionTitle, FollowPill, Portrait, countdown, initials, type SeriesSummary } from '@/components/artists/parts';
import { T, FONT, GROUND, GRAD } from '@/lib/thiscene';
import FlyerWall from '@/components/ui/FlyerWall';

/** Cover image; YouTube stills fall back to the always-available smaller still */
function Cover({ src, name, style }: { src: string | null; name: string; style?: React.CSSProperties }) {
  if (!src) {
    return <span aria-hidden style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(150deg, #26302B 0%, #121715 75%)', fontFamily: FONT.display, fontSize: (style?.fontSize as number | undefined) ?? 40, fontWeight: 800, color: 'rgba(214,251,230,0.45)' }}>{initials(name)}</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={hiRes(src, 900) ?? src} alt="" loading="lazy" style={{ ...style, objectFit: 'cover', display: 'block' }}
      onError={(e) => { const i = e.currentTarget; if (i.src.includes('/hq720.jpg')) i.src = i.src.replace('/hq720.jpg', '/hqdefault.jpg'); }} />
  );
}

/** Grid tile: cover with the name over a soft fade */
function Tile({ s, rating }: { s: SeriesSummary; rating?: RatingSummary }) {
  const d = parseDay(s.nextDate);
  return (
    <Link href={`/shows/${s.slug}`} style={{ position: 'relative', display: 'block', aspectRatio: '4 / 5', borderRadius: 20, overflow: 'hidden', textDecoration: 'none', background: 'rgba(255,255,255,0.05)' }}>
      <Cover src={s.image} name={s.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(6,8,7,0) 40%, rgba(6,8,7,0.75) 72%, rgba(6,8,7,0.96) 100%)' }} />
      {rating && <span style={{ position: 'absolute', top: 10, left: 10, padding: '4px 9px', borderRadius: 999, background: 'rgba(3,10,6,0.62)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}><ScoreChip score={rating.overall} /></span>}
      <span style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
        <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontFamily: FONT.display, fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15, color: T.white }}>{s.name}</span>
        <span style={{ display: 'block', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, color: d ? T.mintText : T.text2 }}>
          {d ? `Next: ${shortDay(d)}` : s.hostNames.length ? s.hostNames.join(' & ') : s.usually}
        </span>
      </span>
    </Link>
  );
}

/** Big swipeable card for the top of the page */
function HeroCard({ s, rating }: { s: SeriesSummary; rating?: RatingSummary }) {
  const d = parseDay(s.nextDate);
  return (
    <Link href={`/shows/${s.slug}`} style={{ position: 'relative', display: 'block', aspectRatio: '4 / 5', borderRadius: 26, overflow: 'hidden', textDecoration: 'none', background: 'rgba(255,255,255,0.05)', boxShadow: '0 24px 60px rgba(0,0,0,0.45)' }}>
      <Cover src={s.image} name={s.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(6,8,7,0.35) 0%, rgba(6,8,7,0) 22%, rgba(6,8,7,0) 45%, rgba(10,13,12,0.82) 72%, rgba(6,8,7,0.97) 100%)' }} />
      <span style={{ position: 'absolute', top: 16, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(3,10,6,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', fontFamily: FONT.sans, fontSize: 13, fontWeight: 700, color: d ? T.mintText : T.white }}>
          {d ? countdown(s.nextDate) : s.usually}
        </span>
        {rating && <span style={{ padding: '6px 10px', borderRadius: 999, background: 'rgba(3,10,6,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}><ScoreChip score={rating.overall} /></span>}
      </span>
      <span style={{ position: 'absolute', left: 20, right: 20, bottom: 20 }}>
        {s.hostNames.length > 0 && <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.mintText }}>{s.hostNames.join(' & ')}</span>}
        <span style={{ display: 'block', marginTop: 4, fontFamily: FONT.display, fontSize: 34, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.02, color: T.white }}>{s.name}</span>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12 }}>
          <span style={{ fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, color: T.text }}>{d ? shortDay(d) : 'Date to be announced'}</span>
          <FollowPill kind="series" slug={s.slug} label={s.name} />
        </span>
      </span>
    </Link>
  );
}

export type CalendarItem = { key: string; date: string | null; end: string | null; title: string; sub: string; href: string; image: string | null };

/** A night on the December calendar: big date, name and where, small cover */
function CalendarItemRow({ c }: { c: CalendarItem }) {
  const d = c.date ? new Date(`${c.date}T12:00:00Z`) : null;
  const end = c.end ? new Date(`${c.end}T12:00:00Z`).getUTCDate() : null;
  return (
    <Link href={c.href} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', textDecoration: 'none' }}>
      <span style={{ width: 52, flexShrink: 0, textAlign: 'center' }}>
        <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: d ? T.mintText : T.text3 }}>{d ? d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }) : 'Dec'}</span>
        <span style={{ display: 'block', whiteSpace: 'nowrap', fontFamily: FONT.display, fontSize: d ? (end ? 20 : 28) : 17, fontWeight: 800, lineHeight: d && end ? 1.4 : 1.1, letterSpacing: '-0.03em', color: d ? T.white : T.text3 }}>{d ? `${d.getUTCDate()}${end ? `–${end}` : ''}` : 'TBA'}</span>
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT.display, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>{c.title}</span>
        <span style={{ display: 'block', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT.sans, fontSize: 13, color: T.text3 }}>{c.sub}</span>
      </span>
      <span style={{ width: 56, height: 56, borderRadius: 14, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.05)' }}>
        <Cover src={c.image} name={c.title} style={{ width: '100%', height: '100%', fontSize: 18 } as React.CSSProperties} />
      </span>
    </Link>
  );
}

/** December calendar row: big date, name and host, small cover */
function CalendarRow({ s, rating }: { s: SeriesSummary; rating?: RatingSummary }) {
  const d = parseDay(s.nextDate);
  return (
    <Link href={`/shows/${s.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', textDecoration: 'none' }}>
      <span style={{ width: 48, flexShrink: 0, textAlign: 'center' }}>
        <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: d ? T.mintText : T.text3 }}>{d ? d.toLocaleDateString('en-GB', { month: 'short' }) : 'Dec'}</span>
        <span style={{ display: 'block', fontFamily: FONT.display, fontSize: d ? 28 : 17, fontWeight: 800, lineHeight: 1.1, color: d ? T.white : T.text3 }}>{d ? d.getDate() : 'TBA'}</span>
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT.display, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>{s.name}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, fontFamily: FONT.sans, fontSize: 13, color: T.text3 }}>
          {s.hostNames.length ? s.hostNames.join(' & ') : s.usually.replace(/^Every December · /, '')}
          {rating && <ScoreChip score={rating.overall} />}
        </span>
      </span>
      <span style={{ width: 56, height: 56, borderRadius: 14, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.05)' }}>
        <Cover src={s.image} name={s.name} style={{ width: '100%', height: '100%', fontSize: 18 } as React.CSSProperties} />
      </span>
    </Link>
  );
}

/** A host's portrait with their show's name under it */
function HostCard({ s }: { s: SeriesSummary }) {
  const h = s.hosts?.[0];
  if (!h) return null;
  return (
    <Link href={`/shows/${s.slug}`} style={{ width: 104, flexShrink: 0, textAlign: 'center', textDecoration: 'none', scrollSnapAlign: 'start' }}>
      <Portrait name={h.name} url={h.photo} size={96} ring={!!s.nextDate} />
      <span style={{ display: 'block', marginTop: 10, fontFamily: FONT.display, fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15, color: T.white }}>{s.name}</span>
      <span style={{ display: 'block', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT.sans, fontSize: 12, color: T.text3 }}>{h.name}</span>
    </Link>
  );
}

/** Festival: wide cover with the name over it */
function FestivalCard({ s, rating }: { s: SeriesSummary; rating?: RatingSummary }) {
  const d = parseDay(s.nextDate);
  return (
    <Link href={`/shows/${s.slug}`} style={{ position: 'relative', display: 'block', aspectRatio: '16 / 9', borderRadius: 22, overflow: 'hidden', textDecoration: 'none', background: 'rgba(255,255,255,0.05)' }}>
      <Cover src={s.image} name={s.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(6,8,7,0) 35%, rgba(6,8,7,0.85) 100%)' }} />
      {rating && <span style={{ position: 'absolute', top: 12, right: 12, padding: '4px 9px', borderRadius: 999, background: 'rgba(8,10,9,0.6)' }}><ScoreChip score={rating.overall} /></span>}
      <span style={{ position: 'absolute', left: 16, right: 16, bottom: 14 }}>
        <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: T.white }}>{s.name}</span>
        <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: d ? T.mintText : T.text2 }}>{d ? `Next: ${shortDay(d)}` : s.usually}</span>
      </span>
    </Link>
  );
}

type Kind = 'all' | 'artists' | 'festivals';
type When = 'any' | 'dated' | 'december';

/** Shows that matter most when nothing is announced yet */
const MARQUEE = ['rapperholic', 'detty-rave', 'afro-future', 'tidal-rave'];
const isDecember = (s: SeriesSummary) => /december/i.test(s.usually) || (!!s.nextDate && s.nextDate.slice(5, 7) === '12');

export default function ShowsIndexClient({ series, calendar = [] }: { series: SeriesSummary[]; calendar?: CalendarItem[] }) {
  const mine = useMyFollows('series');
  const ratings = useRatingSummaries(series.map((s) => s.lastSlug).filter(Boolean) as string[]);
  const rate = (s: SeriesSummary) => (s.lastSlug ? ratings[s.lastSlug] : undefined);
  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [kind, setKind] = useState<Kind>('all');
  const [when, setWhen] = useState<When>('any');
  const [slide, setSlide] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  const query = q.trim().toLowerCase();
  const list = series.filter((s) =>
    (kind === 'all' || (kind === 'festivals') === !!s.festival)
    && (when === 'any' || (when === 'dated' ? !!s.nextDate : isDecember(s)))
    && (!query || [s.name, ...s.hostNames, s.usually].join(' ').toLowerCase().includes(query)));
  const filtersOn = kind !== 'all' || when !== 'any';

  const coming = list.filter((s) => s.nextDate).sort((a, b) => String(a.nextDate).localeCompare(String(b.nextDate)));
  const hero = [...coming, ...MARQUEE.map((m) => list.find((s) => s.slug === m)).filter((s): s is SeriesSummary => !!s && !s.nextDate)].slice(0, 5);
  const yours = list.filter((s) => mine.includes(s.slug));
  const december = list.filter(isDecember).sort((a, b) => (a.nextDate ? 0 : 1) - (b.nextDate ? 0 : 1) || String(a.nextDate ?? '').localeCompare(String(b.nextDate ?? '')));
  const hosted = list.filter((s) => !s.festival);
  const festivals = list.filter((s) => s.festival);
  const best = list.filter((s) => rate(s)).sort((a, b) => (rate(b)?.overall ?? 0) - (rate(a)?.overall ?? 0)).slice(0, 5);

  // The header wall: this season's flyers, then show covers
  const wall = Array.from(new Set([...calendar.map((c) => c.image), ...series.map((x) => x.image)]
    .filter((u): u is string => !!u && !/ytimg|youtube/.test(u)).map((u) => hiRes(u, 360) ?? u))).slice(0, 10);

  function onHeroScroll() {
    const el = heroRef.current;
    if (!el) return;
    const w = el.firstElementChild ? (el.firstElementChild as HTMLElement).offsetWidth + 12 : el.clientWidth;
    setSlide(Math.round(el.scrollLeft / w));
  }

  return (
    <div style={{ position: 'relative', minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed', overflowX: 'clip' }}>
      {!query && <FlyerWall images={wall} strength={0.65} height="calc(min(50vw, 240px) + 260px + env(safe-area-inset-top, 0px))" />}
      <Nav active="Shows" tabs plain center={<ExploreSwitch active="shows" />}
        actions={<ToolsCapsule searchOn={searchOpen || !!query} filtersOn={filtersOn} onSearch={() => setSearchOpen((x) => !x)} onFilter={() => setFilterOpen(true)} />} />
      <SearchDrop open={searchOpen} value={q} onChange={setQ} onClose={() => setSearchOpen(false)} placeholder="Search shows or artists" />
      <main style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', padding: `calc(${searchOpen ? 140 : 80}px + env(safe-area-inset-top, 0px)) 20px 120px`, transition: 'padding 200ms ease' }}>
        {query ? (
          <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Shows</h1>
        ) : (
          <header style={{ paddingTop: wall.length ? 'min(36vw, 170px)' : 20, marginBottom: 22 }}>
            <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.mintText }}>Shows</p>
            <h1 style={{ margin: '10px 0 0', fontFamily: FONT.display, fontSize: 'clamp(36px, 10vw, 56px)', fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.045em', paddingBottom: '0.06em', background: GRAD.text, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>The nights Ghana plans around</h1>
            <p style={{ margin: '10px 0 0', maxWidth: 520, fontFamily: FONT.sans, fontSize: 16, lineHeight: 1.5, color: T.text2 }}>The concerts and festivals that come back every year. Follow one and we’ll tell you when the next date drops.</p>
          </header>
        )}

        {query ? (
          <section>
            <SectionTitle>Results for “{q.trim()}”</SectionTitle>
            {list.length
              ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>{list.map((s) => <Tile key={s.slug} s={s} rating={rate(s)} />)}</div>
              : <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 15, color: T.text3 }}>No show matches “{q.trim()}” yet.</p>}
          </section>
        ) : (
          <>
            {hero.length > 0 && (
              <>
                <div ref={heroRef} onScroll={onHeroScroll} className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', margin: '0 -20px', padding: '0 20px 4px', scrollSnapType: 'x mandatory' }}>
                  {hero.map((s) => (
                    <div key={s.slug} style={{ flex: '0 0 calc(100% - 28px)', maxWidth: 420, scrollSnapAlign: 'center' }}>
                      <HeroCard s={s} rating={rate(s)} />
                    </div>
                  ))}
                </div>
                {hero.length > 1 && (
                  <div aria-hidden style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
                    {hero.map((s, i) => <span key={s.slug} style={{ width: i === slide ? 18 : 6, height: 6, borderRadius: 3, background: i === slide ? T.mint : 'rgba(255,255,255,0.22)', transition: 'width 200ms ease, background 200ms ease' }} />)}
                  </div>
                )}
              </>
            )}

            {yours.length > 0 && (
              <section style={{ marginTop: 36 }}>
                <SectionTitle>Your shows</SectionTitle>
                <div className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', margin: '0 -20px', padding: '0 20px' }}>
                  {yours.map((s) => <div key={s.slug} style={{ width: 140, flexShrink: 0 }}><Tile s={s} rating={rate(s)} /></div>)}
                </div>
              </section>
            )}

            {(calendar.length > 0 || december.length > 0) && (
              <section style={{ marginTop: 38 }}>
                <SectionTitle>The December calendar</SectionTitle>
                {calendar.length > 0
                  ? calendar.map((c) => <CalendarItemRow key={c.key} c={c} />)
                  : december.map((s) => <CalendarRow key={s.slug} s={s} rating={rate(s)} />)}
                <Link href="/december" style={{ marginTop: 14, height: 46, padding: '0 18px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(123,227,168,0.14)', color: T.mintText, fontFamily: FONT.display, fontSize: 14.5, fontWeight: 700, textDecoration: 'none' }}>Every night of Detty December →</Link>
              </section>
            )}

            {hosted.length > 0 && (
              <section style={{ marginTop: 38 }}>
                <SectionTitle>Hosted by the artists</SectionTitle>
                <div className="no-scrollbar" style={{ display: 'flex', gap: 14, overflowX: 'auto', margin: '0 -20px', padding: '6px 20px 2px', scrollSnapType: 'x mandatory' }}>
                  {hosted.map((s) => <HostCard key={s.slug} s={s} />)}
                </div>
              </section>
            )}

            {festivals.length > 0 && (
              <section style={{ marginTop: 38 }}>
                <SectionTitle>Festivals</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {festivals.map((s) => <FestivalCard key={s.slug} s={s} rating={rate(s)} />)}
                </div>
              </section>
            )}

            {best.length > 0 && (
              <section style={{ marginTop: 38 }}>
                <SectionTitle>Best rated</SectionTitle>
                {best.map((s, i) => (
                  <Link key={s.slug} href={`/shows/${s.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', textDecoration: 'none' }}>
                    <span style={{ width: 28, fontFamily: FONT.display, fontSize: 26, fontWeight: 800, color: T.text3 }}>{i + 1}</span>
                    <span style={{ flex: 1, fontFamily: FONT.display, fontSize: 17, fontWeight: 700, color: T.white }}>{s.name}</span>
                    <ScoreChip score={rate(s)!.overall} count={rate(s)!.ratings} />
                  </Link>
                ))}
              </section>
            )}

            {!list.length && <p style={{ marginTop: 10, fontFamily: FONT.sans, fontSize: 15, color: T.text3 }}>No shows match these filters.</p>}
          </>
        )}
      </main>

      {filterOpen && (
        <ChoiceSheet title="Filter shows" onClose={() => setFilterOpen(false)} onReset={() => { setKind('all'); setWhen('any'); }}
          resultLabel={`Show ${list.length} show${list.length === 1 ? '' : 's'}`}
          groups={[
            { label: 'Type', value: kind, onChange: setKind, options: [{ value: 'all', label: 'All' }, { value: 'artists', label: 'Artist concerts' }, { value: 'festivals', label: 'Festivals' }] },
            { label: 'When', value: when, onChange: setWhen, options: [{ value: 'any', label: 'Any time' }, { value: 'dated', label: 'Date announced' }, { value: 'december', label: 'December' }] },
          ]} />
      )}
    </div>
  );
}
