import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Flame, Eye, ScanLine, ImagePlus, CheckCircle2, BadgeCheck, ArrowRight } from 'lucide-react';
import Nav from '@/components/layout/Nav';
import FlyerWall from '@/components/ui/FlyerWall';
import { hiRes } from '@/lib/events/image';
import Footer from '@/components/layout/Footer';
import { shareMeta } from '@/lib/og';
import { T, FONT, GROUND, GRAD, BTN } from '@/lib/thiscene';

export const revalidate = 600;
export const metadata = shareMeta({
  title: 'List your event on Tsacoal',
  description: 'Put your show in front of everyone going out in Ghana: free to list, flyer to live in two minutes, real numbers on who’s seen it.',
  path: '/organisers',
});

async function numbers() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const db = createClient(url, key);
  const today = new Date().toISOString().slice(0, 10);
  const [{ count: events }, { count: moments }, { data: hot }] = await Promise.all([
    db.from('events').select('id', { count: 'exact', head: true }).eq('status', 'published').gte('date', today),
    db.from('moments').select('id', { count: 'exact', head: true }).eq('status', 'live'),
    db.from('events').select('title, image_url, venue, date').eq('status', 'published').eq('is_hot', true).gte('date', today).not('image_url', 'is', null).order('date').limit(10),
  ]);
  return { events: events ?? 0, moments: moments ?? 0, flyers: (hot ?? []) as { title: string; image_url: string; venue: string; date: string }[] };
}

const eyebrow: React.CSSProperties = { margin: 0, fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.mintText };
const h2: React.CSSProperties = { margin: '6px 0 0', fontFamily: FONT.display, fontSize: 'clamp(26px, 6vw, 34px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, color: T.white };

const WHY = [
  { title: 'Seen where people decide', body: 'Tsacoal is where people look for what to do this weekend: every show in Ghana in one feed, with your full flyer, line-up and a ticket button.' },
  { title: 'Get on the Hot list', body: 'Shows people are going to rise to the Hot screen and the top of the feed, with real numbers like “1.2k checked this out”.' },
  { title: 'Last year sells this year', body: 'Clips from your past editions play right on your event. People see the energy before they buy.' },
  { title: 'Know what’s working', body: 'See views, saves and who’s going on every event, so you know when to push and where.' },
];
const STEPS = [
  { icon: ImagePlus, title: 'Upload your flyer', body: 'We read the date, venue, line-up and contacts off it for you.' },
  { icon: CheckCircle2, title: 'Check and publish', body: 'Fix anything we missed, add ticket types or your ticket link, and go live.' },
  { icon: ScanLine, title: 'Sell and scan', body: 'Send people to your ticket link, or sell on Tsacoal with MoMo and card (coming soon), and scan tickets at the door from your phone.' },
];
const FAQ = [
  { q: 'What does it cost?', a: 'Listing your event is free.' },
  { q: 'I already sell tickets on another site. Can I still list?', a: 'Yes. Add your ticket link and the “Get tickets” button sends people straight there.' },
  { q: 'My event is already on Tsacoal. Who put it there?', a: 'We list public events so people can find everything in one place. Claim it and it moves to your account: you can edit it, add tickets and see its numbers.' },
  { q: 'Who checks events?', a: 'We check your first event before it goes live, to keep the feed real. After that, you publish straight away.' },
];

const gradText: React.CSSProperties = { background: GRAD.text, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' };
const mintText: React.CSSProperties = { background: GRAD.mint, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' };

export default async function OrganisersPage() {
  const n = await numbers().catch(() => null);
  const flyers = n?.flyers ?? [];
  const lead = flyers[0];
  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed', overflowX: 'hidden' }}>
      <Nav back="/" />

      {/* Hero: a wall of this season's flyers behind the headline, fading into the page */}
      {flyers.length > 0 && (
        <div style={{ position: 'relative', height: 'calc(min(60vw, 290px) + 70px + env(safe-area-inset-top, 0px))' }}>
          <FlyerWall images={flyers.map((f) => hiRes(f.image_url, 360) ?? f.image_url)} height="calc(100% + 190px)" />
        </div>
      )}

      <main style={{ maxWidth: 760, margin: '0 auto', padding: flyers.length ? '0 20px 20px' : 'calc(110px + env(safe-area-inset-top, 0px)) 20px 20px', position: 'relative', zIndex: 2 }}>
        <p style={eyebrow}>For organisers</p>
        <h1 style={{ margin: '12px 0 0', fontFamily: FONT.display, fontSize: 'clamp(46px, 13vw, 80px)', fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, paddingBottom: '0.06em' }}>
          <span style={gradText}>Get your show </span><span style={mintText}>seen.</span>
        </h1>
        <p style={{ margin: '16px 0 0', maxWidth: 480, fontFamily: FONT.sans, fontSize: 17, lineHeight: 1.5, color: T.text2 }}>
          List it free. Flyer to live in two minutes.
        </p>
        {/* One main action; claiming is for organisers whose show we already listed, so it's a quiet line under it */}
        <div style={{ marginTop: 28, maxWidth: 380 }}>
          <Link href="/organizer/events/new" style={{ ...BTN.primary, boxShadow: 'none', height: 46, padding: '0 20px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 15, textDecoration: 'none' }}>List your event <ArrowRight size={16} /></Link>
          <Link href="/organisers/claim" style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: FONT.sans, fontSize: 14.5, color: T.text2, textDecoration: 'none' }}>
            <BadgeCheck size={16} color={T.mintText} />Already listed? <span style={{ color: T.mintText, fontWeight: 700 }}>Claim your event</span>
          </Link>
        </div>

        {n && n.events > 0 && (
          <div style={{ display: 'flex', gap: 'clamp(28px, 10vw, 64px)', marginTop: 52 }}>
            {[{ v: n.events, l: 'upcoming shows listed' }, { v: n.moments, l: 'moments from past nights' }].map((x) => (
              <div key={x.l}>
                <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 'clamp(48px, 13vw, 72px)', fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 0.9, ...mintText }}>{x.v.toLocaleString()}</p>
                <p style={{ margin: '8px 0 0', fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>{x.l}</p>
              </div>
            ))}
          </div>
        )}

        {/* What a listing looks like, then why it works */}
        <section style={{ marginTop: 88 }}>
          <p style={eyebrow}>Why Tsacoal</p>
          <h2 style={{ ...h2, fontSize: 'clamp(32px, 8.5vw, 48px)', letterSpacing: '-0.04em' }}>More people at the door.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 40, alignItems: 'center', marginTop: 30 }}>
            {lead && (
              <div aria-hidden style={{ position: 'relative', width: '100%', maxWidth: 340, aspectRatio: '4 / 5.4', margin: '0 auto', borderRadius: 26, overflow: 'hidden', boxShadow: '0 40px 80px -30px rgba(0,0,0,0.85), 0 0 90px -30px rgba(91,217,154,0.4)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lead.image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '72%', objectFit: 'cover', objectPosition: 'center top' }} />
                <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(9,16,12,0) 45%, rgba(9,18,13,0.92) 66%, #0A140F 100%)' }} />
                <span style={{ position: 'absolute', left: 18, right: 18, bottom: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ display: 'flex', gap: 6 }}>
                    <span style={{ height: 24, padding: '0 9px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 4, background: GRAD.mint, color: T.onMint, fontFamily: FONT.sans, fontSize: 11.5, fontWeight: 800 }}><Flame size={12} /> Hot</span>
                    <span style={{ height: 24, padding: '0 9px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.1)', color: T.white, fontFamily: FONT.sans, fontSize: 11.5, fontWeight: 700 }}><Eye size={12} /> 1.2k</span>
                  </span>
                  <span style={{ fontFamily: FONT.display, fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, color: T.white, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{lead.title}</span>
                  <span style={{ fontFamily: FONT.sans, fontSize: 13, color: T.text2 }}>{lead.venue}</span>
                  <span style={{ marginTop: 4, height: 42, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: GRAD.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 14, fontWeight: 800, boxShadow: '0 10px 26px -10px rgba(91,217,154,0.7)' }}>Get tickets</span>
                </span>
              </div>
            )}
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 30 }}>
              {WHY.map(({ title, body }, i) => (
                <li key={title} style={{ display: 'flex', gap: 18 }}>
                  <span style={{ fontFamily: FONT.display, fontSize: 30, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, minWidth: 40, ...mintText }}>{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>{title}</span>
                    <span style={{ display: 'block', marginTop: 6, fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.55, color: T.text2 }}>{body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section style={{ marginTop: 96 }}>
          <p style={eyebrow}>How it works</p>
          <h2 style={{ ...h2, fontSize: 'clamp(32px, 8.5vw, 48px)', letterSpacing: '-0.04em' }}>Live in two minutes.</h2>
          <ol style={{ listStyle: 'none', margin: '34px 0 0', padding: 0, position: 'relative' }}>
            <span aria-hidden style={{ position: 'absolute', left: 21, top: 30, bottom: 30, width: 2, borderRadius: 1, background: 'linear-gradient(180deg, rgba(123,227,168,0.7), rgba(123,227,168,0.08))' }} />
            {STEPS.map(({ icon: I, title, body }, i) => (
              <li key={title} style={{ position: 'relative', display: 'flex', gap: 20, alignItems: 'flex-start', paddingBottom: i === STEPS.length - 1 ? 0 : 34 }}>
                <span style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: GRAD.mint, color: T.onMint, boxShadow: '0 10px 26px -10px rgba(91,217,154,0.7), inset 0 1px 0 rgba(255,255,255,0.7)' }}><I size={20} /></span>
                <span style={{ paddingTop: 2 }}>
                  <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.mintText }}>Step {i + 1}</span>
                  <span style={{ display: 'block', marginTop: 4, fontFamily: FONT.display, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>{title}</span>
                  <span style={{ display: 'block', marginTop: 6, maxWidth: 520, fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.55, color: T.text2 }}>{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section style={{ marginTop: 96 }}>
          <p style={eyebrow}>Questions</p>
          <h2 style={{ ...h2, fontSize: 'clamp(32px, 8.5vw, 48px)', letterSpacing: '-0.04em' }}>Good to know.</h2>
          <div style={{ marginTop: 28, display: 'grid', gap: 28 }}>
            {FAQ.map((f) => (
              <div key={f.q}>
                <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 18.5, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>{f.q}</p>
                <p style={{ margin: '8px 0 0', maxWidth: 580, fontFamily: FONT.sans, fontSize: 15.5, lineHeight: 1.6, color: T.text2 }}>{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 72, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>Got a show coming up?</p>
            <p style={{ margin: '4px 0 0', fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>Free to list, and it takes two minutes.</p>
          </div>
          <Link href="/organizer/events/new" style={{ height: 42, padding: '0 18px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6, background: GRAD.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 14.5, fontWeight: 700, textDecoration: 'none' }}>List your event <ArrowRight size={16} /></Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
