'use client';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Search, MapPin, X, Grid2X2, List, Filter, Navigation,
  Crosshair, Clock, Calendar, ChevronRight, LocateFixed,
} from 'lucide-react';
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
  { value: 'all', label: 'All Ghana' },
  { value: 'accra', label: 'Accra' },
  { value: 'kumasi', label: 'Kumasi' },
  { value: 'cape-coast', label: 'Cape Coast' },
  { value: 'tamale', label: 'Tamale' },
  { value: 'takoradi', label: 'Takoradi' },
  { value: 'ho', label: 'Ho' },
];

const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'festival', label: 'Festival', emoji: '🎪' },
  { value: 'concert', label: 'Concert', emoji: '🎵' },
  { value: 'food', label: 'Food & Drink', emoji: '🍲' },
  { value: 'nightlife', label: 'Nightlife', emoji: '🌙' },
  { value: 'culture', label: 'Culture', emoji: '🎭' },
  { value: 'sports', label: 'Sports', emoji: '⚽' },
  { value: 'tech', label: 'Tech', emoji: '💻' },
  { value: 'art', label: 'Art', emoji: '🎨' },
];

const PRICE_OPTS = [
  { value: 'free', label: 'Free' },
  { value: 'u50', label: 'Under ₵50' },
  { value: 'u200', label: 'Under ₵200' },
  { value: 'o200', label: '₵200+' },
] as const;

/** Neighbourhoods & hotspots — GPS-free “what’s near Dansoman?” */
const PLACES: { id: string; label: string; area: string; lat: number; lng: number }[] = [
  { id: 'dansoman', label: 'Dansoman', area: 'Accra', lat: 5.5520, lng: -0.2700 },
  { id: 'osu', label: 'Osu', area: 'Accra', lat: 5.5580, lng: -0.1820 },
  { id: 'labadi', label: 'Labadi / La', area: 'Accra', lat: 5.5600, lng: -0.1550 },
  { id: 'east-legon', label: 'East Legon', area: 'Accra', lat: 5.6380, lng: -0.1480 },
  { id: 'airport', label: 'Airport / Cantonments', area: 'Accra', lat: 5.6050, lng: -0.1680 },
  { id: 'kaneshie', label: 'Kaneshie', area: 'Accra', lat: 5.5680, lng: -0.2350 },
  { id: 'madina', label: 'Madina', area: 'Accra', lat: 5.6830, lng: -0.1670 },
  { id: 'tema', label: 'Tema', area: 'Greater Accra', lat: 5.6690, lng: -0.0166 },
  { id: 'adenta', label: 'Adenta', area: 'Accra', lat: 5.7080, lng: -0.1560 },
  { id: 'spintex', label: 'Spintex', area: 'Accra', lat: 5.6320, lng: -0.1020 },
  { id: 'kejetia', label: 'Kejetia / Adum', area: 'Kumasi', lat: 6.6900, lng: -1.6250 },
  { id: 'santasi', label: 'Santasi', area: 'Kumasi', lat: 6.6620, lng: -1.6500 },
  { id: 'cape-coast-town', label: 'Cape Coast Town', area: 'Central', lat: 5.1050, lng: -1.2470 },
];

const RADIUS_OPTS = [3, 5, 10, 25, 50];
const PAGE_SIZE = 12;

const DEFAULT: FilterState = {
  city: 'all', category: null, priceFilter: null,
  freeOnly: false, maxPrice: 500, search: '', sort: 'newest',
};

function Pill({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} style={{
      fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '1.2px', textTransform: 'uppercase',
      padding: '7px 12px', borderRadius: 999,
      border: `1px solid ${active ? C.goldBd : C.bd}`,
      background: active ? C.goldDim : 'transparent',
      color: active ? C.gold : C.c3,
      cursor: 'pointer', whiteSpace: 'nowrap',
    }}>
      {children}
    </button>
  );
}

function IconBtn({
  active, onClick, label, badge, children,
}: {
  active?: boolean; onClick: () => void; label: string; badge?: number; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{
        position: 'relative',
        width: 40, height: 40, borderRadius: 10,
        border: `1px solid ${active ? C.goldBd : C.bd}`,
        background: active ? C.goldDim : C.bg2,
        color: active ? C.gold : C.c2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0,
      }}
    >
      {children}
      {!!badge && badge > 0 && (
        <span style={{
          position: 'absolute', top: -4, right: -4,
          minWidth: 16, height: 16, borderRadius: 8,
          background: C.gold, color: C.bg,
          fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
        }}>
          {badge}
        </span>
      )}
    </button>
  );
}

function Sheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
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
        borderRadius: '20px 20px 0 0', maxHeight: '90vh', overflowY: 'auto',
        transform: open ? 'translateY(0)' : 'translateY(110%)',
        transition: 'transform 340ms cubic-bezier(.22,1,.36,1)',
        paddingBottom: 36,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 6px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: C.bd2 }} />
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 20px 16px', borderBottom: `1px solid ${C.bd}`,
        }}>
          <span style={{ fontFamily: 'var(--font-syne,sans-serif)', fontSize: 17, fontWeight: 700, color: C.cream }}>{title}</span>
          <button type="button" onClick={onClose} style={{ color: C.c3, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

function EventCard({
  event, view, distKm,
}: {
  event: GhanaEvent; view: 'grid' | 'list'; distKm?: number | null;
}) {
  const city = event.city
    ? event.city.charAt(0).toUpperCase() + event.city.slice(1).replace(/-/g, ' ')
    : '';

  if (view === 'list') {
    return (
      <Link href={`/events/${event.slug}`} style={{
        display: 'flex', gap: 12, padding: 12, borderRadius: 12,
        border: `1px solid ${C.bd}`, background: C.bg2, textDecoration: 'none',
      }}>
        <div style={{
          width: 88, height: 88, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
          backgroundImage: `url(${event.image})`, backgroundSize: 'cover', backgroundPosition: 'center',
        }} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
          <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, color: C.gold, letterSpacing: '1px', textTransform: 'uppercase' }}>
            {event.badge || event.category}
            {distKm != null && distKm < 900 && (
              <span style={{ color: '#4ade80', marginLeft: 8 }}>· {formatDistance(distKm)}</span>
            )}
          </p>
          <h3 style={{
            fontFamily: 'var(--font-cormorant,serif)', fontSize: 18, fontWeight: 400, color: C.cream,
            lineHeight: 1.2, letterSpacing: '-0.2px', margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {event.title}
          </h3>
          <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 10, color: C.c3, margin: 0 }}>
            {event.dateLabel} · {event.venue}
          </p>
          <p style={{
            fontFamily: event.price === 0 ? 'var(--font-inter,sans-serif)' : 'var(--font-dm-mono,monospace)',
            fontSize: event.price === 0 ? 10 : 14,
            fontWeight: event.price === 0 ? 700 : 400,
            letterSpacing: event.price === 0 ? '2px' : '0',
            textTransform: event.price === 0 ? 'uppercase' : 'none',
            color: event.price === 0 ? '#4ade80' : C.cream,
            margin: 0,
          }}>
            {event.price === 0 ? 'Free' : <><span style={{ fontSize: 9, color: C.gold }}>₵</span>{event.price}</>}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/events/${event.slug}`}
      style={{
        display: 'block', position: 'relative', overflow: 'hidden', borderRadius: 12,
        border: `1px solid ${C.bd}`, background: C.bg2, textDecoration: 'none',
      }}
    >
      {event.hot && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${C.gold}, rgba(200,146,42,0.1))`, zIndex: 6 }} />
      )}
      <div style={{ width: '100%', paddingTop: '58%', position: 'relative', overflow: 'hidden', background: C.bg3 }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${event.image})`, backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'brightness(0.72) saturate(0.82)',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${C.bg2} 0%, transparent 60%)` }} />
        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase',
            padding: '4px 8px', borderRadius: 3, background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBd}`,
          }}>
            {event.badge || event.category}
          </span>
          {distKm != null && distKm < 900 && (
            <span style={{
              fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1px',
              padding: '4px 8px', borderRadius: 3, background: 'rgba(45,106,79,0.35)', color: '#7dcea0',
              border: '1px solid rgba(45,106,79,0.45)',
            }}>
              {formatDistance(distKm)}
            </span>
          )}
        </div>
      </div>
      <div style={{ padding: '14px 16px 16px' }}>
        <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 10, color: C.c3, marginBottom: 5 }}>
          {city} · {event.venue}
        </p>
        <h3 style={{
          fontFamily: 'var(--font-cormorant,serif)', fontSize: 18, fontWeight: 400, color: C.cream,
          lineHeight: 1.2, marginBottom: 10, letterSpacing: '-0.2px',
        }}>
          {event.title}
        </h3>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          paddingTop: 10, borderTop: `1px solid ${C.bd}`,
        }}>
          {event.price === 0
            ? <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#4ade80' }}>Free</span>
            : <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 15, color: C.cream, whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 9, color: C.gold }}>₵</span>{event.price}
              </span>
          }
          <span style={{
            fontFamily: 'var(--font-dm-mono,monospace)',
            fontSize: 7,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            background: C.gold,
            color: '#000',
            padding: '7px 14px',
            borderRadius: 5,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            Tickets
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function EventsClient({ events }: { events: GhanaEvent[] }) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT);
  const [page, setPage] = useState(PAGE_SIZE);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locLabel, setLocLabel] = useState<string | null>(null);
  const [locStatus, setLocStatus] = useState<'idle' | 'detecting' | 'found' | 'error'>('idle');
  const [radius, setRadius] = useState(10);
  const [filterOpen, setFilterOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const set = useCallback(<K extends keyof FilterState>(k: K, v: FilterState[K]) => {
    setFilters(f => ({ ...f, [k]: v }));
    setPage(PAGE_SIZE);
  }, []);

  const clear = useCallback(() => {
    setFilters(DEFAULT);
    setPage(PAGE_SIZE);
    setUserLoc(null);
    setLocLabel(null);
    setLocStatus('idle');
  }, []);

  const requestLoc = useCallback(() => {
    if (!navigator.geolocation) {
      setLocStatus('error');
      return;
    }
    setLocStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocLabel('Near you');
        setLocStatus('found');
        set('sort', 'nearby');
        set('city', 'all');
      },
      () => setLocStatus('error'),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }, [set]);

  const pickPlace = useCallback((p: typeof PLACES[0]) => {
    setUserLoc({ lat: p.lat, lng: p.lng });
    setLocLabel(p.label);
    setLocStatus('found');
    set('sort', 'nearby');
    set('city', 'all');
    setLocOpen(false);
  }, [set]);

  // Text search also matches neighbourhood names → snap to place coords
  useEffect(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q || q.length < 3) return;
    const hit = PLACES.find(p =>
      p.label.toLowerCase().includes(q) || p.id.includes(q.replace(/\\s+/g, '-')),
    );
    if (hit) {
      setUserLoc({ lat: hit.lat, lng: hit.lng });
      setLocLabel(hit.label);
      setLocStatus('found');
      setFilters(f => ({ ...f, sort: 'nearby' }));
    }
  }, [filters.search]);

  const filtered = useMemo(
    () => filterEvents(events, filters, userLoc, filters.sort === 'nearby' ? radius : 999999),
    [events, filters, userLoc, radius],
  );

  const withDist = useMemo(() => {
    if (!userLoc) return filtered.map(e => ({ event: e, dist: null as number | null }));
    return filtered
      .map(e => ({ event: e, dist: haversine(userLoc.lat, userLoc.lng, e.lat, e.lng) }))
      .sort((a, b) => {
        if (filters.sort !== 'nearby') return 0;
        return (a.dist ?? 0) - (b.dist ?? 0);
      });
  }, [filtered, userLoc, filters.sort]);

  const visible = withDist.slice(0, page);
  const hasMore = page < withDist.length;

  const activeCount = [
    filters.city !== 'all', !!filters.category,
    !!filters.priceFilter, filters.freeOnly, filters.maxPrice < 500,
  ].filter(Boolean).length;

  const placeHits = useMemo(() => {
    const q = placeQuery.trim().toLowerCase();
    if (!q) return PLACES;
    return PLACES.filter(p =>
      p.label.toLowerCase().includes(q) || p.area.toLowerCase().includes(q),
    );
  }, [placeQuery]);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50);
  }, [searchOpen]);

  return (
    <div style={{ minHeight: '60vh' }}>
      {/* Compact icon toolbar */}
      <div style={{
        position: 'sticky', top: 62, zIndex: 90,
        background: `${C.bg}F5`, backdropFilter: 'blur(18px)',
        borderBottom: `1px solid ${C.bd}`,
        padding: '10px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 1100, margin: '0 auto' }}>
          <IconBtn active={searchOpen || !!filters.search} onClick={() => setSearchOpen(s => !s)} label="Search">
            <Search size={16} />
          </IconBtn>
          <IconBtn
            active={locStatus === 'found' || locOpen}
            onClick={() => setLocOpen(true)}
            label="Location"
          >
            <LocateFixed size={16} />
          </IconBtn>
          <IconBtn active={filterOpen || activeCount > 0} onClick={() => setFilterOpen(true)} label="Filters" badge={activeCount}>
            <Filter size={16} />
          </IconBtn>

          <div style={{ flex: 1, minWidth: 0 }}>
            {locStatus === 'found' && locLabel ? (
              <button
                type="button"
                onClick={() => setLocOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, maxWidth: '100%',
                  background: 'rgba(45,106,79,0.15)', border: '1px solid rgba(45,106,79,0.35)',
                  borderRadius: 999, padding: '6px 12px', cursor: 'pointer',
                  color: '#7dcea0', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9,
                  letterSpacing: '0.5px',
                }}
              >
                <MapPin size={11} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {locLabel} · {radius}km
                </span>
              </button>
            ) : (
              <span style={{
                fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '1px',
                color: C.c3, textTransform: 'uppercase',
              }}>
                {withDist.length} events
              </span>
            )}
          </div>

          <IconBtn active={view === 'grid'} onClick={() => setView('grid')} label="Grid">
            <Grid2X2 size={15} />
          </IconBtn>
          <IconBtn active={view === 'list'} onClick={() => setView('list')} label="List">
            <List size={15} />
          </IconBtn>
        </div>

        {/* Expandable search */}
        {searchOpen && (
          <div style={{ maxWidth: 1100, margin: '10px auto 0', position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.c3 }} />
            <input
              ref={searchRef}
              value={filters.search}
              onChange={e => set('search', e.target.value)}
              placeholder="Search events, artists, Dansoman, Osu…"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px 40px 12px 36px', borderRadius: 10,
                border: `1px solid ${C.goldBd}`, background: C.bg2, color: C.cream,
                fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, outline: 'none',
              }}
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => set('search', '')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.c3, cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 14px 80px' }}>
        {locStatus === 'found' && (
          <p style={{
            fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c2, marginBottom: 14,
          }}>
            Showing what’s within <strong style={{ color: C.cream }}>{radius} km</strong> of{' '}
            <strong style={{ color: C.gold }}>{locLabel}</strong>
            {' · '}
            <button type="button" onClick={() => { setUserLoc(null); setLocLabel(null); setLocStatus('idle'); set('sort', 'newest'); }}
              style={{ background: 'none', border: 'none', color: C.c3, cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>
              Clear location
            </button>
          </p>
        )}

        {visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: C.c3 }}>
            <MapPin size={28} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 22, color: C.cream, marginBottom: 8 }}>
              Nothing nearby yet
            </p>
            <p style={{ fontSize: 13, marginBottom: 16 }}>
              Try a wider radius, another neighbourhood, or clear filters.
            </p>
            <button type="button" onClick={() => setRadius(r => Math.min(50, r * 2))} style={{
              background: C.gold, color: C.bg, border: 'none', borderRadius: 8, padding: '10px 18px',
              fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 10, letterSpacing: '1px', cursor: 'pointer',
            }}>
              Expand to {Math.min(50, radius * 2)} km
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: view === 'grid' ? 'repeat(auto-fill, minmax(160px, 1fr))' : '1fr',
            gap: 12,
          }}>
            {visible.map(({ event, dist }) => (
              <EventCard key={event.slug} event={event} view={view} distKm={dist} />
            ))}
          </div>
        )}

        {hasMore && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}>
            <button
              type="button"
              onClick={() => setPage(p => p + PAGE_SIZE)}
              style={{
                background: 'transparent', border: `1px solid ${C.goldBd}`, color: C.gold,
                borderRadius: 8, padding: '12px 24px', cursor: 'pointer',
                fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 10, letterSpacing: '1.5px',
              }}
            >
              Load more
            </button>
          </div>
        )}
      </div>

      {/* LOCATION SHEET */}
      <Sheet open={locOpen} onClose={() => setLocOpen(false)} title="Find events around you">
        <div style={{ padding: '16px 20px 0' }}>
          <button
            type="button"
            onClick={() => { requestLoc(); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
              border: `1px solid ${C.goldBd}`, background: C.goldDim, color: C.gold,
              fontFamily: 'var(--font-syne,sans-serif)', fontSize: 15, fontWeight: 600,
            }}
          >
            <Navigation size={18} />
            {locStatus === 'detecting' ? 'Detecting your location…' : 'Use my current location'}
          </button>
          {locStatus === 'error' && (
            <p style={{ color: C.red, fontSize: 12, marginTop: 8 }}>
              Location permission denied. Pick a neighbourhood below — it works offline of GPS.
            </p>
          )}

          <p style={{
            fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2px',
            textTransform: 'uppercase', color: C.gold, opacity: 0.75, margin: '22px 0 10px',
          }}>
            Radius
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {RADIUS_OPTS.map(r => (
              <Pill key={r} active={radius === r} onClick={() => setRadius(r)}>{r} km</Pill>
            ))}
          </div>

          <p style={{
            fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2px',
            textTransform: 'uppercase', color: C.gold, opacity: 0.75, margin: '22px 0 10px',
          }}>
            Neighbourhood / area
          </p>
          <input
            value={placeQuery}
            onChange={e => setPlaceQuery(e.target.value)}
            placeholder="Type Dansoman, Osu, Kejetia…"
            style={{
              width: '100%', boxSizing: 'border-box', marginBottom: 12,
              padding: '12px 14px', borderRadius: 10, border: `1px solid ${C.bd}`,
              background: C.bg3, color: C.cream, fontSize: 14, outline: 'none',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 12 }}>
            {placeHits.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => pickPlace(p)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 10, border: `1px solid ${C.bd}`,
                  background: locLabel === p.label ? C.goldDim : C.bg3,
                  color: C.cream, cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span>
                  <span style={{ display: 'block', fontFamily: 'var(--font-inter,sans-serif)', fontSize: 14 }}>{p.label}</span>
                  <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, color: C.c3 }}>{p.area}</span>
                </span>
                <ChevronRight size={16} style={{ color: C.c3 }} />
              </button>
            ))}
          </div>
        </div>
      </Sheet>

      {/* FILTER SHEET */}
      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filters">
        <div style={{ padding: '8px 20px 0' }}>
          <p style={{
            fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2px',
            textTransform: 'uppercase', color: C.gold, opacity: 0.75, margin: '12px 0 10px',
          }}>City</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CITIES.map(c => (
              <Pill key={c.value} active={filters.city === c.value} onClick={() => set('city', c.value)}>{c.label}</Pill>
            ))}
          </div>

          <p style={{
            fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2px',
            textTransform: 'uppercase', color: C.gold, opacity: 0.75, margin: '20px 0 10px',
          }}>Category</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CATEGORIES.map(c => (
              <Pill
                key={c.value}
                active={filters.category === c.value}
                onClick={() => set('category', filters.category === c.value ? null : c.value)}
              >
                {c.emoji} {c.label}
              </Pill>
            ))}
          </div>

          <p style={{
            fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2px',
            textTransform: 'uppercase', color: C.gold, opacity: 0.75, margin: '20px 0 10px',
          }}>Price</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PRICE_OPTS.map(p => (
              <Pill
                key={p.value}
                active={filters.priceFilter === p.value}
                onClick={() => set('priceFilter', filters.priceFilter === p.value ? null : p.value)}
              >
                {p.label}
              </Pill>
            ))}
          </div>

          <p style={{
            fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2px',
            textTransform: 'uppercase', color: C.gold, opacity: 0.75, margin: '20px 0 10px',
          }}>Sort</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Pill active={filters.sort === 'newest'} onClick={() => set('sort', 'newest')}>Newest</Pill>
            <Pill active={filters.sort === 'popular'} onClick={() => set('sort', 'popular')}>Popular</Pill>
            <Pill active={filters.sort === 'nearby'} onClick={() => { if (!userLoc) setLocOpen(true); set('sort', 'nearby'); }}>Near me</Pill>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            <button type="button" onClick={clear} style={{
              flex: 1, padding: '14px', borderRadius: 10, border: `1px solid ${C.bd}`,
              background: 'transparent', color: C.c2, cursor: 'pointer',
              fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 10, letterSpacing: '1px',
            }}>
              Reset
            </button>
            <button type="button" onClick={() => setFilterOpen(false)} style={{
              flex: 2, padding: '14px', borderRadius: 10, border: 'none',
              background: C.gold, color: C.bg, cursor: 'pointer', fontWeight: 700,
              fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 10, letterSpacing: '1px',
            }}>
              Show {withDist.length} events
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
