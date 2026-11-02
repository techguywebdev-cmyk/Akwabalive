'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/layout/Nav';
import ExploreSwitch from '@/components/explore/ExploreSwitch';
import { ToolsCapsule, SearchDrop, ChoiceSheet } from '@/components/explore/Tools';
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

type Sort = 'popular' | 'az' | 'soon';

export default function ArtistsIndexClient({ artists }: { artists: ArtistCard[] }) {
  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [genre, setGenre] = useState<ArtistGenre | 'all'>('all');
  const [sort, setSort] = useState<Sort>('popular');
  const mine = useMyFollows('artist');

  const query = q.trim().toLowerCase();
  const filtered = useMemo(() => artists.filter((a) => (genre === 'all' || a.genre === genre) && (!query || a.name.toLowerCase().includes(query))), [artists, genre, query]);
  const touring = filtered.filter((a) => a.upcoming > 0).sort((a, b) => String(a.nextDate).localeCompare(String(b.nextDate)));
  const sorted = [...filtered].sort((a, b) =>
    sort === 'az' ? a.name.localeCompare(b.name)
    : sort === 'soon' ? (a.nextDate ? 0 : 1) - (b.nextDate ? 0 : 1) || String(a.nextDate ?? '').localeCompare(String(b.nextDate ?? '')) || a.priority - b.priority
    : (b.fans ?? -1) - (a.fans ?? -1) || a.priority - b.priority);
  const yours = artists.filter((a) => mine.includes(a.slug));
  const genresHere = GENRES.filter((g) => artists.some((a) => a.genre === g));
  const filtersOn = genre !== 'all' || sort !== 'popular';
  const browsing = !query && genre === 'all';
  const gridTitle = query ? `Results for “${q.trim()}”` : genre !== 'all' ? (sort === 'popular' ? `Top ${genre}` : genre) : sort === 'az' ? 'A–Z' : sort === 'soon' ? 'Playing soonest' : 'Most popular';

  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed' }}>
      <Nav active="Artists" tabs plain center={<ExploreSwitch active="artists" />}
        actions={<ToolsCapsule searchOn={searchOpen || !!query} filtersOn={filtersOn} onSearch={() => setSearchOpen((x) => !x)} onFilter={() => setFilterOpen(true)} />} />
      <SearchDrop open={searchOpen} value={q} onChange={setQ} onClose={() => setSearchOpen(false)} placeholder={`Search ${artists.length} artists`} />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: `calc(${searchOpen ? 140 : 84}px + env(safe-area-inset-top, 0px)) 20px 120px`, transition: 'padding 200ms ease' }}>
        <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Artists</h1>

        {filtersOn && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            {genre !== 'all' && <button type="button" onClick={() => setGenre('all')} style={chipOn}>{genre} ✕</button>}
            {sort !== 'popular' && <button type="button" onClick={() => setSort('popular')} style={chipOn}>{sort === 'az' ? 'A–Z' : 'Playing soonest'} ✕</button>}
          </div>
        )}

        {browsing && yours.length > 0 && (
          <section style={{ marginTop: 14 }}>
            <SectionTitle>Your artists</SectionTitle>
            <div className="no-scrollbar" style={rail}>
              {yours.map((a) => <div key={a.slug} style={{ width: 84, flexShrink: 0 }}><ArtistTile a={a} size={84} /></div>)}
            </div>
          </section>
        )}

        {!query && touring.length > 0 && sort !== 'soon' && (
          <section style={{ marginTop: 14 }}>
            <SectionTitle>Playing soon</SectionTitle>
            <div className="no-scrollbar" style={rail}>
              {touring.map((a) => <div key={a.slug} style={{ width: 112, flexShrink: 0 }}><ArtistTile a={a} size={112} /></div>)}
            </div>
          </section>
        )}

        <section style={{ marginTop: 32 }}>
          <SectionTitle>{gridTitle}</SectionTitle>
          {sorted.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '24px 14px' }}>
              {sorted.map((a) => <ArtistTile key={a.slug} a={a} size="100%" />)}
            </div>
          ) : (
            <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 15, color: T.text3 }}>No artist called “{q.trim()}” yet.</p>
          )}
        </section>
      </main>

      {filterOpen && (
        <ChoiceSheet title="Filter artists" onClose={() => setFilterOpen(false)} onReset={() => { setGenre('all'); setSort('popular'); }}
          resultLabel={`Show ${filtered.length} artist${filtered.length === 1 ? '' : 's'}`}
          groups={[
            { label: 'Sort by', value: sort, onChange: setSort, options: [{ value: 'popular', label: 'Most popular' }, { value: 'soon', label: 'Playing soonest' }, { value: 'az', label: 'A–Z' }] },
            { label: 'Genre', value: genre, onChange: setGenre, options: [{ value: 'all', label: 'All' }, ...genresHere.map((g) => ({ value: g, label: g }))] },
          ]} />
      )}
    </div>
  );
}

const chipOn: React.CSSProperties = {
  height: 34, padding: '0 14px', borderRadius: 999, border: '1px solid rgba(123,227,168,0.35)', background: 'rgba(123,227,168,0.12)',
  color: T.mintText, fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
