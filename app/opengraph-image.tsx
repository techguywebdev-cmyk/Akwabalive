import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Akwaaba — every event in Ghana';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** The default share card: the mark, the name, one line. Charcoal with a faint green light, mint accent. */
/** Inter Tight ExtraBold (OFL, from @fontsource), the app's display face, shipped with the app */
const displayFont = () => fetch(new URL('../assets/InterTight-800.woff', import.meta.url)).then((r) => r.arrayBuffer()).catch(() => null);

export default async function OG() {
  const font = await displayFont();
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 80,
        fontFamily: font ? 'Inter Tight' : undefined,
        background: 'radial-gradient(70% 60% at 50% 0%, rgba(40,130,85,0.35) 0%, rgba(40,130,85,0) 80%), linear-gradient(180deg, #0B0F0D 0%, #050606 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <svg width="88" height="88" viewBox="0 0 24 24">
            <rect x="1" y="1" width="22" height="22" rx="7" fill="#7BE3A8" />
            <path d="M10.5 5.5v9.5a3.2 3.2 0 0 0 3.2 3.2h1.8" fill="none" stroke="#03130B" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M7.5 9.5h8" fill="none" stroke="#03130B" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 64, fontWeight: 800, letterSpacing: -2, color: '#ffffff' }}>tsacoal</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <span style={{ fontSize: 76, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02, color: '#ffffff', maxWidth: 980 }}>Every event in Ghana, in one place.</span>
          <span style={{ fontSize: 32, color: '#A8F0C6' }}>Concerts · Festivals · Parties · Moments</span>
        </div>
      </div>
    ),
    { ...size, ...(font ? { fonts: [{ name: 'Inter Tight', data: font, weight: 800 as const, style: 'normal' as const }] } : {}) },
  );
}
