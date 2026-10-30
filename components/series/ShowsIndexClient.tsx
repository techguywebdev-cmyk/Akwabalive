'use client';

import Link from 'next/link';
import ExploreSwitch from '@/components/explore/ExploreSwitch';
import Nav from '@/components/layout/Nav';
import { parseDay, shortDay } from '@/lib/dates';
import { hiRes } from '@/lib/events/image';
import { useMyFollows } from '@/components/follow/useFollow';
import { useRatingSummaries, type RatingSummary } from '@/lib/ratings';
import { ScoreChip } from '@/components/ratings/Stars';
import { SectionTitle, FollowPill, countdown, initials, type SeriesSummary } from '@/components/artists/parts';
import { T, FONT, GROUND } from '@/lib/thiscene';

/** Cover image; YouTube stills fall back to the always-available smaller still */
function Cover({ src, name, style }: { src: string | null; name: string; style?: React.CSSProperties }) {
  if (!src) {
    return <span aria-hidden style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(150deg, #1E6E48 0%, #0B2A1C 75%)', fontFamily: FONT.display, fontSize: 40, fontWeight: 800, color: 'rgba(214,251,230,0.45)' }}>{initials(name)}</span>;
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
      <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,19,12,0) 40%, rgba(5,19,12,0.75) 72%, rgba(5,19,12,0.96) 100%)' }} />
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
      <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,19,12,0.35) 0%, rgba(5,19,12,0) 22%, rgba(5,19,12,0) 45%, rgba(9,34,22,0.82) 72%, rgba(5,19,12,0.97) 100%)' }} />
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

function Shelf({ title, items, rate }: { title: string; items: SeriesSummary[]; rate: (s: SeriesSummary) => RatingSummary | undefined }) {
  if (!items.length) return null;
  return (
    <section style={{ marginTop: 36 }}>
      <SectionTitle>{title}</SectionTitle>
      <div className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', margin: '0 -20px', padding: '0 20px', scrollSnapType: 'x mandatory' }}>
        {items.map((s) => <div key={s.slug} style={{ width: 150, flexShrink: 0, scrollSnapAlign: 'start' }}><Tile s={s} rating={rate(s)} /></div>)}
      </div>
    </section>
  );
}

/** Shows that matter most when nothing is announced yet */
const MARQUEE = ['rapperholic', 'detty-rave', 'afro-future', 'tidal-rave'];

export default function ShowsIndexClient({ series }: { series: SeriesSummary[] }) {
  const mine = useMyFollows('series');
  const ratings = useRatingSummaries(series.map((s) => s.lastSlug).filter(Boolean) as string[]);
  const rate = (s: SeriesSummary) => (s.lastSlug ? ratings[s.lastSlug] : undefined);

  const coming = series.filter((s) => s.nextDate).sort((a, b) => String(a.nextDate).localeCompare(String(b.nextDate)));
  const hero = [...coming, ...MARQUEE.map((m) => series.find((s) => s.slug === m)).filter((s): s is SeriesSummary => !!s && !s.nextDate)].slice(0, 5);
  const yours = series.filter((s) => mine.includes(s.slug));
  const december = series.filter((s) => /december/i.test(s.usually));
  const own = series.filter((s) => s.hostNames.length > 0);
  const festivals = series.filter((s) => s.hostNames.length === 0);
  const best = series.filter((s) => rate(s)).sort((a, b) => (rate(b)?.overall ?? 0) - (rate(a)?.overall ?? 0));

  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed' }}>
      <Nav active="Shows" tabs plain center={<ExploreSwitch active="shows" />} />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: 'calc(78px + env(safe-area-inset-top, 0px)) 20px 120px' }}>
        <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Shows</h1>

        {hero.length > 0 && (
          <div className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', margin: '6px -20px 0', padding: '0 20px 8px', scrollSnapType: 'x mandatory' }}>
            {hero.map((s) => (
              <div key={s.slug} style={{ flex: '0 0 calc(100% - 28px)', maxWidth: 420, scrollSnapAlign: 'center' }}>
                <HeroCard s={s} rating={rate(s)} />
              </div>
            ))}
          </div>
        )}

        <Shelf title="Your shows" items={yours} rate={rate} />
        <Shelf title="Best rated" items={best} rate={rate} />
        <Shelf title="December in Accra" items={december} rate={rate} />
        <Shelf title="Artists’ own concerts" items={own} rate={rate} />
        <Shelf title="Festivals" items={festivals} rate={rate} />
      </main>
    </div>
  );
}
