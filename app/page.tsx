import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import HeroSlider from '@/components/home/HeroSlider';
import EventCard from '@/components/ui/EventCard';
import CityCard from '@/components/ui/CityCard';
import { events, cities } from '@/lib/data/events';

const trending   = events.filter(e => e.hot).slice(0, 6);
const weekend    = events.filter(e => e.price > 0).slice(0, 8);
const featured   = events.slice(0, 7);
const momentImgs = [
  { src: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&q=80', label: 'Afrochella 2024', date: 'Dec 2024' },
  { src: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=500&q=80', label: 'VGMA Awards Night', date: 'Nov 2024' },
  { src: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&q=80', label: 'Chale Wote 2024', date: 'Aug 2024' },
  { src: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80', label: 'Highlife Nights', date: 'Mar 2024' },
  { src: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=500&q=80', label: 'Jollof Wars', date: 'Jun 2024' },
];

/* ── SECTION HEADER ─────────────────────────────────── */
function SectionHead({
  eyebrow, title, titleItalic, href,
}: {
  eyebrow: string; title: string; titleItalic?: string; href?: string;
}) {
  return (
    <div className="flex items-end justify-between pt-12 pb-5">
      <div>
        <p className="flex items-center gap-2 font-mono text-[7.5px] tracking-[2px] uppercase text-green-light/70 mb-2">
          <span className="block w-4 h-px bg-green-light/70" />
          {eyebrow}
        </p>
        <h2 className="font-serif text-[28px] font-light tracking-[-0.5px] text-ink">
          {title}{' '}
          {titleItalic && <em className="italic text-ink-2">{titleItalic}</em>}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className="font-mono text-[7.5px] tracking-[2px] uppercase text-ink-3 border border-border px-4 py-2 hover:border-green-light/40 hover:text-green-light transition-colors"
        >
          See all
        </Link>
      )}
    </div>
  );
}

/* ── PULSE BAR ──────────────────────────────────────── */
const PULSE_ITEMS = [
  { label: 'Live Now',   value: '40',   color: 'bg-green-light shadow-[0_0_7px_rgba(0,168,90,0.6)]' },
  { label: 'Accra',      value: '18',   color: 'bg-green-light shadow-[0_0_7px_rgba(0,168,90,0.6)]' },
  { label: 'Kumasi',     value: '8',    color: 'bg-green-light shadow-[0_0_7px_rgba(0,168,90,0.6)]' },
  { label: 'Cape Coast', value: '5',    color: 'bg-gold shadow-[0_0_7px_rgba(212,175,55,0.6)]' },
  { label: 'Tamale',     value: '4',    color: 'bg-green-light shadow-[0_0_7px_rgba(0,168,90,0.6)]' },
  { label: 'Updated',    value: 'Today', color: 'bg-red shadow-[0_0_7px_rgba(206,17,38,0.6)]' },
];

export default function HomePage() {
  return (
    <>
      <Nav transparent active="Discover" />

      {/* ── HERO ── */}
      <HeroSlider />

      {/* ── PULSE BAR ── */}
      <div className="flex items-center bg-bg2 border-b border-border overflow-x-auto no-scrollbar">
        {PULSE_ITEMS.map((item, i) => (
          <div
            key={item.label}
            className={`flex items-center gap-2 px-6 py-[11px] border-r border-border flex-shrink-0 ${i === PULSE_ITEMS.length - 1 ? 'ml-auto border-r-0' : ''}`}
          >
            <span className={`w-[6px] h-[6px] rounded-full flex-shrink-0 ${item.color}`} />
            <span className="font-mono text-[7.5px] tracking-[1.5px] uppercase text-ink-3 whitespace-nowrap">
              {item.label}
            </span>
            <span className="font-mono text-[9px] tracking-[1px] text-ink-2 font-medium">
              {item.value}
            </span>
          </div>
        ))}
      </div>

      <div className="max-w-[1440px] mx-auto px-6 md:px-11">

        {/* ── TRENDING HORIZONTAL SCROLL ── */}
        <SectionHead eyebrow="Right now" title="Trending" titleItalic="this month" href="/events" />
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
          {/* Tall hero card */}
          <Link
            href={`/events/${trending[0]?.slug}`}
            className="group relative flex-none w-[560px] h-[340px] rounded-card overflow-hidden border border-border"
          >
            <Image
              src={trending[0]?.image ?? ''}
              alt={trending[0]?.title ?? ''}
              fill sizes="560px"
              className="object-cover brightness-[0.48] saturate-[0.82] transition-transform duration-500 group-hover:scale-[1.06]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg/92 via-bg/25 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
              <span className="font-mono text-[7px] tracking-[1.5px] uppercase px-2.5 py-1 rounded-[3px] bg-green/65 text-[#a8ffce] border border-green-light/30 mb-2.5 inline-block">
                {trending[0]?.badge}
              </span>
              <h3 className="font-serif text-[28px] font-light text-white leading-[1.1] tracking-[-0.5px] mb-2">
                {trending[0]?.title}
              </h3>
              <p className="font-mono text-[9px] tracking-[0.5px] text-white/42">
                {trending[0]?.dateLabel} · {trending[0]?.venue}
              </p>
            </div>
          </Link>
          {/* Standard feature cards */}
          {trending.slice(1).map(ev => (
            <Link
              key={ev.id}
              href={`/events/${ev.slug}`}
              className="group relative flex-none w-[380px] h-[260px] rounded-card overflow-hidden border border-border"
            >
              <Image
                src={ev.image} alt={ev.title} fill sizes="380px"
                className="object-cover brightness-[0.48] saturate-[0.82] transition-transform duration-500 group-hover:scale-[1.06]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg/92 via-bg/25 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
                <span className="font-mono text-[7px] tracking-[1.5px] uppercase px-2.5 py-1 rounded-[3px] bg-green/65 text-[#a8ffce] border border-green-light/30 mb-2.5 inline-block">
                  {ev.badge}
                </span>
                <h3 className="font-serif text-xl font-light text-white leading-[1.15] mb-2">
                  {ev.title}
                </h3>
                <p className="font-mono text-[9px] tracking-[0.5px] text-white/42">
                  {ev.dateLabel} · {ev.venue} · {ev.price === 0 ? 'Free' : `₵${ev.price}`}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* ── THIS WEEKEND — POSTER ROW ── */}
        <SectionHead eyebrow="Don't miss out" title="This" titleItalic="Weekend" href="/events" />
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
          {weekend.map(ev => (
            <Link
              key={ev.id}
              href={`/events/${ev.slug}`}
              className="group relative flex-none w-[168px] rounded-card-sm border border-border overflow-hidden hover:-translate-y-1 hover:shadow-card-soft transition-all duration-300"
            >
              <div className="relative h-[250px] overflow-hidden">
                <Image
                  src={ev.image} alt={ev.title} fill sizes="168px"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg/85 to-transparent" />
                <div className="absolute bottom-[76px] left-2.5 right-2.5 text-center bg-bg/88 border border-green-light/45 font-mono text-[7.5px] tracking-[2px] uppercase text-green-light py-2 opacity-0 translate-y-1.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 backdrop-blur-sm">
                  Get tickets
                </div>
              </div>
              <div className="p-3 pb-3.5">
                <p className="font-serif text-[15px] text-ink leading-[1.2] mb-1">{ev.title}</p>
                <p className="font-mono text-[8px] tracking-[0.5px] text-ink-3 mb-1">{ev.dateLabel} · {ev.city}</p>
                <p className="font-mono text-[12px] text-green-light font-medium">
                  {ev.price === 0 ? 'Free' : `₵${ev.price}`}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* ── HIERARCHICAL FEATURED GRID ── */}
        <SectionHead eyebrow="Curated picks" title="Featured" titleItalic="Events" href="/events" />
        <div className="grid grid-cols-12 gap-3">
          {/* Big left — spans 7 cols × 2 rows */}
          <div className="col-span-12 md:col-span-7 md:row-span-2 min-h-[460px]">
            <EventCard event={featured[0]} size="feature" className="h-full" />
          </div>
          {/* Two stacked standards */}
          <div className="col-span-12 md:col-span-5">
            <EventCard event={featured[1]} size="standard" />
          </div>
          <div className="col-span-12 md:col-span-5">
            <EventCard event={featured[2]} size="standard" />
          </div>
          {/* 4 minis */}
          {featured.slice(3, 7).map(ev => (
            <div key={ev.id} className="col-span-6 md:col-span-3">
              <EventCard event={ev} size="mini" />
            </div>
          ))}
        </div>

        {/* ── MOMENTS ── */}
        <SectionHead eyebrow="From the crowd" title="" titleItalic="Moments" href="#" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
          {momentImgs.map((m, i) => (
            <div
              key={i}
              className={`group relative rounded-card-sm overflow-hidden border border-border cursor-pointer hover:scale-[1.02] hover:border-white/14 transition-all duration-300 ${i === 0 ? 'md:row-span-2 aspect-auto' : 'aspect-[9/16]'}`}
              style={i === 0 ? { minHeight: '340px' } : {}}
            >
              <Image
                src={m.src} alt={m.label} fill sizes="300px"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg/85 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3.5">
                <p className="font-mono text-[7.5px] tracking-[1.5px] uppercase text-green-light mb-1">{m.date}</p>
                <p className="font-serif text-[14px] text-white/85 leading-[1.2]">{m.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── CITIES ── */}
        <SectionHead eyebrow="Explore Ghana" title="Events by" titleItalic="City" href="/events" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {cities.map(city => (
            <CityCard key={city.slug} city={city} />
          ))}
        </div>

        {/* ── ORGANIZER CTA ── */}
        <div className="mt-16 rounded-card-lg overflow-hidden border border-border bg-bg2 grid md:grid-cols-2">
          <div className="p-12 md:p-14 border-b md:border-b-0 md:border-r border-border">
            <p className="flex items-center gap-2 font-mono text-[7.5px] tracking-[2.5px] uppercase text-green-light/75 mb-5">
              <span className="block w-4 h-px bg-green-light/75" /> For organizers
            </p>
            <h2 className="font-serif text-[clamp(32px,3vw,48px)] font-light tracking-[-2px] leading-[0.92] mb-4">
              Sell tickets<br />
              <em className="italic">the smart way</em>
            </h2>
            <p className="font-sans text-sm text-ink-2 leading-[1.7] font-light max-w-[360px] mb-8">
              Create your event in minutes. Set ticket tiers, track sales in real time, and get paid via MoMo, Vodafone Cash, or bank transfer.
            </p>
            <Link
              href="#"
              className="inline-flex items-center gap-3 bg-green text-white font-mono text-[8px] tracking-[2px] uppercase px-7 py-[14px] rounded-[6px] hover:bg-green-light transition-colors"
            >
              Start selling tickets <ArrowRight size={13} />
            </Link>
          </div>
          <div className="grid grid-rows-2">
            {[
              { num: '180k', label: 'Tickets sold this year' },
              { num: '2,400+', label: 'Events listed in 2025' },
            ].map((stat, i) => (
              <div
                key={i}
                className={`flex flex-col justify-center px-11 py-9 ${i === 0 ? 'border-b border-border' : ''}`}
              >
                <p className="font-serif text-[54px] font-light tracking-[-3px] leading-[1] mb-1.5">{stat.num}</p>
                <p className="font-mono text-[8px] tracking-[2px] uppercase text-ink-3">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── PAYMENT STRIP ── */}
        <div className="mt-16 mb-4 p-11 md:p-12 rounded-card-lg border border-border bg-bg2 flex flex-wrap items-center justify-between gap-8 relative overflow-hidden">
          <div className="absolute top-[-80px] right-[-80px] w-[280px] h-[280px] rounded-full bg-radial-green pointer-events-none"
               style={{ background: 'radial-gradient(circle, rgba(0,107,63,0.1) 0%, transparent 70%)' }} />
          <div>
            <h3 className="font-serif text-[34px] font-light tracking-[-1.5px] mb-2">
              Pay the way <span className="text-green-light">Ghana</span> pays
            </h3>
            <p className="font-sans text-sm text-ink-2 leading-[1.65] font-light max-w-[380px]">
              Instant QR tickets. No app needed. Pay with MoMo, Vodafone Cash, AirtelTigo or card.
            </p>
            <div className="flex gap-2 flex-wrap mt-5">
              {['MTN MoMo', 'Vodafone Cash', 'AirtelTigo', 'Paystack', 'Visa / Mastercard'].map((p, i) => (
                <span
                  key={p}
                  className={`font-mono text-[8px] tracking-[1px] uppercase px-3.5 py-1.5 rounded-[6px] border ${i < 3 ? 'border-gold/35 text-gold bg-gold/7' : 'border-border text-ink-3 bg-bg3'}`}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
          <Link
            href="#"
            className="inline-flex items-center gap-3 bg-green text-white font-mono text-[8px] tracking-[2px] uppercase px-8 py-[15px] rounded-[6px] hover:bg-green-light transition-colors flex-shrink-0"
          >
            Start selling <ArrowRight size={13} />
          </Link>
        </div>

      </div>
      <Footer />
    </>
  );
}
