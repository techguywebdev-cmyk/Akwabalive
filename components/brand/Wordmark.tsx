import Link from 'next/link';
import { FONT, T } from '@/lib/thiscene';

/**
 * Akwaaba brand mark: a mint "door" glyph (an open arch — welcome) and the name in
 * lowercase Inter Tight. Small enough to sit in the middle of the header.
 */
export function BrandGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="7" fill={T.mint} />
      <path d="M7.5 18.5V11a4.5 4.5 0 0 1 9 0v7.5" fill="none" stroke={T.onMint} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M7.5 14.5h9" fill="none" stroke={T.onMint} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export default function Wordmark({ href = '/', size = 17 }: { href?: string; size?: number }) {
  return (
    <Link href={href} aria-label="Akwaaba home" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
      <BrandGlyph size={size + 5} />
      <span style={{ fontFamily: FONT.display, fontSize: size, fontWeight: 800, letterSpacing: '-0.03em', color: T.white, lineHeight: 1 }}>akwaaba</span>
    </Link>
  );
}
