'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, MapPin, SlidersHorizontal, Grid2X2, List, X } from 'lucide-react';
import clsx from 'clsx';
import type { GhanaEvent, FilterState, City, Category } from '@/lib/types';
import { filterEvents, haversine, formatDistance, formatPrice, cityLabel } from '@/lib/utils';
import EventCard from '@/components/ui/EventCard';

const CITIES: { value: City | 'all'; label: string; count?: number }[] = [
  { value: 'all', label: 'All Ghana' },
  { value: 'accra', label: 'Accra' },
  { value: 'kumasi', label: 'Kumasi' },
  { value: 'cape-coast', label: 'Cape Coast' },
  { value: 'tamale', label: 'Tamale' },
  { value: 'takoradi', label: 'Takoradi' },
  { value: 'ho', label: 'Ho' },
];

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'festival', label: 'Festival' },
  { value: 'concert', label: 'Concert' },
  { value: 'food', label: 'Food & Drink' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'culture', label: 'Culture' },
  { value: 'sports', label: 'Sports' },
  { value: 'tech', label: 'Tech' },
  { value: 'art', label: 'Art' },
];

const PAGE_SIZE = 12;
const BATCH = 8;

const DEFAULT_FILTERS: FilterState = {
  city: 'all',
  category: null,
  priceFilter: null,
  freeOnly: false,
  maxPrice: 500,
  search: '',
  sort: 'upcoming',
};

export default function EventsClient({ events }: { events: GhanaEvent[] }) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(PAGE_SIZE);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<'idle' | 'detecting' | 'found' | 'error'>('idle');
  const [radius, setRadius] = useState(25);
  const [nearbyDismissed, setNearbyDismissed] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const setFilter = useCallback(<K extends keyof FilterState>(key: K, val: FilterState[K]) => {
    setFilters(f => ({ ...f, [key]: val }));
    setPage(PAGE_SIZE);
  }, []);

  const clearAll = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPage(PAGE_SIZE);
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocStatus('found');
      },
      () => setLocStatus('error'),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }, []);

  const filtered = useMemo(
    () => filterEvents(events, filters, userLoc, radius),
    [events, filters, userLoc, radius]
  );

  const nearby = useMemo(() => {
    if (!userLoc) return [];
    return events
      .map(e => ({ event: e, dist: haversine(userLoc.lat, userLoc.lng, e.lat, e.lng) }))
      .filter(x => x.dist <= radius)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 6);
  }, [events, userLoc, radius]);

  const visible = filtered.slice(0, page);
  const hasMore = page < filtered.length;

  const activeFilterCount = [
    filters.city !== 'all',
    !!filters.category,
    !!filters.priceFilter,
    filters.freeOnly,
    filters.maxPrice < 500,
    !!filters.search,
  ].filter(Boolean).length;

  return (
    <div className="bg-bg min-h-screen">

      {/* ── FILTER BAR ── */}
      <div className="sticky top-[62px] z-[90] bg-bg/97 backdrop-blur-xl border-b border-border">
        {/* Search row */}
        <div className="flex items-center gap-2 px-6 md:px-10 py-2.5 border-b border-border">
          <div className="flex-1 flex items-center gap-2.5 border border-border bg-bg2 px-4 py-2.5 focus-within:border-green-light/30 transition-colors">
            <Search size={13} className="text-ink-3 flex-shrink-0" />
            <input
              type="search"
              placeholder="Search events, artists, venues…"
              value={filters.search}
              onChange={e => setFilter('search', e.target.value)}
              className="flex-1 bg-transparent border-none outline-none font-sans text-[13px] text-ink placeholder:text-ink-3"
            />
          </div>
          <div className="flex gap-1.5">
            {(['upcoming', 'popular'] as const).map(sort => (
              <button
                key={sort}
                onClick={() => setFilter('sort', sort)}
                className={clsx(
                  'font-mono text-[7.5px] tracking-[1.5px] uppercase px-4 h-10 border transition-colors',
                  filters.sort === sort
                    ? 'border-green-light/40 text-green-light bg-green-light/7'
                    : 'border-border text-ink-3 hover:border-white/18 hover:text-ink-2'
                )}
              >
                {sort}
              </button>
            ))}
            <button
              onClick={() => {
                if (filters.sort === 'nearby' && userLoc) {
                  setFilter('sort', 'upcoming');
                } else {
                  requestLocation();
                  setFilter('sort', 'nearby');
                }
              }}
              className={clsx(
                'font-mono text-[7.5px] tracking-[1.5px] uppercase px-4 h-10 border transition-colors flex items-center gap-1.5',
                filters.sort === 'nearby'
                  ? 'border-green-light/40 text-green-light bg-green-light/7'
                  : 'border-border text-ink-3 hover:border-white/18 hover:text-ink-2'
              )}
            >
              <MapPin size={11} /> Near Me
            </button>
            <button
              onClick={() => setFilter('freeOnly', !filters.freeOnly)}
              className={clsx(
                'font-mono text-[7.5px] tracking-[1.5px] uppercase px-4 h-10 border transition-colors',
                filters.freeOnly
                  ? 'border-green-light/40 text-green-light bg-green-light/7'
                  : 'border-border text-ink-3 hover:border-white/18 hover:text-ink-2'
              )}
            >
              Free Only
            </button>
          </div>
        </div>
        {/* Pills row */}
        <div className="flex items-center gap-4 px-6 md:px-10 py-2.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="font-mono text-[7px] tracking-[2px] uppercase text-ink-3">City</span>
            <div className="flex gap-1">
              {CITIES.map(c => (
                <button
                  key={c.value}
                  onClick={() => setFilter('city', c.value)}
                  className={clsx(
                    'font-mono text-[7px] tracking-[1.5px] uppercase px-3.5 py-1.5 rounded-full border transition-all whitespace-nowrap',
                    filters.city === c.value
                      ? 'border-green-light/50 text-green-light bg-green-light/10'
                      : 'border-transparent text-ink-3 hover:border-white/14 hover:text-ink-2'
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="font-mono text-[7px] tracking-[2px] uppercase text-ink-3">Category</span>
            <div className="flex gap-1">
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  onClick={() => setFilter('category', filters.category === c.value ? null : c.value)}
                  className={clsx(
                    'font-mono text-[7px] tracking-[1.5px] uppercase px-3.5 py-1.5 rounded-full border transition-all whitespace-nowrap',
                    filters.category === c.value
                      ? 'border-green-light/50 text-green-light bg-green-light/10'
                      : 'border-transparent text-ink-3 hover:border-white/14 hover:text-ink-2'
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={clearAll}
              className="ml-auto flex-shrink-0 flex items-center gap-1.5 font-mono text-[7px] tracking-[2px] uppercase text-red/50 border border-red/15 px-2.5 py-1.5 hover:border-red/40 hover:text-red transition-colors"
            >
              <X size={9} /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* ── PAGE BODY ── */}
      <div className="flex">

        {/* ── SIDEBAR ── */}
        <aside className="hidden lg:block w-[248px] flex-shrink-0 sticky top-[calc(62px+96px)] self-start max-h-[calc(100vh-160px)] overflow-y-auto border-r border-border p-6">
          {/* By City */}
          <div className="mb-6">
            <p className="font-mono text-[7px] tracking-[2.5px] uppercase text-ink-3 mb-2.5 pb-2 border-b border-border">By City</p>
            {CITIES.map(c => {
              const count = c.value === 'all' ? events.length : events.filter(e => e.city === c.value).length;
              return (
                <button
                  key={c.value}
                  onClick={() => setFilter('city', c.value)}
                  className={clsx(
                    'w-full flex items-center justify-between px-2 py-1.5 cursor-pointer transition-colors hover:bg-white/[0.03] text-left',
                    filters.city === c.value && 'bg-green-light/6'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={clsx('w-[5px] h-[5px] rounded-full flex-shrink-0', filters.city === c.value ? 'bg-green-light' : 'bg-border')} />
                    <span className={clsx('font-sans text-[11px]', filters.city === c.value ? 'text-ink' : 'text-ink-2')}>{c.label}</span>
                  </div>
                  <span className={clsx('font-mono text-[9px]', filters.city === c.value ? 'text-green-light' : 'text-ink-3')}>{count}</span>
                </button>
              );
            })}
          </div>
          {/* By Category */}
          <div className="mb-6">
            <p className="font-mono text-[7px] tracking-[2.5px] uppercase text-ink-3 mb-2.5 pb-2 border-b border-border">By Category</p>
            {CATEGORIES.map(c => {
              const count = events.filter(e => e.category === c.value).length;
              return (
                <button
                  key={c.value}
                  onClick={() => setFilter('category', filters.category === c.value ? null : c.value)}
                  className={clsx(
                    'w-full flex items-center justify-between px-2 py-1.5 cursor-pointer transition-colors hover:bg-white/[0.03] text-left',
                    filters.category === c.value && 'bg-green-light/6'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={clsx('w-[5px] h-[5px] rounded-full flex-shrink-0', filters.category === c.value ? 'bg-green-light' : 'bg-border')} />
                    <span className={clsx('font-sans text-[11px]', filters.category === c.value ? 'text-ink' : 'text-ink-2')}>{c.label}</span>
                  </div>
                  <span className={clsx('font-mono text-[9px]', filters.category === c.value ? 'text-green-light' : 'text-ink-3')}>{count}</span>
                </button>
              );
            })}
          </div>
          {/* Max Price */}
          <div className="mb-6">
            <p className="font-mono text-[7px] tracking-[2.5px] uppercase text-ink-3 mb-2.5 pb-2 border-b border-border">Max Price</p>
            <input
              type="range" min={0} max={500} step={25}
              value={filters.maxPrice}
              onChange={e => setFilter('maxPrice', Number(e.target.value))}
              className="w-full accent-green-light"
            />
            <p className="font-mono text-[7.5px] tracking-[1px] text-ink-3 mt-1.5">
              {filters.maxPrice >= 500 ? 'Up to ₵500+' : `Up to ₵${filters.maxPrice}`}
            </p>
          </div>
          {/* Visitor tips */}
          <div className="bg-green/8 border border-green-light/12 rounded-lg p-3.5">
            <p className="font-mono text-[7.5px] tracking-[1.5px] uppercase text-green-light/75 mb-2.5">Traveller Tips</p>
            <ul className="space-y-2 font-sans text-[11px] text-ink-3 leading-[1.6]">
              <li>Pay with MTN, Vodafone or AirtelTigo MoMo at most venues.</li>
              <li>Dress codes are common at nightlife events — check each listing.</li>
              <li>Book 48 hrs ahead for major festivals to guarantee entry.</li>
              <li>Bolt and taxis are widely available in Accra & Kumasi.</li>
            </ul>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="flex-1 min-w-0 pb-20" ref={gridRef}>

          {/* Location banner */}
          <div className={clsx(
            'flex items-center justify-between gap-4 px-6 min-h-[52px]',
            locStatus === 'found' ? 'bg-green/8 border-b border-green-light/12' : 'bg-bg2 border-b border-border'
          )}>
            <div className="flex items-center gap-3.5">
              <span className={clsx(
                'w-[7px] h-[7px] rounded-full flex-shrink-0 transition-all',
                locStatus === 'found' ? 'bg-green-light shadow-[0_0_10px_rgba(0,168,90,0.5)] animate-pulse' :
                locStatus === 'error' ? 'bg-red/50' : 'bg-green/50'
              )} />
              <p className={clsx(
                'font-mono text-[8px] tracking-[2px] uppercase',
                locStatus === 'found' ? 'text-green-light' : locStatus === 'error' ? 'text-red/60' : 'text-white/55'
              )}>
                {locStatus === 'found' ? 'Location detected'
                  : locStatus === 'detecting' ? 'Detecting location…'
                  : locStatus === 'error' ? 'Location unavailable'
                  : 'Find events near you'}
              </p>
              {locStatus === 'found' && (
                <div className="flex items-center gap-2">
                  <label className="font-mono text-[7px] tracking-[2px] uppercase text-white/20">Within</label>
                  <select
                    value={radius}
                    onChange={e => setRadius(Number(e.target.value))}
                    className="bg-transparent border border-white/10 text-white/50 font-mono text-[8px] px-2 py-1 outline-none focus:border-green-light/40"
                  >
                    {[5, 10, 25, 50, 100].map(r => (
                      <option key={r} value={r}>{r} km</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {locStatus !== 'found' && (
              <button
                onClick={requestLocation}
                className="font-mono text-[7.5px] tracking-[2px] uppercase text-green-light border border-green-light/35 px-[18px] py-2 rounded-[6px] hover:border-green-light hover:bg-green-light/10 transition-colors whitespace-nowrap"
              >
                Use My Location
              </button>
            )}
          </div>

          {/* Nearby section */}
          {locStatus === 'found' && nearby.length > 0 && !nearbyDismissed && (
            <div className="border-t-2 border-green-light/20 bg-gradient-to-b from-green/7 to-transparent px-6 py-6 mb-0">
              <div className="flex items-center gap-2.5 mb-4 flex-wrap">
                <span className="w-2 h-2 rounded-full bg-green-light shadow-[0_0_10px_rgba(0,168,90,0.7)] animate-pulse" />
                <span className="font-mono text-[9px] tracking-[2.5px] uppercase text-green-light">
                  {nearby.length} Events Near You
                </span>
                <span className="font-sans text-[11px] text-ink-3">within {radius}km</span>
                <button
                  onClick={() => setNearbyDismissed(true)}
                  className="ml-auto font-mono text-[7px] tracking-[2px] uppercase text-white/20 border border-white/8 px-2.5 py-1.5 hover:border-red/30 hover:text-red/60 transition-colors flex items-center gap-1.5"
                >
                  <X size={9} /> Hide
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {nearby.map(({ event, dist }) => (
                  <EventCard key={event.id} event={event} size="standard" distanceKm={dist} />
                ))}
              </div>
            </div>
          )}

          {/* Section header + view toggle */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-wrap gap-2.5">
            <span className="font-serif text-[18px] font-light tracking-[-0.2px] text-ink-2">
              {filters.city === 'all' ? 'All Events in Ghana' : `Events in ${cityLabel(filters.city)}`}
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[9px] tracking-[1px] text-ink-3">
                <strong className="text-ink-2">{visible.length}</strong> / <strong className="text-ink-2">{filtered.length}</strong>
              </span>
              <div className="flex gap-0.5">
                {(['grid', 'list'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={clsx(
                      'w-[30px] h-7 flex items-center justify-center border transition-all',
                      viewMode === mode
                        ? 'border-green-light/40 text-green-light bg-green-light/6'
                        : 'border-border text-ink-3'
                    )}
                  >
                    {mode === 'grid' ? <Grid2X2 size={11} /> : <List size={11} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Event grid */}
          <div className={clsx(
            'p-4',
            viewMode === 'grid' ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-0'
          )}>
            {visible.length === 0 ? (
              <div className="col-span-2 flex flex-col items-center py-20 gap-3.5 text-center">
                <Search size={40} className="text-white/10" />
                <p className="font-serif text-[24px] text-white/20">No events found</p>
                <p className="font-sans text-[12px] text-ink-3">Try adjusting your filters or search terms</p>
                <button
                  onClick={clearAll}
                  className="mt-2 font-mono text-[8px] tracking-[2px] uppercase text-green-light border border-green-light/35 px-5 py-2.5 hover:bg-green-light/8 transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              visible.map(ev => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  size="standard"
                  distanceKm={userLoc ? haversine(userLoc.lat, userLoc.lng, ev.lat, ev.lng) : undefined}
                />
              ))
            ) : (
              visible.map(ev => (
                <Link
                  key={ev.id}
                  href={`/events/${ev.slug}`}
                  className="group flex border-b border-border hover:bg-white/[0.02] transition-colors"
                >
                  <div className="relative w-[200px] h-[150px] flex-shrink-0 overflow-hidden">
                    <Image
                      src={ev.image} alt={ev.title} fill sizes="200px"
                      className="object-cover brightness-75 group-hover:scale-[1.04] transition-transform duration-500"
                    />
                  </div>
                  <div className="flex-1 p-4 flex flex-col">
                    <p className="font-mono text-[7px] tracking-[1.5px] uppercase text-ink-3 mb-1.5">{ev.badge}</p>
                    <h3 className="font-serif text-[18px] font-light text-ink group-hover:text-white transition-colors mb-2">{ev.title}</h3>
                    <p className="font-sans text-[10px] text-ink-3 mb-auto">{ev.dateLabel} · {ev.venue}</p>
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] mt-2">
                      <span className="font-mono text-[14px] text-ink">{formatPrice(ev.price)}</span>
                      <span className="font-mono text-[7.5px] tracking-[2px] uppercase bg-green text-white px-3.5 py-2 rounded-[5px]">
                        Get Tickets
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="flex flex-col items-center gap-3 px-6 pt-4 pb-8">
              <div className="w-full h-px bg-border" />
              <button
                onClick={() => setPage(p => p + BATCH)}
                className="flex items-center gap-2 font-mono text-[8.5px] tracking-[2.5px] uppercase text-ink-3 border border-border px-9 py-3.5 rounded-[6px] hover:border-green-light/40 hover:text-green-light transition-all"
              >
                Load more ({filtered.length - page} remaining)
              </button>
              <p className="font-mono text-[8px] tracking-[1.5px] uppercase text-ink-3">
                Showing {visible.length} of {filtered.length} events
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
