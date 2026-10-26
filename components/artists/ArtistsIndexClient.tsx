'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import Nav from '@/components/layout/Nav';
import type { ArtistGenre } from '@/lib/types';
import { parseDay, shortDay } from '@/lib/dates';
import { useMyFollows } from '@/components/follow/useFollow';
import { Portrait, SectionTitle } from '@/components/artists/parts';
import { T, FONT, GROUND } from '@/lib/thiscene';

export type ArtistCard = {
  slug: string; name: string; priority: number; upcoming: number; genre: ArtistGenre | null;
  nextDate: string | null; nextTitle: string | null; image: string | null;
  /** The artist's own photo, when we have one */
  photo: string | null;
  /** Spotify followers (popularity), when known */
  fans: number | null;
};

const GENRES: ArtistGenre[] = ['Afrobeats', 'Hip-hop', 'Highlife', 'Dancehall', 'Alté', 'Gospel', 'DJ'];

function Chip({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} style={{
      height: 38, padding: '0 16px', borderRadius: 999, flexShrink: 0, cursor: 'pointer', fontFamily: FONT.sans, fontSize: 14, fontWeight: 600,
      ...(on ? { background: T.mint, color: T.onMint, border: `1px solid ${T.mint}` } : { background: 'rgba(255,255,255,0.06)', color: T.text, border: '1px solid rgba(255,255,255,0.1)' }),
    }}>{children}</button>
  );
}

/** Portrait + name (+ next date) for rails and the grid */
function ArtistTile({ a, size }: { a: ArtistCard; size: number | string }) {
  const d = parseDay(a.nextDate);
  return (
    <Link href={`/artists/${a.slug}`} style={{ display: 'block', textDecoration: 'none', textAlign: 'center', minWidth: 0 }}>
      <Portrait name={a.name} url={a.photo} size={size} ring={a.upcoming > 0} />
      <span style={{ display: 'block', marginTop: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT.display, fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', color: T.white }}>{a.name}</span>
      <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, color: d ? T.mintText : T.text3 }}>
        {d ? `${shortDay(d)}${a.upcoming > 1 ? ` +${a.upcoming - 1}` : ''}` : a.genre ?? 'No dates yet'}
      </span>
    </Link>
  );
}

const rail: React.CSSProperties = { display: 'flex', gap: 16, overflowX: 'auto', margin: '0 -20px', padding: '6px 20px 4px' };

export default function ArtistsIndexClient({ artists }: { artists: ArtistCard[] }) {
  const [q, setQ] = useState('');
  const [genre, setGenre] = useState<ArtistGenre | null>(null);
  const mine = useMyFollows('artist');

  const query = q.trim().toLowerCase();
  const filtered = useMemo(() => artists.filter((a) => (!genre || a.genre === genre) && (!query || a.name.toLowerCase().includes(query))), [artists, genre, query]);
  const touring = filtered.filter((a) => a.upcoming > 0);
  // Most popular first (Spotify followers), then our own ranking for anyone without a count
  const byPopularity = (a: ArtistCard, b: ArtistCard) =>
    (b.fans ?? -1) - (a.fans ?? -1) || a.priority - b.priority;
  const az = [...filtered].sort(byPopularity);
  const yours = artists.filter((a) => mine.includes(a.slug));
  const genresHere = GENRES.filter((g) => artists.some((a) => a.genre === g));
  const browsing = !query && !genre;

  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed' }}>
      <Nav active="Artists" tabs plain />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: 'calc(80px + env(safe-area-inset-top, 0px)) 20px 120px' }}>
        <h1 style={{ margin: 0, fontFamily: FONT.display, fontSize: 44, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1, color: T.white }}>Artists</h1>
        <p style={{ margin: '10px 0 0', fontFamily: FONT.sans, fontSize: 16, lineHeight: 1.5, color: T.text2 }}>Follow the acts and the shows you never want to miss.</p>

        <label style={{ position: 'relative', display: 'block', marginTop: 20 }}>
          <Search size={18} aria-hidden style={{ position: 'absolute', left: 18, top: 16, color: T.text3 }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${artists.length} artists`} aria-label="Search artists" type="search"
            style={{ width: '100%', boxSizing: 'border-box', height: 50, padding: '0 18px 0 46px', borderRadius: 999, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: T.white, fontFamily: FONT.sans, fontSize: 16, outline: 'none' }} />
        </label>

        <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '14px -20px 0', padding: '0 20px' }}>
          <Chip on={!genre} onClick={() => setGenre(null)}>All</Chip>
          {genresHere.map((g) => <Chip key={g} on={genre === g} onClick={() => setGenre(genre === g ? null : g)}>{g}</Chip>)}
        </div>

        {browsing && yours.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <SectionTitle>Your artists</SectionTitle>
            <div className="no-scrollbar" style={rail}>
              {yours.map((a) => <div key={a.slug} style={{ width: 84, flexShrink: 0 }}><ArtistTile a={a} size={84} /></div>)}
            </div>
          </section>
        )}

        {touring.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <SectionTitle>Playing soon</SectionTitle>
            <div className="no-scrollbar" style={rail}>
              {touring.map((a) => <div key={a.slug} style={{ width: 112, flexShrink: 0 }}><ArtistTile a={a} size={112} /></div>)}
            </div>
          </section>
        )}

        {browsing && (
          <Link href="/shows" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 30, padding: '14px 0', borderTop: `1px solid ${T.hairline}`, borderBottom: `1px solid ${T.hairline}`, textDecoration: 'none' }}>
            <span>
              <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 17, fontWeight: 700, color: T.white }}>Yearly shows</span>
              <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 14, color: T.text3 }}>Rapperholic, Detty Rave, Tidal Rave and more</span>
            </span>
            <span aria-hidden style={{ fontFamily: FONT.sans, fontSize: 22, color: T.text3 }}>›</span>
          </Link>
        )}

        <section style={{ marginTop: 36 }}>
          <SectionTitle>{query ? `Results for “${q.trim()}”` : genre ? `Top ${genre}` : 'Most popular'}</SectionTitle>
          {az.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '24px 14px' }}>
              {az.map((a) => <ArtistTile key={a.slug} a={a} size="100%" />)}
            </div>
          ) : (
            <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 15, color: T.text3 }}>No artist called “{q.trim()}” yet.</p>
          )}
        </section>
      </main>
    </div>
  );
}
