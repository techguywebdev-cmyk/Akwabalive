import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import { T, FONT, GROUND, GRAD } from '@/lib/thiscene';

export const CONTACT_EMAIL = 'hello@tsacoal.com';
export const UPDATED = '6 November 2026';

export type LegalSection = { title: string; body: (string | string[])[] };

const gradText: React.CSSProperties = { background: GRAD.text, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' };

/**
 * Terms / Privacy. Editorial, not a wall of text: a big title, the short version up front, then numbered
 * sections with the number as the anchor of each. No boxes.
 */
export default function LegalPage({ eyebrow, title, intro, summary, sections }: { eyebrow: string; title: string; intro: string; summary?: string[]; sections: LegalSection[] }) {
  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed' }}>
      <Nav back="/" />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: 'calc(100px + env(safe-area-inset-top, 0px)) 20px 20px' }}>
        <header>
          <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.mintText }}>
            {eyebrow}<span style={{ width: 4, height: 4, borderRadius: 1, background: T.text3 }} /><span style={{ color: T.text3, letterSpacing: '0.08em' }}>Updated {UPDATED}</span>
          </p>
          <h1 style={{ margin: '14px 0 0', fontFamily: FONT.display, fontSize: 'clamp(38px, 10.5vw, 60px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.04em', paddingBottom: '0.08em', ...gradText }}>{title}</h1>
          <p style={{ margin: '18px 0 0', maxWidth: 600, fontFamily: FONT.sans, fontSize: 16.5, lineHeight: 1.6, color: T.text2 }}>{intro}</p>
        </header>

        {summary && summary.length > 0 && (
          <section aria-label="The short version" style={{ marginTop: 44 }}>
            <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.white }}>The short version</p>
            <ul style={{ listStyle: 'none', margin: '16px 0 0', padding: 0, display: 'grid', gap: 14 }}>
              {summary.map((s) => (
                <li key={s} style={{ display: 'flex', gap: 14, alignItems: 'baseline', fontFamily: FONT.sans, fontSize: 16, lineHeight: 1.45, color: T.white }}>
                  <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: GRAD.mint, transform: 'translateY(-2px)' }} />{s}
                </li>
              ))}
            </ul>
          </section>
        )}

        <nav aria-label="Contents" style={{ marginTop: 48 }}>
          <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.text3 }}>In this page</p>
          <ol style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', columnGap: 24, rowGap: 2 }}>
            {sections.map((s, i) => (
              <li key={s.title}>
                <a href={`#s${i + 1}`} style={{ display: 'flex', gap: 12, alignItems: 'baseline', padding: '7px 0', textDecoration: 'none', fontFamily: FONT.sans, fontSize: 15, color: T.text2 }}>
                  <span style={{ fontFamily: FONT.display, fontSize: 13, fontWeight: 800, color: T.mintText, minWidth: 20 }}>{String(i + 1).padStart(2, '0')}</span>{s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {sections.map((s, i) => (
          <section key={s.title} id={`s${i + 1}`} style={{ scrollMarginTop: 96, marginTop: 64 }}>
            <span aria-hidden style={{ display: 'block', fontFamily: FONT.display, fontSize: 44, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.04em', background: GRAD.mint, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent', opacity: 0.9 }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <h2 style={{ margin: '10px 0 0', fontFamily: FONT.display, fontSize: 'clamp(23px, 6vw, 28px)', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.15, color: T.white }}>{s.title}</h2>
            <div style={{ maxWidth: '62ch' }}>
              {s.body.map((b, j) => Array.isArray(b) ? (
                <ul key={j} style={{ listStyle: 'none', margin: '16px 0 0', padding: 0, display: 'grid', gap: 12 }}>
                  {b.map((li) => {
                    const k = li.indexOf(': ');
                    const lead = k > 0 && k < 40 ? li.slice(0, k) : null;
                    return (
                      <li key={li} style={{ display: 'flex', gap: 12, fontFamily: FONT.sans, fontSize: 15.5, lineHeight: 1.65, color: T.text }}>
                        <span aria-hidden style={{ width: 6, height: 6, borderRadius: 2, flexShrink: 0, marginTop: 10, background: T.mint }} />
                        <span>{lead ? <><b style={{ color: T.white, fontWeight: 700 }}>{lead}.</b> {li.charAt(k + 2).toUpperCase() + li.slice(k + 3)}</> : li}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p key={j} style={{ margin: '16px 0 0', fontFamily: FONT.sans, fontSize: 15.5, lineHeight: 1.7, color: T.text }}>{b}</p>
              ))}
            </div>
          </section>
        ))}

        <p style={{ margin: '64px 0 0', paddingTop: 22, borderTop: '1px solid rgba(255,255,255,0.08)', fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.6, color: T.text2 }}>
          Questions? Write to <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: T.mintText, fontWeight: 600, textDecoration: 'none' }}>{CONTACT_EMAIL}</a>. We read every email.
        </p>
      </main>
      <Footer />
    </div>
  );
}
