'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import Nav from '@/components/layout/Nav';
import { parseDay, longDay } from '@/lib/dates';
import { hiRes } from '@/lib/events/image';
import { useMyFollows } from '@/components/follow/useFollow';
import { useRatingSummaries } from '@/lib/ratings';
import { ScoreChip } from '@/components/ratings/Stars';
import { SectionTitle, SeriesRow, FollowPill, countdown, type SeriesSummary } from '@/components/artists/parts';
import { T, FONT, GROUND } from '@/lib/thiscene';

/** A show with its next edition announced: flyer on the left, date and follow on the right */
function ComingUp({ s }: { s: SeriesSummary }) {
  const d = parseDay(s.nextDate);
  return (
    <Link href={`/shows/${s.slug}`} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '10px 0', textDecoration: 'none' }}>
      <span style={{ width: 96, aspectRatio: '4 / 5', borderRadius: 16, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.06)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {s.image && <img src={hiRes(s.image, 400) ?? s.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 13, fontWeight: 700, color: T.mintText }}>{countdown(s.nextDate)}</span>
        <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.display, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>{s.name}</span>
        <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>{d ? longDay(d) : ''}</span>
        {s.hostNames.length > 0 && <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 13, color: T.text3 }}>By {s.hostNames.join(' & ')}</span>}
        <span style={{ display: 'block', marginTop: 10 }}><FollowPill kind="series" slug={s.slug} label={s.name} /></span>
      </span>
    </Link>
  );
}

export default function ShowsIndexClient({ series }: { series: SeriesSummary[] }) {
  const [q, setQ] = useState('');
  const mine = useMyFollows('series');
  const ratings = useRatingSummaries(series.map((s) => s.lastSlug).filter(Boolean) as string[]);
  const rate = (s: SeriesSummary) => (s.lastSlug ? ratings[s.lastSlug] : undefined);

  const query = q.trim().toLowerCase();
  const list = useMemo(() => series.filter((s) => !query || [s.name, ...s.hostNames].join(' ').toLowerCase().includes(query)), [series, query]);
  const coming = list.filter((s) => s.nextDate).sort((a, b) => String(a.nextDate).localeCompare(String(b.nextDate)));
  const yours = series.filter((s) => mine.includes(s.slug));
  // Best rated first, then the rest A–Z
  const all = [...list].sort((a, b) => (rate(b)?.overall ?? 0) - (rate(a)?.overall ?? 0) || a.name.localeCompare(b.name));
  const top = all.filter((s) => rate(s)).slice(0, 3);

  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed' }}>
      <Nav active="Shows" tabs />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: 'calc(80px + env(safe-area-inset-top, 0px)) 20px 120px' }}>
        <h1 style={{ margin: 0, fontFamily: FONT.display, fontSize: 44, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1, color: T.white }}>Shows</h1>
        <p style={{ margin: '10px 0 0', fontFamily: FONT.sans, fontSize: 16, lineHeight: 1.5, color: T.text2 }}>
          The nights that come back every year. Follow a show to catch the next edition, and see how the last one was rated by people who went.
        </p>
        <label style={{ position: 'relative', display: 'block', marginTop: 20 }}>
          <Search size={18} aria-hidden style={{ position: 'absolute', left: 18, top: 16, color: T.text3 }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search shows or artists" aria-label="Search shows" type="search"
            style={{ width: '100%', boxSizing: 'border-box', height: 50, padding: '0 18px 0 46px', borderRadius: 999, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: T.white, fontFamily: FONT.sans, fontSize: 16, outline: 'none' }} />
        </label>

        {!query && yours.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <SectionTitle>Your shows</SectionTitle>
            {yours.map((s) => <SeriesRow key={s.slug} s={s} rating={rate(s)} />)}
          </section>
        )}

        {coming.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <SectionTitle>Next editions announced</SectionTitle>
            {coming.map((s) => <ComingUp key={s.slug} s={s} />)}
          </section>
        )}

        {!query && top.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <SectionTitle>Best rated</SectionTitle>
            {top.map((s) => (
              <Link key={s.slug} href={`/shows/${s.slug}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', textDecoration: 'none' }}>
                <span style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: 700, color: T.white }}>{s.name}</span>
                <ScoreChip score={rate(s)!.overall} count={rate(s)!.ratings} />
              </Link>
            ))}
          </section>
        )}

        <section style={{ marginTop: 32 }}>
          <SectionTitle>{query ? `Results for “${q.trim()}”` : 'All shows'}</SectionTitle>
          {all.length ? all.map((s) => <SeriesRow key={s.slug} s={s} rating={rate(s)} />) : (
            <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 15, color: T.text3 }}>No show matches “{q.trim()}” yet.</p>
          )}
        </section>
      </main>
    </div>
  );
}
