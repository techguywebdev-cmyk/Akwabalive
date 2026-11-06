import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import { T, FONT, GROUND } from '@/lib/thiscene';

export const CONTACT_EMAIL = 'techguywebdev@gmail.com';
/* list markers in mint */
export const UPDATED = '6 November 2026';

export type LegalSection = { title: string; body: (string | string[])[] };

/** Terms / Privacy: one readable column, numbered sections, plain words */
export default function LegalPage({ eyebrow, title, intro, sections }: { eyebrow: string; title: string; intro: string; sections: LegalSection[] }) {
  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed' }}>
      <Nav back="/" />
      <main style={{ maxWidth: 680, margin: '0 auto', padding: 'calc(88px + env(safe-area-inset-top, 0px)) 20px 20px' }}>
        <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.mintText }}>{eyebrow}</p>
        <h1 style={{ margin: '8px 0 0', fontFamily: FONT.display, fontSize: 'clamp(34px, 8vw, 48px)', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.035em', color: T.white }}>{title}</h1>
        <p style={{ margin: '10px 0 0', fontFamily: FONT.sans, fontSize: 13, color: T.text3 }}>Last updated {UPDATED}</p>
        <p style={{ margin: '22px 0 0', fontFamily: FONT.sans, fontSize: 16, lineHeight: 1.65, color: T.text }}>{intro}</p>

        <nav aria-label="Contents" style={{ margin: '28px 0 8px', padding: '16px 18px', borderRadius: 18, background: T.surface, border: `1px solid ${T.hairline}` }}>
          <ol style={{ margin: 0, paddingLeft: 22, display: 'grid', gap: 6, listStyleType: 'decimal' }}>
            {sections.map((s, i) => (
              <li key={s.title} style={{ display: 'list-item', fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>
                <a href={`#s${i + 1}`} style={{ color: T.text2, textDecoration: 'none' }}>{s.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        {sections.map((s, i) => (
          <section key={s.title} id={`s${i + 1}`} style={{ scrollMarginTop: 90, marginTop: 34 }}>
            <h2 style={{ margin: 0, display: 'flex', gap: 10, alignItems: 'baseline', fontFamily: FONT.display, fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>
              <span style={{ fontSize: 14, color: T.mintText }}>{String(i + 1).padStart(2, '0')}</span>{s.title}
            </h2>
            {s.body.map((b, j) => Array.isArray(b) ? (
              <ul key={j} style={{ margin: '12px 0 0', paddingLeft: 20, display: 'grid', gap: 8, listStyleType: 'disc' }}>
                {b.map((li) => <li key={li} style={{ display: 'list-item', fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.6, color: T.text }}>{li}</li>)}
              </ul>
            ) : (
              <p key={j} style={{ margin: '12px 0 0', fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.65, color: T.text }}>{b}</p>
            ))}
          </section>
        ))}

        <p style={{ margin: '40px 0 0', padding: '16px 18px', borderRadius: 18, background: 'rgba(123,227,168,0.08)', fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.55, color: T.text }}>
          Questions? Email <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: T.mintText }}>{CONTACT_EMAIL}</a>.
        </p>
      </main>
      <style>{`main li::marker{color:${T.mintText}}`}</style>
      <Footer />
    </div>
  );
}
