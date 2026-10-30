'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Share2, Check } from 'lucide-react';
import type { GhanaEvent } from '@/lib/types';
import type { Moment } from '@/components/moments/types';
import type { EventSeries } from '@/lib/data/series';
import Nav from '@/components/layout/Nav';
import { BTN } from '@/components/events/CardParts';
import { MomentsViewer } from '@/components/moments/EventMoments';
import { useFollow, compactCount } from '@/components/follow/useFollow';
import { hiRes } from '@/lib/events/image';
import { T, FONT, GROUND } from '@/lib/thiscene';
import { roundBtn, SectionTitle, Portrait, NextShow, ShowRow, MomentsStrip } from '@/components/artists/parts';
import { useRatingSummaries } from '@/lib/ratings';
import { ScoreChip } from '@/components/ratings/Stars';

type Host = { slug: string; name: string; photo: string | null };

/** A show that comes back every year: next edition, past editions, moments, and a Follow button */
export default function SeriesPageClient({ series, upcoming, past, moments, hosts, cover: coverImage = null }: {
  series: EventSeries; upcoming: GhanaEvent[]; past: GhanaEvent[]; moments: Moment[]; hosts: Host[]; cover?: string | null;
}) {
  const { following, count, busy, toggle } = useFollow('series', series.slug);
  const [viewer, setViewer] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [next, ...later] = upcoming;
  const ratings = useRatingSummaries(past.map((e) => e.slug));
  const lastRated = past.find((e) => ratings[e.slug]);
  const cover = (next ?? past[0])?.image ?? coverImage;

  async function share() {
    const url = `${window.location.origin}/shows/${series.slug}`;
    try {
      if (navigator.share) { await navigator.share({ title: `${series.name} on Akwaaba`, url }); return; }
      await navigator.clipboard.writeText(url);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    } catch { /* dismissed */ }
  }

  const by = hosts.length ? hosts.map((h) => h.name).join(' & ') : series.organiser;

  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed' }}>
      <Nav back="/shows" tabs actions={
        <button type="button" onClick={share} aria-label="Share" style={{ ...roundBtn, width: 44, height: 44, borderRadius: 22 }}>{copied ? <Check size={18} /> : <Share2 size={18} />}</button>
      } />

      {/* Hero: the show's picture full width, fading into the page, with the name over it */}
      <header style={{ position: 'relative' }}>
        <div style={{ position: 'relative', height: 'min(118vw, 560px)', overflow: 'hidden', background: 'linear-gradient(150deg, #1E6E48 0%, #0B2A1C 75%)' }}>
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hiRes(cover, 1200) ?? cover} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 30%' }}
              onError={(e) => { const i = e.currentTarget; if (i.src.includes('/hq720.jpg')) i.src = i.src.replace('/hq720.jpg', '/hqdefault.jpg'); }} />
          )}
          <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(3,8,6,0.45) 0%, rgba(3,8,6,0) 22%, rgba(3,8,6,0) 42%, rgba(9,34,22,0.85) 74%, #0A2618 100%)' }} />
          <div style={{ position: 'absolute', left: 20, right: 20, bottom: 18, maxWidth: 640, margin: '0 auto' }}>
            <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.mintText }}>{series.usually}</p>
            <h1 style={{ margin: '6px 0 0', fontFamily: FONT.display, fontSize: series.name.length > 14 ? 40 : 52, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 0.98, color: T.white, textShadow: '0 2px 24px rgba(0,0,0,0.35)' }}>{series.name}</h1>
          </div>
        </div>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '14px 20px 0' }}>
          {by && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {hosts.length > 0 && (
                <span style={{ display: 'flex' }}>
                  {hosts.map((h, i) => <span key={h.slug} style={{ marginLeft: i ? -10 : 0 }}><Portrait name={h.name} url={h.photo} size={34} /></span>)}
                </span>
              )}
              <span style={{ fontFamily: FONT.sans, fontSize: 15, color: T.text2 }}>
                By {hosts.length
                  ? hosts.map((h, i) => <span key={h.slug}>{i ? ' & ' : ''}<Link href={`/artists/${h.slug}`} style={{ color: T.white, fontWeight: 600, textDecoration: 'none' }}>{h.name}</Link></span>)
                  : <span style={{ color: T.white, fontWeight: 600 }}>{series.organiser}</span>}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16 }}>
            <button type="button" onClick={toggle} disabled={busy} style={{ ...(following ? BTN.secondary : BTN.primary), flex: 1, maxWidth: 260, height: 46 }}>
              {following ? <><Check size={17} /> Following</> : 'Follow'}
            </button>
            {lastRated && ratings[lastRated.slug] && (
              <a href={`/events/${lastRated.slug}#ratings`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT.sans, fontSize: 13, color: T.text3, textDecoration: 'none' }}>
                <ScoreChip score={ratings[lastRated.slug].overall} count={ratings[lastRated.slug].ratings} /> last edition
              </a>
            )}
            {!lastRated && !!count && <span style={{ fontFamily: FONT.sans, fontSize: 14, color: T.text3 }}><b style={{ color: T.white }}>{compactCount(count)}</b> following</span>}
          </div>
          <p style={{ margin: '18px 0 0', fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.6, color: T.text2 }}>{series.blurb}</p>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px 120px' }}>
        {next ? (
          <section>
            <SectionTitle>Next edition</SectionTitle>
            <NextShow event={next} />
          </section>
        ) : (
          <section style={{ padding: '6px 0' }}>
            <SectionTitle>Next edition</SectionTitle>
            <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.55, color: T.text2 }}>
              Not announced yet. {following ? 'You’re following — it’ll show up here as soon as it’s out.' : 'Follow and it’ll show up here as soon as it’s out.'}
            </p>
          </section>
        )}

        {later.length > 0 && (
          <section style={{ marginTop: 40 }}>
            <SectionTitle>Also coming up</SectionTitle>
            {later.map((e) => <ShowRow key={e.slug} event={e} />)}
          </section>
        )}

        {moments.length > 0 && (
          <section style={{ marginTop: 40 }}>
            <SectionTitle>Moments</SectionTitle>
            <MomentsStrip list={moments} onOpen={setViewer} />
          </section>
        )}

        {past.length > 0 && (
          <section style={{ marginTop: 40 }}>
            <SectionTitle>Past editions</SectionTitle>
            {past.map((e) => <ShowRow key={e.slug} event={e} past rating={ratings[e.slug]} />)}
          </section>
        )}
      </main>

      {viewer !== null && <MomentsViewer list={moments} start={viewer} eventTitle={series.name} onClose={() => setViewer(null)} />}
    </div>
  );
}
