import { GROUND } from '@/lib/thiscene';

/** Shown the instant you tap a link, while the page itself loads: the page's shape in quiet shimmering blocks */
export default function PageSkeleton({ kind = 'page' }: { kind?: 'page' | 'event' }) {
  const bar = (w: string, h: number, mt = 0, r = 10): React.CSSProperties => ({ width: w, height: h, marginTop: mt, borderRadius: r });
  return (
    <div aria-busy="true" aria-label="Loading" style={{ minHeight: '100svh', background: GROUND }}>
      <style>{`@keyframes ak-sh{0%{background-position:-300px 0}100%{background-position:300px 0}}.ak-sk{background:linear-gradient(90deg,rgba(255,255,255,0.05) 0,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.05) 100%);background-size:600px 100%;animation:ak-sh 1.1s linear infinite}`}</style>
      {kind === 'event' ? (
        <>
          <div className="ak-sk" style={{ width: '100%', aspectRatio: '4 / 5', maxHeight: '62svh', borderRadius: 0 }} />
          <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 20px 0' }}>
            <div style={{ display: 'flex', gap: 8 }}><div className="ak-sk" style={bar('64px', 28, 0, 999)} /><div className="ak-sk" style={bar('96px', 28, 0, 999)} /></div>
            <div className="ak-sk" style={bar('82%', 38, 16)} />
            <div className="ak-sk" style={bar('50%', 18, 14)} />
            <div className="ak-sk" style={bar('64%', 16, 10)} />
            <div className="ak-sk" style={{ ...bar('100%', 54, 24, 999) }} />
          </div>
        </>
      ) : (
        <div style={{ maxWidth: 640, margin: '0 auto', padding: 'calc(88px + env(safe-area-inset-top, 0px)) 20px 0' }}>
          <div className="ak-sk" style={bar('55%', 40)} />
          <div className="ak-sk" style={bar('35%', 16, 14)} />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 26 }}>
              <div className="ak-sk" style={{ width: 64, height: 80, borderRadius: 12, flexShrink: 0 }} />
              <div style={{ flex: 1 }}><div className="ak-sk" style={bar('80%', 16)} /><div className="ak-sk" style={bar('50%', 13, 10)} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
