import Link from 'next/link';
import { BRAND_NAME } from '@/lib/theme';
import { T, FONT } from '@/lib/thiscene';
import { SOCIALS } from '@/lib/social';

const LINKS = [
  { label: 'Events', href: '/events' },
  { label: 'Moments', href: '/moments' },
  // One quiet way into the guide pages; each guide links to all the others
  { label: 'What’s on in Ghana', href: '/upcoming-events-in-ghana' },
  { label: 'For organisers', href: '/organisers' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
];

const icon = { width: 36, height: 36, borderRadius: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: T.text2, background: 'rgba(255,255,255,0.06)', textDecoration: 'none' } as const;

/**
 * Minimal footer. Phone: name and socials on one line, links in two columns, the small print underneath.
 * Wide screens: name, links and socials in one row.
 */
export default function Footer() {
  return (
    <footer style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 20px 32px' }}>
      <div className="ak-foot" style={{ borderTop: `1px solid ${T.hairline}`, paddingTop: 28 }}>
        <div className="ak-foot-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <Link href="/" style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: T.white, textDecoration: 'none' }}>{BRAND_NAME}</Link>
          <div className="ak-foot-social-sm" style={{ display: 'flex', gap: 10 }}><Socials /></div>
        </div>
        <nav aria-label="Footer" className="ak-foot-links">
          {LINKS.map((l) => (
            <Link key={l.label} href={l.href} style={{ fontFamily: FONT.sans, fontSize: 14, color: T.text2, textDecoration: 'none' }}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ak-foot-social-lg" style={{ gap: 10 }}><Socials /></div>
      </div>
      <p style={{ margin: '24px 0 0', fontFamily: FONT.sans, fontSize: 12, color: T.text3 }}>
        © {new Date().getFullYear()} {BRAND_NAME} · Accra, Ghana
      </p>
      <style>{`
        .ak-foot-links { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 24px; margin-top: 22px; }
        .ak-foot-social-lg { display: none; }
        @media (min-width: 860px) {
          .ak-foot { display: flex; align-items: center; justify-content: space-between; gap: 32px; }
          .ak-foot-links { display: flex; flex-wrap: wrap; gap: 28px; margin-top: 0; }
          .ak-foot-social-sm { display: none !important; }
          .ak-foot-social-lg { display: flex; }
        }
      `}</style>
    </footer>
  );
}

function Socials() {
  return (
    <>
      <a href={SOCIALS.x.url} target="_blank" rel="noopener noreferrer me" aria-label="TsaCoal on X" style={icon}>
        <svg width={15} height={15} viewBox="0 0 24 24" aria-hidden fill="currentColor"><path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3zm-1.08 16.2h1.7L7.4 4.7H5.57l11.1 14.5z" /></svg>
      </a>
      <a href={SOCIALS.tiktok.url} target="_blank" rel="noopener noreferrer me" aria-label="TsaCoal on TikTok" style={icon}>
        <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden fill="currentColor"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.6 2.6 0 0 1-2.6-2.6 2.6 2.6 0 0 1 3.37-2.48V9.66a5.73 5.73 0 0 0-.77-.05A5.68 5.68 0 0 0 4.18 15.3 5.68 5.68 0 0 0 9.86 21a5.68 5.68 0 0 0 5.68-5.68V9.01a7.3 7.3 0 0 0 4.28 1.37V7.3a4.3 4.3 0 0 1-3.22-1.48z" /></svg>
      </a>
    </>
  );
}
