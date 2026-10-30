'use client';

import Link from 'next/link';
import { T, FONT } from '@/lib/thiscene';

/** Artists | Shows switch in the header — the two sides of the same place */
export default function ExploreSwitch({ active }: { active: 'artists' | 'shows' }) {
  const item = (key: 'artists' | 'shows', label: string) => {
    const on = active === key;
    return (
      <Link href={`/${key}`} aria-current={on ? 'page' : undefined} style={{
        height: 36, padding: '0 18px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', textDecoration: 'none',
        fontFamily: FONT.display, fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em',
        color: on ? T.onMint : 'rgba(255,255,255,0.72)', background: on ? T.mint : 'transparent', transition: 'background 200ms ease, color 200ms ease',
      }}>{label}</Link>
    );
  };
  return (
    <nav aria-label="Artists or shows" style={{
      display: 'inline-flex', padding: 4, borderRadius: 999, background: 'rgba(3,10,6,0.45)', border: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    }}>
      {item('artists', 'Artists')}
      {item('shows', 'Shows')}
    </nav>
  );
}
