'use client';
import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Search, MapPin, X, Grid2X2, List, Filter, Calendar, Clock } from 'lucide-react';
import type { GhanaEvent, FilterState, City, Category } from '@/lib/types';
import { filterEvents, haversine, formatDistance, cityLabel } from '@/lib/utils';

const C = {
  bg: '#0D0B08', bg2: '#141109', bg3: '#1C1710',
  gold: '#C8922A', goldDim: 'rgba(200,146,42,0.14)', goldBd: 'rgba(200,146,42,0.28)',
  cream: '#F5ECD7', c2: 'rgba(245,236,215,0.55)', c3: 'rgba(245,236,215,0.24)',
  c4: 'rgba(245,236,215,0.08)', bd: 'rgba(245,236,215,0.07)', bd2: 'rgba(245,236,215,0.13)',
  red: '#CE1126', green: '#2D6A4F',
};

const CITIES: { value: City | 'all'; label: string }[] = [
  { value: 'all',        label: 'All Ghana'  },
  { value: 'accra',      label: 'Accra'      },
  { value: 'kumasi',     label: 'Kumasi'     },
  { value: 'cape-coast', label: 'Cape Coast' },
  { value: 'tamale',     label: 'Tamale'     },
  { value: 'takoradi',   label: 'Takoradi'   },
  { value: 'ho',         label: 'Ho'         },
];

const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'festival',  label: 'Festival',     emoji: '🎪' },
  { value: 'concert',   label: 'Concert',      emoji: '🎵' },
  { value: 'food',      label: 'Food & Drink', emoji: '🍲' },
  { value: 'nightlife', label: 'Nightlife',    emoji: '🌙' },
  { value: 'culture',   label: 'Culture',      emoji: '🎭' },
  { value: 'sports',    label: 'Sports',       emoji: '⚽' },
  { value: 'tech',      label: 'Tech',         emoji: '💻' },
  { value: 'art',       label: 'Art',          emoji: '🎨' },
];

const PRICE_OPTS = [
  { value: 'free', label: 'Free'       },
  { value: 'u50',  label: 'Under ₵50'  },
  { value: 'u200', label: 'Under ₵200' },
  { value: 'o200', label: '₵200+'      },
] as const;

const PAGE_SIZE = 12;
const BATCH     = 8;

const DEFAULT: FilterState = {
  city: 'all', category: null, priceFilter: null,
  freeOnly: false, maxPrice: 500, search: '', sort: 'upcoming',
};

function Pill({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} style={{
      fontFamily: 'var(--font-dm-mono,monospace)',
      fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase',
      padding: '6px 14px', borderRadius: 999,
      border: `1px solid ${active ? C.goldBd : C.bd}`,
      background: active ? C.goldDim : 'transparent',
      color: active ? C.gold : C.c3,
      cursor: 'pointer', whiteSpace: 'nowrap',
      transition: 'all 180ms', flexShrink: 0,
    }}>
      {children}
    </button>
  );
}

function BottomSheet({ open, onClose, children }: {
  open: boolean; onClose: () => void; children: React.ReactNode;
}) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {open && (
        <div onClick={onClose} style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(13,11,8,0.85)', backdropFilter: 'blur(6px)',
        }} />
      )}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 401,
        background: C.bg2, borderTop: `1px solid ${C.bd2}`,
        borderRadius: '20px 20px 0 0', maxHeight: '88vh', overflowY: 'auto',
        transform: open ? 'translateY(0)' : 'translateY(110%)',
        transition: 'transform 340ms cubic-bezier(.22,1,.36,1)',
        paddingBottom: 40,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 6px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: C.bd2 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px', borderBottom: `1px solid ${C.bd}` }}>
          <span style={{ fontFamily: 'var(--font-syne,sans-serif)', fontSize: 18, fontWeight: 700, color: C.cream }}>Filter Events</span>
          <button onClick={onClose} style={{ color: C.c3, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

function SheetSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '20px 20px 0' }}>
      <p style={{
        fontFamily: 'var(--font-dm-mono,monospace)',
        fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase',
        color: C.gold, opacity: 0.7, marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ display: 'block', width: 14, height: 1, background: C.gold }} />{title}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{children}</div>
    </div>
  );
}

function EventCard({ event, distanceKm, listMode = false }: {
  event: GhanaEvent; distanceKm?: number; listMode?: boolean;
}) {
  if (listMode) {
    return (
      <Link href={`/events/${event.slug}`} style={{
        display: 'flex', borderBottom: `1px solid ${C.bd}`, textDecoration: 'none',
      }}>
        <div style={{
          width: 160, height: 130, flexShrink: 0, overflow: 'hidden',
          backgroundImage: `url(${event.image})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'brightness(0.75)',
        }} />
        <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.c3, marginBottom: 5 }}>{event.badge}</p>
          <h3 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 17, fontWeight: 400, color: C.cream, lineHeight: 1.2, marginBottom: 5 }}>{event.title}</h3>
          <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3, marginBottom: 'auto' }}>{event.dateLabel} · {event.venue}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, marginTop: 8, borderTop: `1px solid ${C.bd}` }}>
            <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 14, color: C.cream }}>
              {event.price === 0
                ? <span style={{ color: '#4ade80', fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>Free</span>
                : `₵${event.price}`}
            </span>
            <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '2px', textTransform: 'uppercase', background: C.gold, color: '#000', padding: '7px 13px', borderRadius: 5, fontWeight: 600 }}>
              Tickets
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/events/${event.slug}`} style={{
      display: 'block', position: 'relative', overflow: 'hidden',
      borderRadius: 14, border: `1px solid ${C.bd}`,
      background: C.bg2, textDecoration: 'none',
      transition: 'transform 300ms ease, border-color 300ms',
    }}>
      {event.hot && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right,${C.gold},rgba(200,146,42,0.1))`, zIndex: 6 }} />
      )}
      <div style={{ position: 'relative', width: '100%', paddingTop: '58%', overflow: 'hidden', background: C.bg3 }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${event.image})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'brightness(0.78) saturate(0.85)',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top,${C.bg2} 0%,rgba(13,11,8,0.2) 55%,transparent 100%)` }} />
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 4, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '4px 9px', borderRadius: 3, background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBd}` }}>
            {event.badge}
          </span>
          {distanceKm !== undefined && (
            <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 9px', borderRadius: 3, background: 'rgba(45,106,79,0.2)', color: '#6ee7a0', border: '1px solid rgba(45,106,79,0.35)' }}>
              {formatDistance(distanceKm)} away
            </span>
          )}
        </div>
      </div>
      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, fontFamily: 'var(--font-inter,sans-serif)', fontSize: 10, color: C.c3 }}>
          <MapPin size={9} style={{ opacity: 0.5, flexShrink: 0 }} />
          <span style={{ color: C.c2, fontWeight: 500 }}>{cityLabel(event.city)}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.c4 }}> · {event.venue}</span>
        </div>
        <h3 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 19, fontWeight: 400, color: C.cream, lineHeight: 1.18, marginBottom: 8, letterSpacing: '-0.2px' }}>
          {event.title}
        </h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontFamily: 'var(--font-inter,sans-serif)', fontSize: 9.5, color: C.c3, marginBottom: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={9} />{event.dateLabel}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={9} />{event.time}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 12, borderTop: `1px solid ${C.bd}` }}>
          {event.price === 0
            ? <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 10, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#4ade80', flex: 1 }}>Free</span>
            : <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 16, color: C.cream, flex: 1, letterSpacing: '-0.5px' }}>
                <span style={{ fontSize: 10, color: C.gold, marginRight: 1 }}>₵</span>{event.price}
              </span>
          }
          <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '2px', textTransform: 'uppercase', background: C.gold, color: '#000', padding: '9px 16px', borderRadius: 6, flexShrink: 0, fontWeight: 600 }}>
            Get Tickets
          </span>
        </div>
      </div>
    </Link>
  );
}

function SideRow({ label, count, active, onClick }: {
  label: string; count: number; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '7px 8px', cursor: 'pointer',
      background: active ? 'rgba(200,146,42,0.07)' : 'transparent',
      transition: 'background 150ms', border: 'none', textAlign: 'left',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: active ? C.gold : C.bd, flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: active ? C.cream : C.c2 }}>{label}</span>
      </div>
      <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, color: active ? C.gold : C.c3 }}>{count}</span>
    </button>
  );
}

export default function EventsClient({ events }: { events: GhanaEvent[] }) {
  const [filters,          setFilters]          = useState<FilterState>(DEFAULT);
  const [page,             setPage]             = useState(PAGE_SIZE);
  const [view,             setView]             = useState<'grid' | 'list'>('grid');
  const [userLoc,          setUserLoc]          = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus,        setLocStatus]        = useState<'idle' | 'detecting' | 'found' | 'error'>('idle');
  const [radius,           setRadius]           = useState(25);
  const [sheet,            setSheet]            = useState(false);
  const [nearbyDismissed,  setNearbyDismissed]  = useState(false);

  const set = useCallback(<K extends keyof FilterState>(k: K, v: FilterState[K]) => {
    setFilters(f => ({ ...f, [k]: v }));
    setPage(PAGE_SIZE);
  }, []);

  const clear = useCallback(() => { setFilters(DEFAULT); setPage(PAGE_SIZE); }, []);

  const requestLoc = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocStatus('found'); },
      ()  => setLocStatus('error'),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }, []);

  const filtered = useMemo(() => filterEvents(events, filters, userLoc, radius), [events, filters, userLoc, radius]);

  const nearby = useMemo(() => {
    if (!userLoc) return [];
    return events
      .map(e => ({ event: e, dist: haversine(userLoc.lat, userLoc.lng, e.lat, e.lng) }))
      .filter(x => x.dist <= radius)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 6);
  }, [events, userLoc, radius]);

  const visible  = filtered.slice(0, page);
  const hasMore  = page < filtered.length;

  const activeCount = [
    filters.city !== 'all', !!filters.category,
    !!filters.priceFilter, filters.freeOnly, filters.maxPrice < 500,
  ].filter(Boolean).length;

  const cityCounts = useMemo(() => {
    const m: Record<string, number> = { all: events.length };
    events.forEach(e => { m[e.city] = (m[e.city] ?? 0) + 1; });
    return m;
  }, [events]);

  const catCounts = useMemo(() => {
    const m: Record<string, number> = {};
    events.forEach(e => { m[e.category] = (m[e.category] ?? 0) + 1; });
    return m;
  }, [events]);

  const filterContent = (
    <>
      <SheetSection title="City">
        {CITIES.map(c => (
          <Pill key={c.value} active={filters.city === c.value} onClick={() => set('city', c.value)}>
            {c.label}
          </Pill>
        ))}
      </SheetSection>
      <SheetSection title="Category">
        {CATEGORIES.map(c => (
          <Pill key={c.value} active={filters.category === c.value} onClick={() => set('category', filters.category === c.value ? null : c.value)}>
            {c.emoji} {c.label}
          </Pill>
        ))}
      </SheetSection>
      <SheetSection title="Price">
        {PRICE_OPTS.map(p => (
          <Pill key={p.value} active={filters.priceFilter === p.value} onClick={() => set('priceFilter', filters.priceFilter === p.value ? null : p.value as FilterState['priceFilter'])}>
            {p.label}
          </Pill>
        ))}
      </SheetSection>
      <SheetSection title="Sort by">
        <Pill active={filters.sort === 'upcoming'} onClick={() => set('sort', 'upcoming')}>📅 Upcoming</Pill>
        <Pill active={filters.sort === 'popular'}  onClick={() => set('sort', 'popular')}>🔥 Popular</Pill>
        <Pill active={filters.sort === 'nearby'}   onClick={() => { requestLoc(); set('sort', 'nearby'); }}>📍 Near Me</Pill>
      </SheetSection>
      <div style={{ padding: '20px 20px 0' }}>
        <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.7, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'block', width: 14, height: 1, background: C.gold }} />
          Max price: {filters.maxPrice >= 500 ? '₵500+' : `₵${filters.maxPrice}`}
        </p>
        <input type="range" min={0} max={500} step={25} value={filters.maxPrice}
          onChange={e => set('maxPrice', Number(e.target.value))}
          style={{ width: '100%', accentColor: C.gold }} />
      </div>
      {activeCount > 0 && (
        <div style={{ padding: '24px 20px 0' }}>
          <button onClick={() => { clear(); setSheet(false); }} style={{ width: '100%', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.red, border: '1px solid rgba(206,17,38,0.2)', padding: 12, background: 'transparent', cursor: 'pointer', borderRadius: 6 }}>
            × Clear all filters
          </button>
        </div>
      )}
      <div style={{ padding: '16px 20px 0' }}>
        <button onClick={() => setSheet(false)} style={{ width: '100%', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', background: C.gold, color: '#000', padding: 14, fontWeight: 700, cursor: 'pointer', border: 'none', borderRadius: 6 }}>
          Show {filtered.length} Events
        </button>
      </div>
    </>
  );

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>

      {/* TOP BAR */}
      <div style={{ position: 'sticky', top: 62, zIndex: 90, background: `${C.bg}F7`, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${C.bd}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${C.bd}`, background: C.bg2, padding: '10px 14px', borderRadius: 8, minWidth: 0 }}>
            <Search size={13} style={{ color: C.c3, flexShrink: 0 }} />
            <input
              type="search"
              placeholder="Search events, artists, venues…"
              value={filters.search}
              onChange={e => set('search', e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-inter,sans-serif)', fontSize: 14, color: C.cream, minWidth: 0 }}
            />
            {filters.search && (
              <button onClick={() => set('search', '')} style={{ color: C.c3, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                <X size={14} />
              </button>
            )}
          </div>
          <button onClick={() => setSheet(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', border: `1px solid ${activeCount > 0 ? C.goldBd : C.bd}`, background: activeCount > 0 ? C.goldDim : C.bg2, color: activeCount > 0 ? C.gold : C.c3, padding: '10px 16px', borderRadius: 8, cursor: 'pointer', flexShrink: 0, transition: 'all 180ms' }}>
            <Filter size={13} />
            <span>Filters</span>
            {activeCount > 0 && (
              <span style={{ background: C.gold, color: '#000', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>
                {activeCount}
              </span>
            )}
          </button>
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            {(['grid', 'list'] as const).map(m => (
              <button key={m} onClick={() => setView(m)} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${view === m ? C.goldBd : C.bd}`, background: view === m ? C.goldDim : 'transparent', color: view === m ? C.gold : C.c3, borderRadius: 6, cursor: 'pointer', transition: 'all 180ms' }}>
                {m === 'grid' ? <Grid2X2 size={14} /> : <List size={14} />}
              </button>
            ))}
          </div>
        </div>
        {activeCount > 0 && (
          <div style={{ display: 'flex', gap: 6, padding: '0 16px 10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {filters.city !== 'all' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBd}`, padding: '4px 10px', borderRadius: 999, flexShrink: 0, whiteSpace: 'nowrap' }}>
                {cityLabel(filters.city)}
                <button onClick={() => set('city', 'all')} style={{ background: 'none', border: 'none', color: C.gold, cursor: 'pointer', display: 'flex', padding: 0 }}><X size={10} /></button>
              </span>
            )}
            {filters.category && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBd}`, padding: '4px 10px', borderRadius: 999, flexShrink: 0, whiteSpace: 'nowrap' }}>
                {filters.category}
                <button onClick={() => set('category', null)} style={{ background: 'none', border: 'none', color: C.gold, cursor: 'pointer', display: 'flex', padding: 0 }}><X size={10} /></button>
              </span>
            )}
            {filters.priceFilter && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBd}`, padding: '4px 10px', borderRadius: 999, flexShrink: 0, whiteSpace: 'nowrap' }}>
                {PRICE_OPTS.find(p => p.value === filters.priceFilter)?.label}
                <button onClick={() => set('priceFilter', null)} style={{ background: 'none', border: 'none', color: C.gold, cursor: 'pointer', display: 'flex', padding: 0 }}><X size={10} /></button>
              </span>
            )}
            <button onClick={clear} style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: C.red, background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
              Clear all
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex' }}>

        {/* SIDEBAR — desktop only */}
        <div id="akw-sidebar" style={{ display: 'none', width: 240, flexShrink: 0, position: 'sticky', top: 'calc(62px + 57px)', alignSelf: 'flex-start', maxHeight: 'calc(100vh - 130px)', overflowY: 'auto', borderRight: `1px solid ${C.bd}`, padding: '20px 16px' }}>
          <style>{`@media(min-width:1024px){#akw-sidebar{display:block!important}}`}</style>

          <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.c3, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${C.bd}` }}>By City</p>
          {CITIES.map(c => <SideRow key={c.value} label={c.label} count={cityCounts[c.value] ?? 0} active={filters.city === c.value} onClick={() => set('city', c.value)} />)}

          <div style={{ marginTop: 20 }}>
            <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.c3, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${C.bd}` }}>By Category</p>
            {CATEGORIES.map(c => <SideRow key={c.value} label={c.label} count={catCounts[c.value] ?? 0} active={filters.category === c.value} onClick={() => set('category', filters.category === c.value ? null : c.value)} />)}
          </div>

          <div style={{ marginTop: 20 }}>
            <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.c3, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${C.bd}` }}>
              Max Price: {filters.maxPrice >= 500 ? '₵500+' : `₵${filters.maxPrice}`}
            </p>
            <input type="range" min={0} max={500} step={25} value={filters.maxPrice}
              onChange={e => set('maxPrice', Number(e.target.value))}
              style={{ width: '100%', accentColor: C.gold }} />
          </div>

          <div style={{ marginTop: 20, background: 'rgba(200,146,42,0.07)', border: `1px solid ${C.goldBd}`, borderRadius: 10, padding: 14 }}>
            <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, marginBottom: 10 }}>Traveller Tips</p>
            <ul style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3, lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 6, listStyle: 'none', padding: 0 }}>
              <li>Pay with MTN, Vodafone or AirtelTigo MoMo at most venues.</li>
              <li>Dress codes are common at nightlife events — check each listing.</li>
              <li>Book 48 hrs ahead for major festivals to guarantee entry.</li>
              <li>Bolt and taxis are widely available in Accra & Kumasi.</li>
            </ul>
          </div>
        </div>

        {/* MAIN */}
        <div style={{ flex: 1, minWidth: 0, paddingBottom: 80 }}>

          {/* Location banner */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0 16px', minHeight: 48, background: locStatus === 'found' ? 'rgba(45,106,79,0.1)' : C.bg2, borderBottom: `1px solid ${locStatus === 'found' ? 'rgba(45,106,79,0.2)' : C.bd}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: locStatus === 'found' ? C.green : locStatus === 'error' ? C.red : C.c3, boxShadow: locStatus === 'found' ? `0 0 10px ${C.green}` : 'none' }} />
              <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: locStatus === 'found' ? '#6ee7a0' : locStatus === 'error' ? '#f87171' : C.c3 }}>
                {locStatus === 'found' ? 'Location detected' : locStatus === 'detecting' ? 'Detecting…' : locStatus === 'error' ? 'Location unavailable' : 'Find events near you'}
              </span>
              {locStatus === 'found' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, color: C.c3 }}>within</span>
                  <select value={radius} onChange={e => setRadius(Number(e.target.value))} style={{ background: 'transparent', border: `1px solid ${C.bd}`, color: C.c2, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, padding: '3px 6px', outline: 'none' }}>
                    {[5, 10, 25, 50, 100].map(r => <option key={r} value={r}>{r} km</option>)}
                  </select>
                </div>
              )}
            </div>
            {locStatus !== 'found' && (
              <button onClick={requestLoc} style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, border: `1px solid ${C.goldBd}`, padding: '7px 14px', borderRadius: 6, background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={12} />
                <span>Use My Location</span>
              </button>
            )}
          </div>

          {/* Nearby */}
          {locStatus === 'found' && nearby.length > 0 && !nearbyDismissed && (
            <div style={{ borderTop: '2px solid rgba(45,106,79,0.2)', background: 'linear-gradient(to bottom, rgba(45,106,79,0.07), transparent)', padding: '20px 16px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, boxShadow: `0 0 10px ${C.green}`, flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#6ee7a0' }}>
                  {nearby.length} Events Near You · within {radius}km
                </span>
                <button onClick={() => setNearbyDismissed(true)} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '2px', textTransform: 'uppercase', color: C.c3, border: `1px solid ${C.bd}`, padding: '5px 10px', background: 'transparent', cursor: 'pointer', borderRadius: 4 }}>
                  <X size={9} /> Hide
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {nearby.map(({ event, dist }) => (
                  <EventCard key={event.id} event={event} distanceKm={dist} />
                ))}
              </div>
            </div>
          )}

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 14px', borderBottom: `1px solid ${C.bd}`, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 18, fontWeight: 400, color: C.c2 }}>
              {filters.city === 'all' ? 'All Events in Ghana' : `Events in ${cityLabel(filters.city)}`}
            </span>
            <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '1px', color: C.c3 }}>
              <strong style={{ color: C.c2 }}>{visible.length}</strong> / <strong style={{ color: C.c2 }}>{filtered.length}</strong>
            </span>
          </div>

          {/* Grid */}
          <div style={{ padding: 12, display: view === 'grid' ? 'grid' : 'flex', gridTemplateColumns: 'repeat(2, 1fr)', gap: view === 'grid' ? 12 : 0, flexDirection: 'column' }}>
            {visible.length === 0 ? (
              <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: 14, textAlign: 'center' }}>
                <Search size={40} style={{ color: 'rgba(245,236,215,0.08)' }} />
                <p style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 24, color: 'rgba(245,236,215,0.2)' }}>No events found</p>
                <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: C.c3 }}>Try adjusting your filters</p>
                <button onClick={clear} style={{ marginTop: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, border: `1px solid ${C.goldBd}`, padding: '10px 20px', background: 'transparent', cursor: 'pointer', borderRadius: 5 }}>
                  Clear all filters
                </button>
              </div>
            ) : (
              visible.map(ev => (
                <EventCard key={ev.id} event={ev} listMode={view === 'list'}
                  distanceKm={userLoc ? haversine(userLoc.lat, userLoc.lng, ev.lat, ev.lng) : undefined} />
              ))
            )}
          </div>

          {/* Load more */}
          {hasMore && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '8px 16px 32px' }}>
              <div style={{ width: '100%', height: 1, background: C.bd }} />
              <button onClick={() => setPage(p => p + BATCH)} style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8.5, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.c3, border: `1px solid ${C.bd}`, padding: '13px 36px', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}>
                Load more — {filtered.length - page} remaining
              </button>
              <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.c3 }}>
                Showing {visible.length} of {filtered.length}
              </p>
            </div>
          )}
        </div>
      </div>

      <BottomSheet open={sheet} onClose={() => setSheet(false)}>
        {filterContent}
      </BottomSheet>
    </div>
  );
                      }
