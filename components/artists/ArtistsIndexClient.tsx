'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/layout/Nav';
import { parseDay, shortDay } from '@/lib/dates';
import { hiRes } from '@/lib/events/image';
import { T, FONT, GROUND } from '@/lib/thiscene';

export type ArtistCard = {
  slug: string; name: string; priority: number; upcoming: number;
  nextDate: string | null; nextTitle: string | null; image: string | null;
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

  const grid = (items: ArtistCard[]) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(156px, 1fr))', gap: 14 }}>
      {items.map((a) => {
        const d = parseDay(a.nextDate);
        return (
          <Link key={a.slug} href={`/artists/${a.slug}`} style={{ position: 'relative', display: 'block', aspectRatio: '4 / 5', borderRadius: 22, overflow: 'hidden', textDecoration: 'none', background: 'linear-gradient(150deg, #1E6E48 0%, #0B2A1C 70%)' }}>
            {a.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hiRes(a.image, 500) ?? a.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: a.upcoming ? 1 : 0.45 }} />
            ) : (
              <span aria-hidden style={{ position: 'absolute', top: '30%', left: 0, right: 0, textAlign: 'center', fontFamily: FONT.display, fontSize: 54, fontWeight: 800, color: 'rgba(214,251,230,0.22)' }}>{initials(a.name)}</span>
            )}
            <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,19,12,0) 35%, rgba(5,19,12,0.72) 68%, rgba(5,19,12,0.95) 100%)' }} />
            <span style={{ position: 'absolute', left: 14, right: 14, bottom: 14 }}>
              <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, color: T.white }}>{a.name}</span>
              <span style={{ display: 'block', marginTop: 4, fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: d ? T.mintText : T.text3 }}>
                {d ? `${shortDay(d)}${a.upcoming > 1 ? ` · +${a.upcoming - 1} more` : ''}` : 'No dates yet'}
              </span>
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
