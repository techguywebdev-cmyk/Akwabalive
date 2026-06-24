import Link from 'next/link';

const LINKS = ['About', 'Organizers', 'Cities', 'Privacy', 'Terms'];

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 80,
        borderTop: '1px solid rgba(245,236,215,0.07)',
        padding: '32px clamp(20px,4vw,44px)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        background: '#0D0B08',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-syne, sans-serif)',
          fontSize: 14,
          fontWeight: 800,
          letterSpacing: '4px',
          textTransform: 'uppercase',
          color: 'rgba(245,236,215,0.4)',
        }}
      >
        AK<span style={{ color: '#C8922A' }}>W</span>AABA
      </div>

      <nav style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        {LINKS.map(l => (
          <Link
            key={l}
            href="#"
            style={{
              fontFamily: 'var(--font-dm-mono, monospace)',
              fontSize: 8,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'rgba(245,236,215,0.18)',
              textDecoration: 'none',
              transition: 'color 0.18s',
            }}
          >
            {l}
          </Link>
        ))}
      </nav>

      <span
        style={{
          fontFamily: 'var(--font-dm-mono, monospace)',
          fontSize: 8,
          letterSpacing: '1px',
          color: 'rgba(245,236,215,0.14)',
        }}
      >
        © 2025 Akwaaba · Accra, Ghana
      </span>
    </footer>
  );
}
