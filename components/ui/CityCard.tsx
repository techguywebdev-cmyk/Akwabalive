import Image from 'next/image';
import Link from 'next/link';
import type { CityInfo } from '@/lib/types';

export default function CityCard({ city }: { city: CityInfo }) {
  return (
    <Link
      href={`/events?city=${city.slug}`}
      className="group relative block overflow-hidden transition-all duration-300 hover:-translate-y-1"
      style={{ borderRadius: 12, border: '1px solid rgba(245,236,215,0.07)', textDecoration: 'none' }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(200,146,42,0.3)';
        e.currentTarget.style.boxShadow   = '0 16px 40px rgba(0,0,0,0.45)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(245,236,215,0.07)';
        e.currentTarget.style.boxShadow   = 'none';
      }}
    >
      <div className="relative overflow-hidden" style={{ height: 200 }}>
        <Image
          src={city.image} alt={city.name} fill
          sizes="(max-width:640px) 50vw, 240px"
          className="object-cover transition-all duration-500 group-hover:scale-[1.07]"
          style={{ filter: 'brightness(0.48) saturate(0.7)' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0D0B08 0%, transparent 100%)' }} />
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div
          className="transition-colors duration-200 group-hover:text-[#C8922A]"
          style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 22, fontWeight: 400, color: '#F5ECD7', letterSpacing: '-0.3px' }}
        >
          {city.name}
        </div>
        <div style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(245,236,215,0.28)', marginTop: 3 }}>
          {city.count} events
        </div>
      </div>
    </Link>
  );
}
