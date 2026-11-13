import Link from 'next/link';
import { BRAND_NAME } from '@/lib/theme';
import { T, FONT } from '@/lib/thiscene';

const LINKS = [
  { label: 'Events', href: '/events' },
  { label: 'Moments', href: '/moments' },
  // One quiet way into the guide pages; each guide links to all the others
  { label: 'What’s on in Ghana', href: '/upcoming-events-in-ghana' },
  { label: 'For organisers', href: '/organisers' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
];

/** Minimal footer: a hairline, a row of links, one quiet line. No box. */
export default function Footer() {
  return (
    <footer style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 20px 32px' }}>
      <div style={{ borderTop: `1px solid ${T.hairline}`, paddingTop: 24, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <nav aria-label="Footer" style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {LINKS.map((l) => (
            <Link key={l.label} href={l.href} style={{ fontFamily: FONT.sans, fontSize: 13, color: T.text2, textDecoration: 'none' }}>
              {l.label}
            </Link>
          ))}
        </nav>
        <span style={{ fontFamily: FONT.sans, fontSize: 12, color: T.text3 }}>
          © {new Date().getFullYear()} {BRAND_NAME} · Accra, Ghana
        </span>
      </div>
    </footer>
  );
}
