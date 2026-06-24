import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import HeroSlider from '@/components/home/HeroSlider';
import EventCard from '@/components/ui/EventCard';
import CityCard from '@/components/ui/CityCard';
import { events, cities } from '@/lib/data/events';

const C = {
  bg:     '#0D0B08', bg2: '#141109', bg3: '#1C1710',
  gold:   '#C8922A', goldDim: 'rgba(200,146,42,0.14)', goldBd: 'rgba(200,146,42,0.28)',
  cream:  '#F5ECD7', c2: 'rgba(245,236,215,0.55)', c3: 'rgba(245,236,215,0.24)',
  c4:     'rgba(245,236,215,0.08)', bd: 'rgba(245,236,215,0.07)', bd2: 'rgba(245,236,215,0.13)',
};

const trending = events.filter(e => e.hot).slice(0, 6);
const weekend  = events.slice(0, 8);
const featured = events.slice(0, 7);

const MOMENTS = [
  { src: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&q=80', label: 'Afrochella 2024',    date: 'Dec 2024' },
  { src: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=500&q=80', label: 'VGMA Awards Night', date: 'Nov 2024' },
  { src: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&q=80', label: 'Chale Wote 2024',   date: 'Aug 2024' },
  { src: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80', label: 'Highlife Nights',   date: 'Mar 2024' },
  { src: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=500&q=80', label: 'Jollof Wars',       date: 'Jun 2024' },
];

const PULSE = [
  { label: 'Live Now',   value: '40',    dot: '#C8922A' },
  { label: 'Accra',      value: '18',    dot: '#C8922A' },
  { label: 'Kumasi',     value: '8',     dot: '#C8922A' },
  { label: 'Cape Coast', value: '5',     dot: '#C8922A' },
  { label: 'Tamale',     value: '4',     dot: '#C8922A' },
  { label: 'Updated',    value: 'Today', dot: '#CE1126', last: true },
];

function SectionHead({
  eyebrow, title, italic, href,
}: {
  eyebrow: string; title: string; italic?: string; href?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 48, paddingBottom: 20 }}>
      <div>
        <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.7, marginBottom: 8 }}>
          <span style={{ display: 'block', width: 16, height: 1, background: C.gold }} />
          {eyebrow}
        </p>
        <h2 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 'clamp(22px,3vw,30px)', fontWeight: 300, letterSpacing: '-0.5px', color: C.cream }}>
          {title}{italic && <> <em style={{ fontStyle: 'italic', color: C.c2 }}>{italic}</em></>}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '2px', textTransform: 'uppercase', color: C.c3, border: `1px solid ${C.bd}`, padding: '8px 16px', textDecoration: 'none', transition: 'all 0.18s' }}
        >
          See all
        </Link>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <div style={{ background: C.bg }}>
      <Nav transparent active="Discover" />
      <HeroSlider />

      {/* Pulse bar */}
      <div style={{ display: 'flex', alignItems: 'center', background: C.bg2, borderBottom: `1px solid ${C.bd}`, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {PULSE.map((p) => (
          <div
            key={p.label}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRight: p.last ? 'none' : `1px solid ${C.bd}`, flexShrink: 0, marginLeft: p.last ? 'auto' : 0 }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.dot, boxShadow: `0 0 7px ${p.dot}`, flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.c3, whiteSpace: 'nowrap' }}>{p.label}</span>
            <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '1px', color: C.c2, fontWeight: 500 }}>{p.value}</span>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 clamp(20px,4vw,44px)' }}>

        {/* Trending scroll */}
        <SectionHead eyebrow="Right now" title="Trending" italic="this month" href="/events" />
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          <Link
            href={`/events/${trending[0]?.slug}`}
            className="group"
            style={{ position: 'relative', flexShrink: 0, width: 'clamp(300px,40vw,560px)', height: 'clamp(260px,30vw,340px)', borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.bd}`, textDecoration: 'none' }}
          >
            <Image src={trending[0]?.image ?? ''} alt={trending[0]?.title ?? ''} fill sizes="560px"
              style={{ objectFit: 'cover', filter: 'brightness(0.44) saturate(0.78)' }}
              className="transition-transform duration-500 group-hover:scale-[1.05]"
            />
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${C.bg} 0%, rgba(13,11,8,0.28) 60%, transparent 100%)` }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 22, zIndex: 10 }}>
              <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '4px 9px', borderRadius: 3, background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBd}`, display: 'inline-block', marginBottom: 10 }}>
                {trending[0]?.badge}
              </span>
              <h3 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 'clamp(24px,3.5vw,32px)', fontWeight: 300, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.5px', marginBottom: 8 }}>
                {trending[0]?.title}
              </h3>
              <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '0.5px', color: 'rgba(245,236,215,0.4)' }}>
                {trending[0]?.dateLabel} · {trending[0]?.venue}
              </p>
            </div>
          </Link>
          {trending.slice(1).map(ev => (
            <Link
              key={ev.id}
              href={`/events/${ev.slug}`}
              className="group"
              style={{ position: 'relative', flexShrink: 0, width: 'clamp(260px,28vw,380px)', height: 'clamp(210px,22vw,260px)', borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.bd}`, textDecoration: 'none' }}
            >
              <Image src={ev.image} alt={ev.title} fill sizes="380px"
                style={{ objectFit: 'cover', filter: 'brightness(0.44) saturate(0.78)' }}
                className="transition-transform duration-500 group-hover:scale-[1.05]"
              />
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${C.bg} 0%, rgba(13,11,8,0.22) 60%, transparent 100%)` }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '18px 20px', zIndex: 10 }}>
                <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '4px 9px', borderRadius: 3, background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBd}`, display: 'inline-block', marginBottom: 8 }}>
                  {ev.badge}
                </span>
                <h3 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 'clamp(16px,2vw,20px)', fontWeight: 300, color: '#fff', lineHeight: 1.15, marginBottom: 6 }}>
                  {ev.title}
                </h3>
                <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, color: 'rgba(245,236,215,0.38)' }}>
                  {ev.dateLabel} · {ev.venue} · {ev.price === 0 ? 'Free' : `₵${ev.price}`}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Weekend poster row */}
        <SectionHead eyebrow="Don't miss out" title="This" italic="Weekend" href="/events" />
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {weekend.map(ev => (
            <Link
              key={ev.id}
              href={`/events/${ev.slug}`}
              className="group"
              style={{ flexShrink: 0, width: 158, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.bd}`, background: C.bg2, textDecoration: 'none', transition: 'transform 0.3s, border-color 0.3s' }}
            >
              <div style={{ position: 'relative', height: 240, overflow: 'hidden' }}>
                <Image src={ev.image} alt={ev.title} fill sizes="158px"
                  style={{ objectFit: 'cover' }}
                  className="transition-transform duration-500 group-hover:scale-[1.06]"
                />
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${C.bg2} 0%, transparent 55%)` }} />
                <div
                  className="group-hover:opacity-100 group-hover:translate-y-0"
                  style={{ position: 'absolute', bottom: 68, left: 8, right: 8, textAlign: 'center', background: 'rgba(13,11,8,0.88)', border: `1px solid ${C.goldBd}`, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, padding: 8, opacity: 0, transform: 'translateY(6px)', transition: 'all 0.2s', backdropFilter: 'blur(8px)' }}
                >
                  Get tickets
                </div>
              </div>
              <div style={{ padding: '10px 12px 14px' }}>
                <p style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 14, fontWeight: 400, color: C.cream, lineHeight: 1.2, marginBottom: 4 }}>{ev.title}</p>
                <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '0.5px', color: C.c3, marginBottom: 4 }}>{ev.dateLabel} · {ev.city}</p>
                <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 12, color: ev.price === 0 ? '#4ade80' : C.gold }}>
                  {ev.price === 0 ? 'Free' : `₵${ev.price}`}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Featured grid */}
        <SectionHead eyebrow="Curated picks" title="Featured" italic="Events" href="/events" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 12 }}>
          <div className="col-span-12 md:col-span-7 md:row-span-2">
            <EventCard event={featured[0]} size="feature" className="h-full min-h-[400px] md:min-h-[460px]" />
          </div>
          <div className="col-span-12 md:col-span-5">
            <EventCard event={featured[1]} size="standard" />
          </div>
          <div className="col-span-12 md:col-span-5">
            <EventCard event={featured[2]} size="standard" />
          </div>
          {featured.slice(3, 7).map(ev => (
            <div key={ev.id} className="col-span-6 md:col-span-3">
              <EventCard event={ev} size="mini" />
            </div>
          ))}
        </div>

        {/* Moments */}
        <SectionHead eyebrow="From the crowd" title="" italic="Moments" href="#" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {MOMENTS.map((m, i) => (
            <div
              key={i}
              className={`group relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] ${i === 0 ? 'sm:row-span-2' : ''}`}
              style={{ borderRadius: 12, border: `1px solid ${C.bd}`, aspectRatio: i === 0 ? 'auto' : '9/16', minHeight: i === 0 ? 340 : 'auto' }}
            >
              <Image src={m.src} alt={m.label} fill sizes="300px"
                style={{ objectFit: 'cover' }}
                className="transition-transform duration-500 group-hover:scale-[1.06]"
              />
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {cities.map(city => <CityCard key={city.slug} city={city} />)}
        </div>

        {/* Organizer CTA */}
        <div style={{ marginTop: 64, borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.bd}`, background: C.bg2 }} className="grid md:grid-cols-2">
          <div style={{ padding: 'clamp(32px,4vw,56px)', borderBottom: `1px solid ${C.bd}` }} className="md:border-b-0 md:border-r md:border-r-[rgba(245,236,215,0.07)]">
            <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, marginBottom: 20 }}>
              <span style={{ display: 'block', width: 16, height: 1, background: C.gold }} />
              For organizers
            </p>
            <h2 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 'clamp(28px,3.5vw,48px)', fontWeight: 300, letterSpacing: '-2px', lineHeight: 0.92, marginBottom: 16 }}>
              Sell tickets<br /><em style={{ fontStyle: 'italic' }}>the smart way</em>
            </h2>
            <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 14, color: C.c2, lineHeight: 1.7, fontWeight: 300, maxWidth: 360, marginBottom: 32 }}>
              Create your event in minutes. Set ticket tiers, track sales in real time, and get paid via MoMo, Vodafone Cash, or bank transfer.
            </p>
            <Link
              href="#"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: C.gold, color: '#0D0B08', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 6, textDecoration: 'none', fontWeight: 700 }}
            >
              Start selling tickets <ArrowRight size={13} />
            </Link>
          </div>
          <div className="grid grid-rows-2">
            {[
              { num: '180k',   label: 'Tickets sold this year'  },
              { num: '2,400+', label: 'Events listed in 2025'   },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(24px,3vw,44px)', borderBottom: i === 0 ? `1px solid ${C.bd}` : 'none' }}>
                <p style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 'clamp(40px,5vw,54px)', fontWeight: 300, letterSpacing: '-3px', lineHeight: 1, marginBottom: 6, color: C.cream }}>{s.num}</p>
                <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.c3 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Payment strip */}
        <div style={{ margin: '64px 0 4px', padding: 'clamp(28px,4vw,48px)', borderRadius: 16, border: `1px solid ${C.bd}`, background: C.bg2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,146,42,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div>
            <h3 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 'clamp(26px,3vw,34px)', fontWeight: 300, letterSpacing: '-1.5px', marginBottom: 8 }}>
              Pay the way <span style={{ color: C.gold }}>Ghana</span> pays
            </h3>
            <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c2, lineHeight: 1.65, fontWeight: 300, maxWidth: 380 }}>
              Instant QR tickets. No app needed. Pay with MoMo, Vodafone Cash, AirtelTigo or card.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 20 }}>
              {['MTN MoMo', 'Vodafone Cash', 'AirtelTigo', 'Paystack', 'Visa / Mastercard'].map((p, i) => (
                <span key={p} style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '1px', textTransform: 'uppercase', padding: '6px 14px', borderRadius: 6, border: `1px solid ${i < 3 ? C.goldBd : C.bd}`, color: i < 3 ? C.gold : C.c3, background: i < 3 ? C.goldDim : 'transparent' }}>
                  {p}
                </span>
              ))}
            </div>
          </div>
          <Link
            href="#"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: C.gold, color: '#0D0B08', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', padding: '15px 32px', borderRadius: 6, textDecoration: 'none', fontWeight: 700, flexShrink: 0 }}
          >
            Start selling <ArrowRight size={13} />
          </Link>
        </div>

      </div>
      <Footer />
    </div>
  );
            }
