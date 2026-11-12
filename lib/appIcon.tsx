import { ImageResponse } from 'next/og';

/** The app icon: TC in the display face, in white, on near-black green. Used for the tab icon, home screen and search results. */
export async function appIcon(size: number, fontUrl: URL) {
  const font = await fetch(fontUrl).then((r) => r.arrayBuffer()).catch(() => null);
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(80% 80% at 30% 15%, #1F4A35 0%, #0B1510 60%, #060A08 100%)' }}>
        <div style={{ display: 'flex', fontFamily: font ? 'Inter Tight' : undefined, fontSize: size * 0.38, fontWeight: 800, lineHeight: 1, letterSpacing: -size * 0.022, marginLeft: -size * 0.022 }}>
          <span style={{ color: '#fff' }}>TC</span>
        </div>
      </div>
    ),
    { width: size, height: size, ...(font ? { fonts: [{ name: 'Inter Tight', data: font, weight: 800 as const, style: 'normal' as const }] } : {}) },
  );
}
