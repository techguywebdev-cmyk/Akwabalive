import Image from 'next/image';
import Link from 'next/link';
import type { CityInfo } from '@/lib/types';
import { C, G, R } from '@/lib/theme';

/** City tile — photo with a frosted glass label. Flat: no shadows. */
export default function CityCard({ city }: { city: CityInfo }) {
  return (
    <Link
      href={`/events?city=${city.slug}`}
      className="group relative block overflow-hidden transition-[transform,border-color] duration-300 hover:-translate-y-1"
      style={{ borderRadius: R.card, border: `1px solid ${C.bd}`, textDecoration: 'none', height: 200, background: C.bg3 }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.goldBd; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.bd; }}
    >
      <Image
        src={city.image} alt={city.name} fill
        sizes="(max-width:640px) 50vw, 240px"
        className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
      />
      <div
        className="absolute"
        style={{ left: 10, right: 10, bottom: 10, ...G.panel, border: `1px solid ${C.bd2}`, borderRadius: R.card - 6, padding: '10px 14px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}
      >
        <span
          className="transition-colors duration-200 group-hover:text-[#E0B25A]"
          style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 22, fontWeight: 500, color: C.cream }}
        >
          {city.name}
        </span>
        <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.c2, whiteSpace: 'nowrap' }}>
          {city.count} events
        </span>
      </div>
    </Link>
  );
}
