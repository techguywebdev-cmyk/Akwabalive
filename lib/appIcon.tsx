import { ImageResponse } from 'next/og';

/** The app icon: TC in the display face, a gradient mint T and a white C, on near-black green. Used for the tab icon, home screen and search results. */
export async function appIcon(size: number, fontUrl: URL) {
  const font = await fetch(fontUrl).then((r) => r.arrayBuffer()).catch(() => null);
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(80% 80% at 30% 15%, #1F4A35 0%, #0B1510 60%, #060A08 100%)' }}>
        <div style={{ display: 'flex', fontFamily: font ? 'Inter Tight' : undefined, fontSize: size * 0.52, fontWeight: 800, lineHeight: 1, letterSpacing: -size * 0.03 }}>
          <span style={{ backgroundImage: 'linear-gradient(160deg, #D2FBE3 0%, #8FEBB7 40%, #4FD192 100%)', backgroundClip: 'text', color: 'transparent' }}>T</span>
          <span style={{ color: '#fff' }}>C</span>
        </div>
      </div>
    ),
    { width: size, height: size, ...(font ? { fonts: [{ name: 'Inter Tight', data: font, weight: 800 as const, style: 'normal' as const }] } : {}) },
  );
}
