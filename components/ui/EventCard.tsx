'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Calendar, Clock } from 'lucide-react';
import clsx from 'clsx';
import type { GhanaEvent } from '@/lib/types';
import { formatPrice, cityLabel, formatDistance } from '@/lib/utils';

type Size = 'feature' | 'standard' | 'mini';

export default function EventCard({
  event,
  size = 'standard',
  distanceKm,
  className,
}: {
  event: GhanaEvent;
  size?: Size;
  distanceKm?: number;
  className?: string;
}) {
  const isOverlay = size === 'feature';

  return (
    <Link
      href={`/events/${event.slug}`}
      className={clsx(
        'group relative block overflow-hidden rounded-card border border-border bg-bg2',
        'transition-all duration-300 ease-out hover:-translate-y-1 hover:border-green-light/30 hover:shadow-card',
        size === 'feature' && 'h-full min-h-[420px]',
        className
      )}
    >
      {event.hot && (
        <span className="absolute top-0 left-0 right-0 h-[2px] z-[6] bg-gradient-to-r from-green-light to-green-light/20" />
      )}

      <div
        className={clsx(
          'relative overflow-hidden bg-bg3',
          isOverlay ? 'absolute inset-0 h-full' : size === 'mini' ? 'h-[140px]' : 'h-[200px]'
        )}
      >
        <Image
          src={event.image}
          alt={event.title}
          fill
          sizes="(max-width: 768px) 50vw, 400px"
          className="object-cover brightness-[0.78] saturate-[0.85] transition-transform duration-700 ease-out group-hover:scale-[1.07] group-hover:brightness-[0.4]"
        />
        <div
          className={clsx(
            'absolute inset-0 pointer-events-none',
            isOverlay
              ? 'bg-gradient-to-t from-bg via-bg/20 to-transparent'
              : 'bg-gradient-to-t from-bg/95 via-bg/15 to-transparent'
          )}
        />
        <div className="absolute top-3 left-3 right-3 z-[4] flex gap-1.5 flex-wrap">
          <span className="font-mono text-[7px] font-medium tracking-[1.5px] uppercase px-2.5 py-1 rounded-[3px] bg-green/65 text-[#a8ffce] border border-green-light/30">
            {event.badge}
          </span>
          {distanceKm !== undefined && (
            <span className="font-mono text-[7px] tracking-[1px] uppercase px-2.5 py-1 rounded-[3px] bg-green-light/15 border border-green-light/35 text-[#6dffb3]">
              {formatDistance(distanceKm)} away
            </span>
          )}
        </div>
      </div>

      <div
        className={clsx(
          isOverlay ? 'absolute bottom-0 left-0 right-0 z-[2] p-5' : 'p-4'
        )}
      >
        {!isOverlay && (
          <div className="flex items-center gap-1.5 mt-1 mb-1.5 font-sans text-[10px] text-ink-3">
            <MapPin size={9} className="opacity-50 flex-shrink-0" />
            <span className="text-ink-2 font-medium">{cityLabel(event.city)}</span>
            <span className="text-ink-4 truncate"> · {event.venue}</span>
          </div>
        )}

        <h3
          className={clsx(
            'font-serif font-medium leading-[1.18] text-white/90 transition-colors group-hover:text-white',
            size === 'feature' ? 'text-[26px] tracking-[-0.5px] mb-2' : size === 'mini' ? 'text-[14px] mb-1.5' : 'text-[19px] tracking-[-0.2px] mb-2'
          )}
        >
          {event.title}
        </h3>

        {size !== 'mini' && (
          <div className="flex gap-3 flex-wrap font-sans text-[9.5px] text-ink-3 mb-3.5">
            <span className="flex items-center gap-1">
              <Calendar size={10} /> {event.dateLabel}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={10} /> {event.time}
            </span>
            {isOverlay && (
              <span className="flex items-center gap-1">
                <MapPin size={10} /> {event.venue}
              </span>
            )}
          </div>
        )}

        <div
          className={clsx(
            'flex items-center gap-2.5',
            size !== 'mini' && 'pt-3 border-t border-white/[0.06]'
          )}
        >
          {event.price === 0 ? (
            <span className="font-sans text-[10px] font-bold tracking-[2.5px] uppercase text-[#00e87a] flex-1">
              Free
            </span>
          ) : (
            <span className="font-mono text-[15px] font-medium tracking-[-0.5px] flex-1">
              <span className="text-[10px] text-green-light mr-px">₵</span>
              {event.price}
            </span>
          )}
          {size !== 'mini' && (
            <span className="font-mono text-[7.5px] tracking-[2px] uppercase bg-green text-white px-4 py-2 rounded-[6px] flex-shrink-0 transition-colors group-hover:bg-green-light">
              Get Tickets
            </span>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-green-light to-green-light/15 origin-left scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100 z-[5]" />
    </Link>
  );
}
