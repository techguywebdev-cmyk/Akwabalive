import Link from 'next/link';
import { T, FONT, GRAD } from '@/lib/thiscene';
import Wordmark from '@/components/brand/Wordmark';

// Server-safe copies of the shared button styles (CardParts is a client module)
export const LOST_BTN = {
  primary: { height: 50, padding: '0 22px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: GRAD.mint, color: T.onMint, border: 'none', cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap', fontFamily: FONT.display, fontSize: 15, fontWeight: 700 } as React.CSSProperties,
  secondary: { height: 50, padding: '0 20px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(20,24,22,0.6)', color: T.white, border: 'none', cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap', fontFamily: FONT.display, fontSize: 15, fontWeight: 600 } as React.CSSProperties,
};

/** Shared look for "not found" and "something went wrong" */
export default function LostPage({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '40px 24px', textAlign: 'center', color: T.text }}>
      <Wordmark size={20} />
      <h1 style={{ margin: '18px 0 0', fontFamily: FONT.display, fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: T.white }}>{title}</h1>
      <p style={{ margin: 0, maxWidth: 340, fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.55, color: T.text2 }}>{body}</p>
      <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {action}
        <Link href="/" style={LOST_BTN.primary}>Find something to do</Link>
      </div>
    </main>
  );
}
