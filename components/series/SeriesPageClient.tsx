'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Share2, Check, Repeat } from 'lucide-react';
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
  const rated = past.map((e) => ratings[e.slug]).filter(Boolean);
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

      <header style={{ position: 'relative', overflow: 'hidden', padding: 'calc(110px + env(safe-area-inset-top, 0px)) 20px 6px' }}>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hiRes(cover, 800) ?? cover} alt="" aria-hidden style={{ position: 'absolute', inset: -60, width: 'calc(100% + 120px)', height: 'calc(100% + 120px)', objectFit: 'cover', filter: 'blur(44px) saturate(1.25)', opacity: 0.55 }} />
        )}
        <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,32,21,0.2) 0%, rgba(8,32,21,0.5) 50%, rgba(8,30,20,0.98) 100%)' }} />
        <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto' }}>
          <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.mintText }}>
            <Repeat size={14} /> {series.usually}
          </p>
          <h1 style={{ margin: '8px 0 0', fontFamily: FONT.display, fontSize: series.name.length > 14 ? 42 : 54, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1, color: T.white }}>{series.name}</h1>
          {by && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
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
          <p style={{ margin: '14px 0 0', fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.55, color: T.text2 }}>{series.blurb}</p>
          {lastRated && ratings[lastRated.slug] && (
            <a href={`/events/${lastRated.slug}#ratings`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12, fontFamily: FONT.sans, fontSize: 14, color: T.text2, textDecoration: 'none' }}>
              <ScoreChip score={ratings[lastRated.slug].overall} count={ratings[lastRated.slug].ratings} /> last edition{rated.length > 1 ? ` · ${rated.length} editions rated` : ''}
            </a>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 20 }}>
            <button type="button" onClick={toggle} disabled={busy} style={{ ...(following ? BTN.secondary : BTN.primary), flex: 1, maxWidth: 260, height: 46 }}>
              {following ? <><Check size={17} /> Following</> : `Follow ${series.name}`}
            </button>
            {!!count && <span style={{ fontFamily: FONT.sans, fontSize: 14, color: T.text3 }}><b style={{ color: T.white }}>{compactCount(count)}</b> following</span>}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '30px 20px 120px' }}>
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
