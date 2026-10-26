'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import Nav from '@/components/layout/Nav';
import { parseDay, longDay, shortDay } from '@/lib/dates';
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

/** Next edition announced: the flyer at full width, details underneath, whole thing tappable */
function Feature({ s }: { s: SeriesSummary }) {
  const d = parseDay(s.nextDate);
  return (
    <Link href={`/shows/${s.slug}`} style={{ display: 'block', textDecoration: 'none' }}>
      <span style={{ position: 'relative', display: 'block', borderRadius: 24, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
        {s.image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={hiRes(s.image, 1200) ?? s.image} alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
          : <Cover src={null} name={s.name} style={{ width: '100%', aspectRatio: '4 / 5' }} />}
        <span style={{ position: 'absolute', top: 14, left: 14, padding: '6px 12px', borderRadius: 999, background: 'rgba(3,10,6,0.62)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', fontFamily: FONT.sans, fontSize: 13, fontWeight: 700, color: T.mintText }}>
          {countdown(s.nextDate)}
        </span>
      </span>
      <span style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginTop: 14 }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: T.mintText }}>{d ? longDay(d) : ''}</span>
          <span style={{ display: 'block', marginTop: 3, fontFamily: FONT.display, fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, color: T.white }}>{s.name}</span>
          {s.hostNames.length > 0 && <span style={{ display: 'block', marginTop: 4, fontFamily: FONT.sans, fontSize: 14, color: T.text3 }}>By {s.hostNames.join(' & ')}</span>}
        </span>
        <span style={{ paddingTop: 4 }}><FollowPill kind="series" slug={s.slug} label={s.name} /></span>
      </span>
    </Link>
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

const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 };

export default function ShowsIndexClient({ series }: { series: SeriesSummary[] }) {
  const [q, setQ] = useState('');
  const mine = useMyFollows('series');
  const ratings = useRatingSummaries(series.map((s) => s.lastSlug).filter(Boolean) as string[]);
  const rate = (s: SeriesSummary) => (s.lastSlug ? ratings[s.lastSlug] : undefined);

  const query = q.trim().toLowerCase();
  const list = useMemo(() => series.filter((s) => !query || [s.name, ...s.hostNames].join(' ').toLowerCase().includes(query)), [series, query]);
  const coming = list.filter((s) => s.nextDate).sort((a, b) => String(a.nextDate).localeCompare(String(b.nextDate)));
  const yours = series.filter((s) => mine.includes(s.slug));
  // Best rated first, then shows with a date, then the rest in our order
  const all = list.map((s, i) => ({ s, i }))
    .sort((a, b) => (rate(b.s)?.overall ?? 0) - (rate(a.s)?.overall ?? 0) || Number(!!b.s.nextDate) - Number(!!a.s.nextDate) || a.i - b.i)
    .map(({ s }) => s);

  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed' }}>
      <Nav active="Shows" tabs plain />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: 'calc(80px + env(safe-area-inset-top, 0px)) 20px 120px' }}>
        <h1 style={{ margin: 0, fontFamily: FONT.display, fontSize: 44, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1, color: T.white }}>Shows</h1>
        <p style={{ margin: '10px 0 0', fontFamily: FONT.sans, fontSize: 16, lineHeight: 1.5, color: T.text2 }}>The nights that come back every year, rated by the people who went.</p>
        <label style={{ position: 'relative', display: 'block', marginTop: 20 }}>
          <Search size={18} aria-hidden style={{ position: 'absolute', left: 18, top: 16, color: T.text3 }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search shows or artists" aria-label="Search shows" type="search"
            style={{ width: '100%', boxSizing: 'border-box', height: 50, padding: '0 18px 0 46px', borderRadius: 999, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: T.white, fontFamily: FONT.sans, fontSize: 16, outline: 'none' }} />
        </label>

        {!query && yours.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <SectionTitle>Your shows</SectionTitle>
            <div className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', margin: '0 -20px', padding: '0 20px' }}>
              {yours.map((s) => <div key={s.slug} style={{ width: 140, flexShrink: 0 }}><Tile s={s} rating={rate(s)} /></div>)}
            </div>
          </section>
        )}

        {coming.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <SectionTitle>Coming up</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
              {coming.map((s) => <Feature key={s.slug} s={s} />)}
            </div>
          </section>
        )}

        <section style={{ marginTop: 40 }}>
          <SectionTitle>{query ? `Results for “${q.trim()}”` : 'All shows'}</SectionTitle>
          {all.length
            ? <div style={grid}>{all.map((s) => <Tile key={s.slug} s={s} rating={rate(s)} />)}</div>
            : <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 15, color: T.text3 }}>No show matches “{q.trim()}” yet.</p>}
        </section>
      </main>
    </div>
  );
}
