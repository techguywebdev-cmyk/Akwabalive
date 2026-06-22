import Image from 'next/image';
import Link from 'next/link';
import type { CityInfo } from '@/lib/types';

export default function CityCard({ city }: { city: CityInfo }) {
  return (
    <Link
      href={`/events?city=${city.slug}`}
      className="group relative block overflow-hidden rounded-card-sm border border-border transition-all duration-300 hover:-translate-y-1 hover:shadow-card-soft"
    >
      <div className="relative h-[200px] bg-bg3">
        <Image
          src={city.image}
          alt={city.name}
          fill
          sizes="(max-width: 768px) 50vw, 240px"
          className="object-cover brightness-50 saturate-[0.7] transition-all duration-500 group-hover:scale-[1.07] group-hover:brightness-[0.28]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="font-serif text-xl text-white tracking-[-0.3px] transition-colors group-hover:text-green-light">
          {city.name}
        </div>
        <div className="font-mono text-[7.5px] tracking-[2px] uppercase text-white/30 mt-0.5">
          {city.count} events
        </div>
      </div>
    </Link>
  );
}
