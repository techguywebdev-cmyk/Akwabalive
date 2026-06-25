'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import HeroSlider from '@/components/home/HeroSlider';
import { events, cities } from '@/lib/data/events';

const C = {
  bg:      '#0D0B08',
  bg2:     '#141109',
  bg3:     '#1C1710',
  gold:    '#C8922A',
  goldDim: 'rgba(200,146,42,0.14)',
  goldBd:  'rgba(200,146,42,0.28)',
  cream:   '#F5ECD7',
  c2:      'rgba(245,236,215,0.55)',
  c3:      'rgba(245,236,215,0.24)',
  c4:      'rgba(245,236,215,0.08)',
  bd:      'rgba(245,236,215,0.07)',
  bd2:     'rgba(245,236,215,0.13)',
  red:     '#CE1126',
};

const trending = events.filter(e => e.hot).slice(0, 6);
const weekend  = events.slice(0, 8);
const featured = events.slice(0, 7);

const MOMENTS = [
  { src: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&q=80&auto=format&fit=crop', label: 'Afrochella 2024',    date: 'Dec 2024' },
  { src: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=500&q=80&auto=format&fit=crop', label: 'VGMA Awards Night', date: 'Nov 2024' },
  { src: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&q=80&auto=format&fit=crop', label: 'Chale Wote 2024',   date: 'Aug 2024' },
  { src: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80&auto=format&fit=crop', label: 'Highlife Nights',   date: 'Mar 2024' },
  { src: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=500&q=80&auto=format&fit=crop', label: 'Jollof Wars',       date: 'Jun 2024' },
];

const PULSE = [
  { label: 'Live Now',   value: '40',    dot: '#C8922A' },
  { label: 'Accra',      value: '18',    dot: '#C8922A' },
  { label: 'Kumasi',     value: '8',     dot: '#C8922A' },
  { label: 'Cape Coast', value: '5',     dot: '#C8922A' },
  { label: 'Tamale',     value: '4',     dot: '#C8922A' },
  { label: 'Updated',    value: 'Today', dot: '#CE1126', last: true },
];

function SectionHead({ eyebrow, title, italic, href }: {
  eyebrow: string; title: string; italic?: string; href?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 52, paddingBottom: 20 }}>
      <div>
        <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, marginBottom: 8 }}>
          <span style={{ display: 'block', width: 16, height: 1, background: C.gold }} />
          {eyebrow}
        </p>
        <h2 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 'clamp(24px,4vw,32px)', fontWeight: 300, letterSpacing: '-0.5px', color: C.cream, lineHeight: 1.1 }}>
          {title}{italic && <em style={{ fontStyle: 'italic', color: C.c2 }}> {italic}</em>}
        </h2>
      </div>
      {href && (
        <Link href={href} style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.c3, border: `1px solid ${C.bd}`, padding: '8px 16px', textDecoration: 'none', borderRadius: 4, flexShrink: 0 }}>
          See all
        </Link>
      )}
    </div>
  );
}

function EventCard({ event }: { event: typeof events[0] }) {
  return (
    <Link
      href={`/events`}
      style={{
        display: 'block', position: 'relative', overflow: 'hidden',
        borderRadius: 12, border: `1px solid ${C.bd}`,
        background: C.bg2, textDecoration: 'none',
        transition: 'transform 300ms ease, border-color 300ms',
      }}
    >
      {event.hot && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${C.gold}, rgba(200,146,42,0.1))`, zIndex: 6 }} />
      )}
      <div style={{
        width: '100%', paddingTop: '58%', position: 'relative',
        overflow: 'hidden', background: C.bg3,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${event.image})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'brightness(0.72) saturate(0.82)',
          transition: 'transform 600ms ease',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${C.bg2} 0%, transparent 60%)` }} />
        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 4 }}>
          <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '4px 8px', borderRadius: 3, background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBd}` }}>
            {event.badge}
          </span>
        </div>
      </div>
      <div style={{ padding: '14px 16px 16px' }}>
        <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 10, color: C.c3, marginBottom: 5 }}>
          {event.city.charAt(0).toUpperCase() + event.city.slice(1)} · {event.venue}
        </p>
        <h3 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 18, fontWeight: 400, color: C.cream, lineHeight: 1.2, marginBottom: 10, letterSpacing: '-0.2px' }}>
          {event.title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: `1px solid ${C.bd}` }}>
          {event.price === 0
            ? <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#4ade80' }}>Free</span>
            : <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 15, color: C.cream }}>
                <span style={{ fontSize: 9, color: C.gold }}>₵</span>{event.price}
              </span>
          }
          <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '2px', textTransform: 'uppercase', background: C.gold, color: '#000', padding: '7px 14px', borderRadius: 5, fontWeight: 700 }}>
            Tickets
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', overflowX: 'hidden' }}>
      <Nav transparent active="Discover" />
      <HeroSlider />

      {/* Pulse bar */}
      <div style={{ display: 'flex', alignItems: 'center', background: C.bg2, borderBottom: `1px solid ${C.bd}`, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {PULSE.map(p => (
          <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRight: p.last ? 'none' : `1px solid ${C.bd}`, flexShrink: 0, marginLeft: p.last ? 'auto' : 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.dot, boxShadow: `0 0 7px ${p.dot}`, flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.c3, whiteSpace: 'nowrap' }}>{p.label}</span>
            <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, color: C.c2 }}>{p.value}</span>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 20px' }}>

        {/* Trending scroll */}
        <SectionHead eyebrow="Right now" title="Trending" italic="this month" href="/events" />
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {/* Hero tall card */}
          <Link href="/events" style={{ position: 'relative', flexShrink: 0, width: 'min(75vw, 480px)', height: 'min(50vw, 300px)', borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.bd}`, textDecoration: 'none', display: 'block' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${trending[0]?.image})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.44) saturate(0.78)' }} />
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${C.bg} 0%, transparent 60%)` }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18, zIndex: 2 }}>
              <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 3, background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBd}`, display: 'inline-block', marginBottom: 8 }}>
                {trending[0]?.badge}
              </span>
              <h3 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 'clamp(20px,4vw,28px)', fontWeight: 300, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.5px', marginBottom: 6 }}>
                {trending[0]?.title}
              </h3>
              <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, color: 'rgba(245,236,215,0.4)' }}>
                {trending[0]?.dateLabel} · {trending[0]?.venue}
              </p>
            </div>
          </Link>

          {trending.slice(1).map(ev => (
            <Link key={ev.id} href="/events" style={{ position: 'relative', flexShrink: 0, width: 'min(60vw, 320px)', height: 'min(40vw, 220px)', borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.bd}`, textDecoration: 'none', display: 'block' }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${ev.image})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.44) saturate(0.78)' }} />
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${C.bg} 0%, transparent 60%)` }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 16px', zIndex: 2 }}>
                <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 3, background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBd}`, display: 'inline-block', marginBottom: 6 }}>
                  {ev.badge}
                </span>
                <h3 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 'clamp(15px,3vw,18px)', fontWeight: 300, color: '#fff', lineHeight: 1.15, marginBottom: 4 }}>
                  {ev.title}
                </h3>
                <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, color: 'rgba(245,236,215,0.38)' }}>
                  {ev.dateLabel} · {ev.price === 0 ? 'Free' : `₵${ev.price}`}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Weekend poster row */}
        <SectionHead eyebrow="Don't miss out" title="This" italic="Weekend" href="/events" />
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {weekend.map(ev => (
            <Link key={ev.id} href="/events" style={{ flexShrink: 0, width: 148, borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.bd}`, background: C.bg2, textDecoration: 'none', display: 'block' }}>
              <div style={{ position: 'relative', height: 220 }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${ev.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${C.bg2} 0%, transparent 55%)` }} />
              </div>
              <div style={{ padding: '10px 12px 14px' }}>
                <p style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 14, fontWeight: 400, color: C.cream, lineHeight: 1.2, marginBottom: 4 }}>{ev.title}</p>
                <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, color: C.c3, marginBottom: 4 }}>{ev.dateLabel}</p>
                <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 12, color: ev.price === 0 ? '#4ade80' : C.gold }}>
                  {ev.price === 0 ? 'Free' : `₵${ev.price}`}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Featured 2-col grid */}
        <SectionHead eyebrow="Curated picks" title="Featured" italic="Events" href="/events" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {featured.slice(0, 6).map(ev => (
            <EventCard key={ev.id} event={ev} />
          ))}
        </div>

        {/* Moments */}
        <SectionHead eyebrow="From the crowd" title="" italic="Moments" href="#" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {MOMENTS.map((m, i) => (
            <div key={i} style={{
              position: 'relative', overflow: 'hidden', borderRadius: 10,
              border: `1px solid ${C.bd}`,
              aspectRatio: '9/16',
              gridColumn: i === 0 ? 'span 2' : 'span 1',
              ...(i === 0 ? { aspectRatio: '16/9' } : {}),
            }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${m.src})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,11,8,0.88) 0%, transparent 55%)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 }}>
                <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.gold, marginBottom: 4 }}>{m.date}</p>
                <p style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 14, color: 'rgba(245,236,215,0.85)', lineHeight: 1.2 }}>{m.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Cities */}
        <SectionHead eyebrow="Explore Ghana" title="Events by" italic="City" href="/events" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {cities.map(city => (
            <Link key={city.slug} href={`/events`} style={{ position: 'relative', overflow: 'hidden', borderRadius: 10, border: `1px solid ${C.bd}`, textDecoration: 'none', display: 'block' }}>
              <div style={{ height: 160, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${city.image})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.48) saturate(0.7)' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0D0B08 0%, transparent 100%)' }} />
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 16px' }}>
                <div style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 20, fontWeight: 400, color: '#F5ECD7', letterSpacing: '-0.3px' }}>{city.name}</div>
                <div style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(245,236,215,0.28)', marginTop: 2 }}>{city.count} events</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Organizer CTA */}
        <div style={{ marginTop: 56, borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.bd}`, background: C.bg2 }}>
          <div style={{ padding: '40px 28px 36px', borderBottom: `1px solid ${C.bd}` }}>
            <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, marginBottom: 16 }}>
              <span style={{ display: 'block', width: 16, height: 1, background: C.gold }} />
              For organizers
            </p>
            <h2 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 'clamp(28px,6vw,44px)', fontWeight: 300, letterSpacing: '-2px', lineHeight: 0.95, marginBottom: 14 }}>
              Sell tickets<br /><em style={{ fontStyle: 'italic' }}>the smart way</em>
            </h2>
            <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 14, color: C.c2, lineHeight: 1.7, fontWeight: 300, marginBottom: 28 }}>
              Create your event in minutes. Set ticket tiers, track sales in real time, and get paid via MoMo, Vodafone Cash, or bank transfer.
            </p>
            <Link href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: C.gold, color: '#0D0B08', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', padding: '14px 24px', borderRadius: 6, textDecoration: 'none', fontWeight: 700 }}>
              Start selling tickets <ArrowRight size={13} />
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {[
              { num: '180k',   label: 'Tickets sold' },
              { num: '2,400+', label: 'Events in 2025' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '28px 24px', borderRight: i === 0 ? `1px solid ${C.bd}` : 'none' }}>
                <p style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 'clamp(36px,7vw,52px)', fontWeight: 300, letterSpacing: '-3px', lineHeight: 1, marginBottom: 6, color: C.cream }}>{s.num}</p>
                <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '2px', textTransform: 'uppercase', color: C.c3 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Payment strip */}
        <div style={{ margin: '48px 0 8px', padding: '36px 28px', borderRadius: 14, border: `1px solid ${C.bd}`, background: C.bg2, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,146,42,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <h3 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 'clamp(24px,5vw,32px)', fontWeight: 300, letterSpacing: '-1.5px', marginBottom: 8 }}>
            Pay the way <span style={{ color: C.gold }}>Ghana</span> pays
          </h3>
          <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c2, lineHeight: 1.65, fontWeight: 300, marginBottom: 20 }}>
            Instant QR tickets. No app needed. Pay with MoMo, Vodafone Cash, AirtelTigo or card.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
            {['MTN MoMo', 'Vodafone Cash', 'AirtelTigo', 'Paystack', 'Visa / Mastercard'].map((p, i) => (
              <span key={p} style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '1px', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 5, border: `1px solid ${i < 3 ? C.goldBd : C.bd}`, color: i < 3 ? C.gold : C.c3, background: i < 3 ? C.goldDim : 'transparent' }}>
                {p}
              </span>
            ))}
          </div>
          <Link href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: C.gold, color: '#0D0B08', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', padding: '13px 24px', borderRadius: 6, textDecoration: 'none', fontWeight: 700 }}>
            Start selling <ArrowRight size={13} />
          </Link>
        </div>

      </div>
      <Footer />
    </div>
  );
      }
