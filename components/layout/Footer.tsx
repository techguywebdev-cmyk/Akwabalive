import { C, G, R, BRAND_NAME } from '@/lib/theme';
import Link from 'next/link';

const LINKS = ['About', 'Organizers', 'Cities', 'Privacy', 'Terms'];

/** Glass footer panel, flat. */
export default function Footer() {
  return (
    <div style={{ padding: '80px 10px 10px' }}>
      <footer
        style={{
          maxWidth: 1400, margin: '0 auto',
          ...G.panel, border: `1px solid ${C.bd}`, borderRadius: R.sheet,
          padding: '28px clamp(20px,4vw,40px)',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}
      >
        <div style={{ fontFamily: 'var(--font-syne, sans-serif)', fontSize: 15, fontWeight: 800, letterSpacing: '4px', textTransform: 'uppercase', color: C.cream }}>
          AK<span style={{ color: C.gold }}>W</span>AABA
        </div>

        <nav style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
          {LINKS.map((l) => (
            <Link
              key={l}
              href="#"
              style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c2, textDecoration: 'none', padding: '8px 10px', borderRadius: R.chip }}
            >
              {l}
            </Link>
          ))}
        </nav>

        <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: 11, color: C.c3 }}>
          © {new Date().getFullYear()} {BRAND_NAME} · Accra, Ghana
        </span>
      </footer>
    </div>
  );
}
