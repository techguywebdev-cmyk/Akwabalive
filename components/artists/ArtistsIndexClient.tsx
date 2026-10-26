'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/layout/Nav';
import { parseDay, shortDay } from '@/lib/dates';
import { T, FONT, GROUND } from '@/lib/thiscene';

export type ArtistCard = {
  slug: string; name: string; priority: number; upcoming: number;
  nextDate: string | null; nextTitle: string | null; image: string | null;
  /** The artist's own photo, when we have one (preferred over a flyer) */
  photo: string | null;
};

const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export default function ArtistsIndexClient({ artists }: { artists: ArtistCard[] }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? artists.filter((a) => a.name.toLowerCase().includes(s)) : artists;
  }, [artists, q]);
  const touring = list.filter((a) => a.upcoming > 0);
  const rest = list.filter((a) => a.upcoming === 0);

  // Round portraits with the name underneath (no photo yet → initials on green)
  const grid = (items: ArtistCard[]) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '22px 14px' }}>
      {items.map((a) => {
        const d = parseDay(a.nextDate);
        return (
          <Link key={a.slug} href={`/artists/${a.slug}`} style={{ display: 'block', textDecoration: 'none', textAlign: 'center', minWidth: 0 }}>
            <span style={{
              position: 'relative', display: 'block', width: '100%', aspectRatio: '1 / 1', borderRadius: '50%', overflow: 'hidden',
              background: 'linear-gradient(150deg, #1E6E48 0%, #0B2A1C 75%)',
              boxShadow: a.upcoming ? `0 0 0 2px ${T.mint}, 0 0 0 5px rgba(3,8,6,0.9)` : '0 0 0 1px rgba(255,255,255,0.08)',
            }}>
              {a.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.photo} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 22%' }} />
              ) : (
                <span aria-hidden style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.display, fontSize: 30, fontWeight: 800, color: 'rgba(214,251,230,0.55)' }}>{initials(a.name)}</span>
              )}
            </span>
            <span style={{ display: 'block', marginTop: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT.display, fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', color: T.white }}>{a.name}</span>
            <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, color: d ? T.mintText : T.text3 }}>
              {d ? `${shortDay(d)}${a.upcoming > 1 ? ` +${a.upcoming - 1}` : ''}` : 'No dates yet'}
            </span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed' }}>
      <Nav active="Artists" tabs />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: 'calc(80px + env(safe-area-inset-top, 0px)) 20px 120px' }}>
        <h1 style={{ margin: 0, fontFamily: FONT.display, fontSize: 44, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1, color: T.white }}>Artists</h1>
        <p style={{ margin: '10px 0 0', fontFamily: FONT.sans, fontSize: 16, lineHeight: 1.5, color: T.text2 }}>See who’s playing next and follow the acts you never want to miss.</p>
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search artists" aria-label="Search artists" type="search"
          style={{ width: '100%', boxSizing: 'border-box', marginTop: 20, height: 50, padding: '0 18px', borderRadius: 999, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: T.white, fontFamily: FONT.sans, fontSize: 16, outline: 'none' }}
        />
        {touring.length > 0 && (
          <section style={{ marginTop: 30 }}>
            <h2 style={{ margin: '0 0 14px', fontFamily: FONT.display, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: T.white }}>Playing soon</h2>
            {grid(touring)}
          </section>
        )}
        {rest.length > 0 && (
          <section style={{ marginTop: 34 }}>
            <h2 style={{ margin: '0 0 14px', fontFamily: FONT.display, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: T.white }}>{touring.length ? 'More artists' : 'All artists'}</h2>
            {grid(rest)}
          </section>
        )}
        {!list.length && <p style={{ marginTop: 30, fontFamily: FONT.sans, fontSize: 15, color: T.text3 }}>No artist called “{q}” yet.</p>}
      </main>
    </div>
  );
}
