import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Megaphone, Flame, Clapperboard, BarChart3, ScanLine, ImagePlus, CheckCircle2, BadgeCheck, ArrowRight } from 'lucide-react';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import { shareMeta } from '@/lib/og';
import { T, FONT, GROUND } from '@/lib/thiscene';

export const revalidate = 600;
export const metadata = shareMeta({
  title: 'List your event on Akwaaba',
  description: 'Put your show in front of everyone going out in Ghana: free to list, flyer to live in two minutes, real numbers on who’s seen it.',
  path: '/organisers',
});

async function numbers() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const db = createClient(url, key);
  const today = new Date().toISOString().slice(0, 10);
  const [{ count: events }, { count: moments }] = await Promise.all([
    db.from('events').select('id', { count: 'exact', head: true }).eq('status', 'published').gte('date', today),
    db.from('moments').select('id', { count: 'exact', head: true }).eq('status', 'live'),
  ]);
  return { events: events ?? 0, moments: moments ?? 0 };
}

const eyebrow: React.CSSProperties = { margin: 0, fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.mintText };
const h2: React.CSSProperties = { margin: '6px 0 0', fontFamily: FONT.display, fontSize: 'clamp(26px, 6vw, 34px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, color: T.white };
const primary: React.CSSProperties = { height: 54, padding: '0 24px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: T.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 15.5, fontWeight: 700, textDecoration: 'none', boxShadow: '0 10px 30px rgba(123,227,168,0.2)' };
const ghost: React.CSSProperties = { height: 54, padding: '0 22px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', border: `1px solid ${T.hairlineStrong}`, color: T.white, fontFamily: FONT.display, fontSize: 15, fontWeight: 600, textDecoration: 'none' };

const WHY = [
  { icon: Megaphone, title: 'Seen where people decide', body: 'Akwaaba is where people look for what to do this weekend: every show in Ghana in one feed, with your full flyer, line-up and a ticket button.' },
  { icon: Flame, title: 'Get on the Hot list', body: 'Shows people are going to rise to the Hot screen and the top of the feed, with real numbers like “1.2k checked this out”.' },
  { icon: Clapperboard, title: 'Last year sells this year', body: 'Clips from your past editions play right on your event. People see the energy before they buy.' },
  { icon: BarChart3, title: 'Know what’s working', body: 'See views, saves and who’s going on every event, so you know when to push and where.' },
];
const STEPS = [
  { icon: ImagePlus, title: 'Upload your flyer', body: 'We read the date, venue, line-up and contacts off it for you.' },
  { icon: CheckCircle2, title: 'Check and publish', body: 'Fix anything we missed, add ticket types or your ticket link, and go live.' },
  { icon: ScanLine, title: 'Sell and scan', body: 'Send people to your ticket link, or sell on Akwaaba with MoMo and card (coming soon), and scan tickets at the door from your phone.' },
];
const FAQ = [
  { q: 'What does it cost?', a: 'Listing your event is free.' },
  { q: 'I already sell tickets on another site. Can I still list?', a: 'Yes. Add your ticket link and the “Get tickets” button sends people straight there.' },
  { q: 'My event is already on Akwaaba. Who put it there?', a: 'We list public events so people can find everything in one place. Claim it and it moves to your account: you can edit it, add tickets and see its numbers.' },
  { q: 'Who checks events?', a: 'We check your first event before it goes live, to keep the feed real. After that, you publish straight away.' },
];

export default async function OrganisersPage() {
  const n = await numbers().catch(() => null);
  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed' }}>
      <Nav back="/" />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: 'calc(96px + env(safe-area-inset-top, 0px)) 20px 20px' }}>
        <p style={eyebrow}>For organisers</p>
        <h1 style={{ margin: '10px 0 0', fontFamily: FONT.display, fontSize: 'clamp(40px, 10vw, 64px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 0.98, color: T.white }}>
          Put your night in front of everyone going out.
        </h1>
        <p style={{ margin: '16px 0 0', maxWidth: 560, fontFamily: FONT.sans, fontSize: 17, lineHeight: 1.55, color: T.text }}>
          List your show on Akwaaba for free. Flyer to live in two minutes, your past moments on the page, and real numbers on who’s seen it.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 26 }}>
          <Link href="/organizer/events/new" style={primary}>List your event <ArrowRight size={18} /></Link>
          <Link href="/organisers/claim" style={ghost}><BadgeCheck size={18} color={T.mintText} /> Claim an event</Link>
        </div>

        {n && n.events > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 34 }}>
            {[{ v: n.events, l: 'upcoming events listed' }, { v: n.moments, l: 'moments from past shows' }].map((s) => (
              <div key={s.l} style={{ padding: '18px 18px 16px', borderRadius: 20, background: T.surface, border: `1px solid ${T.hairline}` }}>
                <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', color: T.white }}>{s.v.toLocaleString()}</p>
                <p style={{ margin: '2px 0 0', fontFamily: FONT.sans, fontSize: 13.5, color: T.text2 }}>{s.l}</p>
              </div>
            ))}
          </div>
        )}

        <section style={{ marginTop: 56 }}>
          <p style={eyebrow}>Why Akwaaba</p>
          <h2 style={h2}>More people at the door</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 20 }}>
            {WHY.map(({ icon: I, title, body }) => (
              <div key={title} style={{ padding: 18, borderRadius: 20, background: T.surface, border: `1px solid ${T.hairline}` }}>
                <span style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(123,227,168,0.12)', color: T.mintText }}><I size={20} /></span>
                <p style={{ margin: '14px 0 0', fontFamily: FONT.display, fontSize: 17, fontWeight: 700, color: T.white }}>{title}</p>
                <p style={{ margin: '6px 0 0', fontFamily: FONT.sans, fontSize: 14.5, lineHeight: 1.55, color: T.text2 }}>{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 56 }}>
          <p style={eyebrow}>How it works</p>
          <h2 style={h2}>Live in two minutes</h2>
          <ol style={{ listStyle: 'none', margin: '20px 0 0', padding: 0, display: 'grid', gap: 10 }}>
            {STEPS.map(({ icon: I, title, body }, i) => (
              <li key={title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '16px 18px', borderRadius: 20, background: T.surface, border: `1px solid ${T.hairline}` }}>
                <span style={{ width: 34, height: 34, borderRadius: 17, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 15, fontWeight: 800 }}>{i + 1}</span>
                <span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT.display, fontSize: 16.5, fontWeight: 700, color: T.white }}><I size={17} color={T.mintText} /> {title}</span>
                  <span style={{ display: 'block', marginTop: 4, fontFamily: FONT.sans, fontSize: 14.5, lineHeight: 1.5, color: T.text2 }}>{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section style={{ marginTop: 56 }}>
          <p style={eyebrow}>Questions</p>
          <div style={{ marginTop: 14, borderRadius: 20, background: T.surface, border: `1px solid ${T.hairline}`, overflow: 'hidden' }}>
            {FAQ.map((f, i) => (
              <details key={f.q} style={{ padding: '16px 18px', borderTop: i ? `1px solid ${T.hairline}` : 'none' }}>
                <summary style={{ cursor: 'pointer', fontFamily: FONT.sans, fontSize: 15.5, fontWeight: 600, color: T.white, listStyle: 'none' }}>{f.q}</summary>
                <p style={{ margin: '8px 0 0', fontFamily: FONT.sans, fontSize: 14.5, lineHeight: 1.55, color: T.text2 }}>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 48, padding: '26px 22px', borderRadius: 24, background: 'radial-gradient(120% 120% at 0% 0%, rgba(123,227,168,0.16) 0%, rgba(123,227,168,0.03) 60%), #0D1210', border: '1px solid rgba(123,227,168,0.25)' }}>
          <h2 style={{ ...h2, marginTop: 0 }}>Got a show coming up?</h2>
          <p style={{ margin: '8px 0 0', fontFamily: FONT.sans, fontSize: 15, color: T.text }}>List it now. It’s free, and it takes two minutes.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
            <Link href="/organizer/events/new" style={primary}>List your event <ArrowRight size={18} /></Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
