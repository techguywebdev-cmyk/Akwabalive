'use client';
import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import HeroSlider from '@/components/home/HeroSlider';
import CityCard from '@/components/ui/CityCard';
import { events, cities } from '@/lib/data/events';
import { C, G, R } from '@/lib/theme';

const mono = 'var(--font-dm-mono,monospace)';
const sans = 'var(--font-inter,sans-serif)';
const serif = 'var(--font-cormorant,serif)';

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
  { label: 'Live now',   value: '40',    dot: C.gold },
  { label: 'Accra',      value: '18',    dot: C.gold },
  { label: 'Kumasi',     value: '8',     dot: C.gold },
  { label: 'Cape Coast', value: '5',     dot: C.gold },
  { label: 'Tamale',     value: '4',     dot: C.gold },
  { label: 'Updated',    value: 'Today', dot: C.red },
];

const chip: React.CSSProperties = {
  ...G.overlay, fontFamily: mono, fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase',
  padding: '5px 10px', borderRadius: R.chip, color: C.cream, border: '1px solid rgba(255,255,255,0.16)', display: 'inline-block',
};

function SectionHead({ eyebrow, title, italic, href }: {
  eyebrow: string; title: string; italic?: string; href?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, paddingTop: 52, paddingBottom: 18 }}>
      <div>
        <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: C.goldText, marginBottom: 8 }}>
          {eyebrow}
        </p>
        <h2 style={{ fontFamily: serif, fontSize: 'clamp(26px,4vw,34px)', fontWeight: 500, color: C.cream, lineHeight: 1.1 }}>
          {title}{italic && <em style={{ fontStyle: 'italic', color: C.c2 }}> {italic}</em>}
        </h2>
      </div>
      {href && (
        <Link href={href} style={{ ...G.raised, fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.cream, border: `1px solid ${C.bd2}`, padding: '10px 16px', textDecoration: 'none', borderRadius: R.chip, flexShrink: 0 }}>
          See all
        </Link>
      )}
    </div>
  );
}

/** Photo tile with a frosted caption panel (replaces dark gradient fades). */
function PhotoTile({ href, image, badge, title, meta, width, height, big }: {
  href: string; image: string; badge?: string; title: string; meta: string; width: string; height: string; big?: boolean;
}) {
  return (
    <Link href={href} style={{ position: 'relative', flexShrink: 0, width, height, borderRadius: R.card, overflow: 'hidden', border: `1px solid ${C.bd}`, textDecoration: 'none', display: 'block', background: C.bg3 }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      {badge && <span style={{ ...chip, position: 'absolute', top: 10, left: 10 }}>{badge}</span>}
      <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10, ...G.panel, border: `1px solid ${C.bd2}`, borderRadius: R.card - 6, padding: big ? '12px 16px' : '10px 12px' }}>
        <h3 style={{ fontFamily: serif, fontSize: big ? 'clamp(20px,4vw,26px)' : 17, fontWeight: 500, color: C.cream, lineHeight: 1.12, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </h3>
        <p style={{ fontFamily: mono, fontSize: 11, color: C.c2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta}</p>
      </div>
    </Link>
  );
}

function EventCard({ event }: { event: typeof events[0] }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-[rgba(200,146,42,0.4)]"
      style={{ display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', borderRadius: R.card, border: `1px solid ${C.bd}`, ...G.panel, textDecoration: 'none' }}
    >
      <div style={{ width: '100%', paddingTop: '58%', position: 'relative', overflow: 'hidden', background: C.bg3 }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${event.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <span style={{ ...chip, position: 'absolute', top: 10, left: 10 }}>
          {event.hot && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 6, background: C.gold, marginRight: 6, verticalAlign: 1 }} />}
          {event.badge}
        </span>
      </div>
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <p style={{ fontFamily: sans, fontSize: 11, color: C.c3, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {event.city.charAt(0).toUpperCase() + event.city.slice(1)} · {event.venue}
        </p>
        <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 500, color: C.cream, lineHeight: 1.15, marginBottom: 12 }}>
          {event.title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 12, marginTop: 'auto', borderTop: `1px solid ${C.bd}` }}>
          {event.price === 0
            ? <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: C.greenL }}>Free</span>
            : <span style={{ fontFamily: mono, fontSize: 16, color: C.cream }}>
                <span style={{ fontSize: 11, color: C.goldText }}>₵</span>{event.price}
              </span>
          }
          <span style={{ fontFamily: sans, fontSize: 12, background: C.gold, color: C.onAccent, padding: '8px 14px', borderRadius: R.btn - 2, fontWeight: 700 }}>
            Tickets
          </span>
        </div>
      </div>
    </Link>
  );
}

const rowScroll = { display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties;

export default function HomePage() {
  return (
    <div style={{ background: 'transparent', minHeight: '100vh', overflowX: 'hidden' }}>
      <Nav transparent active="Discover" />
      <HeroSlider />

      {/* Pulse bar */}
      <div className="no-scrollbar" style={{ display: 'flex', alignItems: 'center', ...G.bar, borderTop: `1px solid ${C.bd}`, borderBottom: `1px solid ${C.bd}`, overflowX: 'auto' }}>
        {PULSE.map((p, i) => (
          <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRight: i === PULSE.length - 1 ? 'none' : `1px solid ${C.bd}`, flexShrink: 0, marginLeft: i === PULSE.length - 1 ? 'auto' : 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.dot, flexShrink: 0 }} />
            <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.c3, whiteSpace: 'nowrap' }}>{p.label}</span>
            <span style={{ fontFamily: mono, fontSize: 11, color: C.cream }}>{p.value}</span>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 20px' }}>

        {/* Trending */}
        <SectionHead eyebrow="Right now" title="Trending" italic="this month" href="/events" />
        <div className="no-scrollbar" style={rowScroll}>
          {trending[0] && (
            <PhotoTile big href={`/events/${trending[0].slug}`} image={trending[0].image} badge={trending[0].badge}
              title={trending[0].title} meta={`${trending[0].dateLabel} · ${trending[0].venue}`}
              width="min(78vw, 480px)" height="min(56vw, 300px)" />
          )}
          {trending.slice(1).map(ev => (
            <PhotoTile key={ev.id} href={`/events/${ev.slug}`} image={ev.image} badge={ev.badge}
              title={ev.title} meta={`${ev.dateLabel} · ${ev.price === 0 ? 'Free' : `₵${ev.price}`}`}
              width="min(64vw, 320px)" height="min(56vw, 300px)" />
          ))}
        </div>

        {/* This weekend */}
        <SectionHead eyebrow="Don't miss out" title="This" italic="weekend" href="/events" />
        <div className="no-scrollbar" style={rowScroll}>
          {weekend.map(ev => (
            <Link key={ev.id} href={`/events/${ev.slug}`} style={{ flexShrink: 0, width: 156, borderRadius: R.card, overflow: 'hidden', border: `1px solid ${C.bd}`, ...G.panel, textDecoration: 'none', display: 'block' }}>
              <div style={{ position: 'relative', height: 200, background: C.bg3 }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${ev.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              </div>
              <div style={{ padding: '10px 12px 14px' }}>
                <p style={{ fontFamily: serif, fontSize: 16, fontWeight: 500, color: C.cream, lineHeight: 1.15, marginBottom: 6 }}>{ev.title}</p>
                <p style={{ fontFamily: mono, fontSize: 10, color: C.c3, marginBottom: 6 }}>{ev.dateLabel}</p>
                <p style={{ fontFamily: mono, fontSize: 13, color: ev.price === 0 ? C.greenL : C.goldText }}>
                  {ev.price === 0 ? 'Free' : `₵${ev.price}`}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Featured */}
        <SectionHead eyebrow="Curated picks" title="Featured" italic="events" href="/events" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 12 }}>
          {featured.slice(0, 6).map(ev => (
            <EventCard key={ev.id} event={ev} />
          ))}
        </div>

        {/* Moments */}
        <SectionHead eyebrow="From the crowd" title="" italic="Moments" href="/moments" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(46%, 220px), 1fr))', gap: 10 }}>
          {MOMENTS.map((m, i) => (
            <Link key={i} href="/moments" style={{ position: 'relative', overflow: 'hidden', borderRadius: R.card, border: `1px solid ${C.bd}`, aspectRatio: i === 0 ? '16/9' : '4/5', gridColumn: i === 0 ? '1 / -1' : 'auto', textDecoration: 'none', background: C.bg3 }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${m.src})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <span style={{ ...G.overlay, position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: 18, border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.cream }}>
                <Play size={14} fill="currentColor" />
              </span>
              <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10, ...G.panel, border: `1px solid ${C.bd2}`, borderRadius: R.card - 6, padding: '9px 12px' }}>
                <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.goldText, marginBottom: 3 }}>{m.date}</p>
                <p style={{ fontFamily: serif, fontSize: 17, fontWeight: 500, color: C.cream, lineHeight: 1.15 }}>{m.label}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Cities */}
        <SectionHead eyebrow="Explore Ghana" title="Events by" italic="city" href="/events" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(46%, 240px), 1fr))', gap: 10 }}>
          {cities.map(city => (
            <CityCard key={city.slug} city={city} />
          ))}
        </div>

        {/* Organizer CTA */}
        <div style={{ marginTop: 56, borderRadius: R.card + 4, overflow: 'hidden', border: `1px solid ${C.bd}`, ...G.panel }}>
          <div style={{ padding: '40px 28px 36px', borderBottom: `1px solid ${C.bd}` }}>
            <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: C.goldText, marginBottom: 14 }}>
              For organizers
            </p>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(30px,6vw,46px)', fontWeight: 500, letterSpacing: '-1px', lineHeight: 1, marginBottom: 14 }}>
              Sell tickets <em style={{ fontStyle: 'italic', color: C.c2 }}>the smart way</em>
            </h2>
            <p style={{ fontFamily: sans, fontSize: 15, color: C.c2, lineHeight: 1.65, marginBottom: 26, maxWidth: 560 }}>
              Create your event in minutes. Set ticket tiers, track sales in real time, and get paid via MoMo, Telecel Cash, or bank transfer.
            </p>
            <Link href="/organizer/events/new" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: C.gold, color: C.onAccent, fontFamily: sans, fontSize: 14, padding: '14px 22px', borderRadius: R.btn, textDecoration: 'none', fontWeight: 700 }}>
              Start selling tickets <ArrowRight size={15} />
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {[
              { num: '180k',   label: 'Tickets sold' },
              { num: '2,400+', label: 'Events in 2025' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '26px 24px', borderRight: i === 0 ? `1px solid ${C.bd}` : 'none' }}>
                <p style={{ fontFamily: serif, fontSize: 'clamp(36px,7vw,52px)', fontWeight: 500, letterSpacing: '-1.5px', lineHeight: 1, marginBottom: 6, color: C.cream }}>{s.num}</p>
                <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: C.c3 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Payments */}
        <div style={{ margin: '24px 0 8px', padding: '34px 28px', borderRadius: R.card + 4, border: `1px solid ${C.bd}`, ...G.panel }}>
          <h3 style={{ fontFamily: serif, fontSize: 'clamp(26px,5vw,34px)', fontWeight: 500, letterSpacing: '-0.5px', marginBottom: 8 }}>
            Pay the way <span style={{ color: C.goldText }}>Ghana</span> pays
          </h3>
          <p style={{ fontFamily: sans, fontSize: 14, color: C.c2, lineHeight: 1.65, marginBottom: 20 }}>
            Instant QR tickets. No app needed. Pay with MoMo, Telecel Cash, AirtelTigo or card.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
            {['MTN MoMo', 'Telecel Cash', 'AirtelTigo', 'Paystack', 'Visa / Mastercard'].map((p, i) => (
              <span key={p} style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.5px', padding: '7px 12px', borderRadius: R.chip, border: `1px solid ${i < 3 ? C.goldBd : C.bd2}`, color: i < 3 ? C.goldText : C.c2, background: i < 3 ? C.goldDim : C.bg3 }}>
                {p}
              </span>
            ))}
          </div>
          <Link href="/organizer/events/new" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: C.gold, color: C.onAccent, fontFamily: sans, fontSize: 14, padding: '13px 22px', borderRadius: R.btn, textDecoration: 'none', fontWeight: 700 }}>
            Start selling <ArrowRight size={15} />
          </Link>
        </div>

      </div>
      <Footer />
    </div>
  );
}
