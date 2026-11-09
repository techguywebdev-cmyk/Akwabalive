/**
 * The header backdrop: a tilted wall of flyers behind the page title, dimmed for the nav up top and fading
 * softly into the page below. Sits absolutely at the top of a `position: relative` header that starts at the
 * very top of the page (under the nav).
 */
export default function FlyerWall({ images, height = 'min(100vw, 520px)', strength = 1 }: {
  images: string[];
  /** CSS height of the wall, from the top of the page */
  height?: string;
  /** 1 = as on calendar pages; lower to dim more behind long intros */
  strength?: number;
}) {
  const imgs = images.filter(Boolean);
  if (!imgs.length) return null;
  const offsets = [-30, 40, -60, 20, -10];
  const fade = 'linear-gradient(180deg, #000 0%, #000 50%, transparent 96%)';
  return (
    <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height, overflow: 'hidden', pointerEvents: 'none', WebkitMaskImage: fade, maskImage: fade }}>
      <div style={{ position: 'absolute', inset: '-12% -18%', display: 'flex', gap: 10, transform: 'rotate(-8deg)', animation: 'fwIn 900ms cubic-bezier(0.22,1,0.36,1) both' }}>
        {offsets.map((y, col) => (
          <div key={col} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, transform: `translateY(${y}px)` }}>
            {[0, 1, 2].map((row) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={row} src={imgs[(col * 3 + row + col) % imgs.length]} alt="" loading={row ? 'lazy' : 'eager'} decoding="async"
                style={{ width: '100%', aspectRatio: '4 / 5', objectFit: 'cover', borderRadius: 16, display: 'block', boxShadow: '0 16px 36px -14px rgba(0,0,0,0.8)' }} />
            ))}
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(8,13,10,0.78) 0%, rgba(8,13,10,${0.42 / strength}) 24%, rgba(8,13,10,${Math.min(0.9, 0.55 / strength)}) 48%, rgba(8,13,10,0.88) 72%, rgba(8,13,10,0.95) 100%)` }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(70% 50% at 20% 85%, rgba(70,220,150,0.18) 0%, rgba(70,220,150,0) 70%)' }} />
      <style>{'@keyframes fwIn{from{opacity:0;transform:rotate(-8deg) scale(1.06)}to{opacity:1;transform:rotate(-8deg) scale(1)}}'}</style>
    </div>
  );
}
