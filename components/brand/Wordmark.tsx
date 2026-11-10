import Link from 'next/link';
import { FONT, T } from '@/lib/thiscene';

/**
 * Tsacoal brand mark: a mint tile with a capital T and the name in
 * lowercase Inter Tight. Small enough to sit in the middle of the header.
 */
export function BrandGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="7" fill={T.mint} />
      <path d="M12 7v11" fill="none" stroke={T.onMint} strokeWidth="2.4" strokeLinecap="butt" />
      <path d="M6.5 7h11" fill="none" stroke={T.onMint} strokeWidth="2.4" strokeLinecap="butt" />
    </svg>
  );
}

export default function Wordmark({ href = '/', size = 17 }: { href?: string; size?: number }) {
  return (
    <Link href={href} aria-label="Tsacoal home" style={{ display: 'inline-flex', alignItems: 'center', gap: 0, textDecoration: 'none' }}>
      <span style={{ fontFamily: FONT.display, fontSize: size, fontWeight: 800, letterSpacing: '-0.03em', color: T.white, lineHeight: 1 }}>Tsacoal</span>
    </Link>
  );
}
