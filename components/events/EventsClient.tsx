'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Search, MapPin, X, Grid2X2, List, Filter, Navigation,
  ChevronRight, LocateFixed, Star, Loader2,
} from 'lucide-react';
import type { GhanaEvent, FilterState, City, Category, WhenFilter } from '@/lib/types';
import { filterEvents, haversine, formatDistance, matchesWhen } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';

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

const WHEN_OPTS: { value: WhenFilter; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'tonight', label: 'Tonight' },
  { value: 'weekend', label: 'This weekend' },
  { value: 'week', label: 'This week' },
  { value: 'all', label: 'All dates' },
];

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
  city: 'all',
  category: null,
  priceFilter: null,
  freeOnly: false,
  maxPrice: 500,
  search: '',
  sort: 'newest',
  when: 'upcoming',
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
          <span style={{
            fontFamily: 'var(--font-cormorant,serif)',
            fontSize: 22,
            fontWeight: 300,
            letterSpacing: '-0.3px',
            color: C.cream,
          }}>
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: C.cream,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

function Rail({
  title, italic, items, distMap, saved, onToggleSave, saveLoading,
}: {
  title: string;
  italic?: string;
  items: GhanaEvent[];
  distMap: Map<string, number>;
  saved: Set<string>;
  onToggleSave: (e: GhanaEvent) => void;
  saveLoading: string | null;
}) {
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{
          fontFamily: 'var(--font-cormorant,serif)', fontSize: 22, fontWeight: 300,
          color: C.cream, letterSpacing: '-0.3px', margin: 0,
        }}>
          {title}{italic ? <em style={{ fontStyle: 'italic' }}> {italic}</em> : null}
        </h2>
      </div>
      <div style={{
        display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6,
        WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
      }}>
        {items.map(ev => (
          <div key={ev.slug} style={{ width: 'min(168px, 72vw)', flexShrink: 0 }}>
            <EventCard
              event={ev}
              view="grid"
              distKm={distMap.get(ev.slug) ?? null}
              compact
              saved={saved.has(ev.slug)}
              saveLoading={saveLoading === ev.slug}
              onToggleSave={() => onToggleSave(ev)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function EventCard({
  event, view, distKm, compact, saved, saveLoading, onToggleSave,
}: {
  event: GhanaEvent;
  view: 'grid' | 'list';
  distKm?: number | null;
  compact?: boolean;
  saved?: boolean;
  saveLoading?: boolean;
  onToggleSave?: () => void;
}) {
  const city = event.city
    ? event.city.charAt(0).toUpperCase() + event.city.slice(1).replace(/-/g, ' ')
    : '';

  const saveBtn = onToggleSave ? (
    <button
      type="button"
      aria-label={saved ? 'Remove from Dream List' : 'Save to Dream List'}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSave(); }}
      style={{
        position: 'absolute', top: 8, right: 8, zIndex: 8,
        width: 30, height: 30, borderRadius: '50%',
        border: `1px solid ${saved ? C.goldBd : 'rgba(245,236,215,0.15)'}`,
        background: saved ? C.goldDim : 'rgba(13,11,8,0.72)',
        color: saved ? C.gold : 'rgba(245,236,215,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', backdropFilter: 'blur(8px)',
      }}
    >
      {saveLoading ? <Loader2 size={13} /> : <Star size={13} fill={saved ? C.gold : 'none'} />}
    </button>
  ) : null;

  if (view === 'list' && !compact) {
    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <Link href={`/events/${event.slug}`} style={{
          display: 'flex', gap: 12, padding: 12, borderRadius: 12,
          border: `1px solid ${C.bd}`, background: C.bg2, textDecoration: 'none',
          width: '100%', boxSizing: 'border-box',
        }}>
          <div style={{
            width: 88, height: 88, borderRadius: 10, flexShrink: 0,
            backgroundImage: `url(${event.image})`, backgroundSize: 'cover', backgroundPosition: 'center',
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, color: C.gold, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 4px' }}>
              {event.badge || event.category}
              {distKm != null && distKm < 900 && (
                <span style={{ color: '#4ade80', marginLeft: 8 }}>· {formatDistance(distKm)}</span>
              )}
            </p>
            <h3 style={{
              fontFamily: 'var(--font-cormorant,serif)', fontSize: 17, fontWeight: 400, color: C.cream,
              lineHeight: 1.25, letterSpacing: '-0.2px', margin: '0 0 4px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {event.title}
            </h3>
            <p style={{
              fontFamily: 'var(--font-inter,sans-serif)', fontSize: 10, color: C.c3, margin: '0 0 6px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {event.dateLabel} · {event.venue}
            </p>
            {event.price === 0
              ? <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#4ade80' }}>Free</span>
              : <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 14, color: C.cream }}>
                  <span style={{ fontSize: 9, color: C.gold }}>₵</span>{event.price}
                </span>
            }
          </div>
        </Link>
        {saveBtn}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', minWidth: 0 }}>
      <Link
        href={`/events/${event.slug}`}
        style={{
          display: 'block', position: 'relative', overflow: 'hidden', borderRadius: 12,
          border: `1px solid ${C.bd}`, background: C.bg2, textDecoration: 'none',
          width: '100%', height: '100%',
        }}
      >
        {/* no gold top stripe — matches clean home cards */}
        <div style={{ width: '100%', paddingTop: '58%', position: 'relative', overflow: 'hidden', background: C.bg3 }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${event.image})`, backgroundSize: 'cover', backgroundPosition: 'center',
            filter: 'brightness(0.72) saturate(0.82)',
          }} />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${C.bg2} 0%, transparent 60%)` }} />
          <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 4, maxWidth: 'calc(100% - 48px)' }}>
            <span style={{
              fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase',
              padding: '4px 8px', borderRadius: 3, background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBd}`,
              display: 'inline-block',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
            }}>
              {event.badge || event.category}
            </span>
            {distKm != null && distKm < 900 && (
              <span style={{
                display: 'inline-block', marginLeft: 6,
                fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1px',
                padding: '4px 8px', borderRadius: 3, background: 'rgba(45,106,79,0.35)', color: '#7dcea0',
                border: '1px solid rgba(45,106,79,0.45)',
              }}>
                {formatDistance(distKm)}
              </span>
            )}
          </div>
        </div>
        <div style={{ padding: compact ? '12px' : '14px 14px 14px' }}>
          <p style={{
            fontFamily: 'var(--font-inter,sans-serif)', fontSize: 10, color: C.c3, marginBottom: 5,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {city} · {event.venue}
          </p>
          <h3 style={{
            fontFamily: 'var(--font-cormorant,serif)', fontSize: compact ? 16 : 17, fontWeight: 400, color: C.cream,
            lineHeight: 1.25, marginBottom: 10, letterSpacing: '-0.2px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: compact ? 40 : 42,
          }}>
            {event.title}
          </h3>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            paddingTop: 10, borderTop: `1px solid ${C.bd}`,
          }}>
            {event.price === 0
              ? <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#4ade80', flexShrink: 0 }}>Free</span>
              : <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 14, color: C.cream, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <span style={{ fontSize: 9, color: C.gold }}>₵</span>{event.price}
                </span>
            }
            <span style={{
              fontFamily: 'var(--font-dm-mono,monospace)',
              fontSize: 7,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              background: C.gold,
              color: '#000',
              padding: '7px 10px',
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
      {saveBtn}
    </div>
  );
}

export default function EventsClient({ events }: { events: GhanaEvent[] }) {
  const { user } = useAuth();
  const supabase = createClient();

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
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [saveLoading, setSaveLoading] = useState<string | null>(null);
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem('akwaaba_loc');
      if (!raw) return;
      const parsed = JSON.parse(raw) as { lat: number; lng: number; label: string; radius?: number };
      if (parsed?.lat && parsed?.lng) {
        setUserLoc({ lat: parsed.lat, lng: parsed.lng });
        setLocLabel(parsed.label || 'Saved place');
        setLocStatus('found');
        if (parsed.radius) setRadius(parsed.radius);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!userLoc || !locLabel) return;
    try {
      localStorage.setItem('akwaaba_loc', JSON.stringify({ ...userLoc, label: locLabel, radius }));
    } catch { /* ignore */ }
  }, [userLoc, locLabel, radius]);

  useEffect(() => {
    if (!user) { setSaved(new Set()); return; }
    supabase
      .from('dream_events')
      .select('event_slug')
      .eq('user_id', user.id)
      .then(({ data }) => {
        setSaved(new Set((data || []).map((r: { event_slug: string }) => r.event_slug)));
      });
  }, [user]);

  const toggleSave = useCallback(async (event: GhanaEvent) => {
    if (!user) {
      window.location.href = '/auth';
      return;
    }
    setSaveLoading(event.slug);
    try {
      if (saved.has(event.slug)) {
        await supabase.from('dream_events').delete().eq('user_id', user.id).eq('event_slug', event.slug);
        setSaved(prev => {
          const n = new Set(prev);
          n.delete(event.slug);
          return n;
        });
      } else {
        await supabase.from('dream_events').upsert({
          user_id: user.id,
          event_slug: event.slug,
          event_title: event.title,
          event_image: event.image,
          is_public: true,
        });
        setSaved(prev => new Set(prev).add(event.slug));
      }
    } finally {
      setSaveLoading(null);
    }
  }, [user, saved, supabase]);

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

  useEffect(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q || q.length < 3) return;
    const hit = PLACES.find(p =>
      p.label.toLowerCase().includes(q) || p.id.includes(q.replace(/\s+/g, '-')),
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

  const distMap = useMemo(() => {
    const m = new Map<string, number>();
    if (!userLoc) return m;
    for (const e of events) {
      m.set(e.slug, haversine(userLoc.lat, userLoc.lng, e.lat, e.lng));
    }
    return m;
  }, [events, userLoc]);

  const withDist = useMemo(() => {
    return filtered.map(e => ({
      event: e,
      dist: userLoc ? (distMap.get(e.slug) ?? null) : null,
    }));
  }, [filtered, userLoc, distMap]);

  const visible = withDist.slice(0, page);
  const hasMore = page < withDist.length;

  const railBase = useMemo(
    () => events.filter(e => matchesWhen(e, filters.when ?? 'upcoming')),
    [events, filters.when],
  );

  const railNear = useMemo(() => {
    if (!userLoc) return [];
    return [...railBase]
      .map(e => ({ e, d: haversine(userLoc.lat, userLoc.lng, e.lat, e.lng) }))
      .filter(x => x.d <= radius)
      .sort((a, b) => a.d - b.d)
      .slice(0, 8)
      .map(x => x.e);
  }, [railBase, userLoc, radius]);

  const railFree = useMemo(
    () => railBase.filter(e => e.price === 0).slice(0, 8),
    [railBase],
  );

  const railNew = useMemo(() => {
    return [...railBase]
      .sort((a, b) => {
        const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return cb - ca;
      })
      .slice(0, 8);
  }, [railBase]);

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (filters.when && filters.when !== 'upcoming') {
      chips.push({
        key: 'when',
        label: WHEN_OPTS.find(w => w.value === filters.when)?.label || filters.when,
        clear: () => set('when', 'upcoming'),
      });
    }
    if (filters.city !== 'all') {
      chips.push({
        key: 'city',
        label: CITIES.find(c => c.value === filters.city)?.label || filters.city,
        clear: () => set('city', 'all'),
      });
    }
    if (filters.category) {
      chips.push({
        key: 'cat',
        label: CATEGORIES.find(c => c.value === filters.category)?.label || filters.category,
        clear: () => set('category', null),
      });
    }
    if (filters.priceFilter) {
      chips.push({
        key: 'price',
        label: PRICE_OPTS.find(p => p.value === filters.priceFilter)?.label || filters.priceFilter,
        clear: () => set('priceFilter', null),
      });
    }
    if (filters.search) {
      chips.push({
        key: 'search',
        label: `"${filters.search}"`,
        clear: () => set('search', ''),
      });
    }
    if (locStatus === 'found' && locLabel) {
      chips.push({
        key: 'loc',
        label: `${locLabel} · ${radius}km`,
        clear: () => {
          setUserLoc(null);
          setLocLabel(null);
          setLocStatus('idle');
          set('sort', 'newest');
          try { localStorage.removeItem('akwaaba_loc'); } catch { /* ignore */ }
        },
      });
    }
    return chips;
  }, [filters, locStatus, locLabel, radius, set]);

  const activeCount = [
    filters.city !== 'all', !!filters.category,
    !!filters.priceFilter, filters.freeOnly, filters.maxPrice < 500,
    filters.when !== 'upcoming',
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

  const showRails = !filters.search && filters.city === 'all' && !filters.category && !filters.priceFilter;

  const majorEvents = useMemo(() => {
    const scored = events
      .filter(e => matchesWhen(e, filters.when ?? 'upcoming'))
      .map(e => {
        let s = 0;
        if (e.isFeatured) s += 100;
        if (e.hot) s += 40;
        if (e.badge?.toUpperCase().includes('FEATURED')) s += 30;
        if (e.badge?.toUpperCase().includes('SELLING')) s += 25;
        const t = `${e.title} ${e.badge || ''}`.toLowerCase();
        if (/sarkodie|rapperholic|shatta|shattafest|blacko|stonebwoy|burna|wixx|afrochella|detty|december/.test(t)) s += 80;
        if (e.attending && e.attending > 50) s += 15;
        return { e, s };
      })
      .filter(x => x.s >= 25)
      .sort((a, b) => b.s - a.s);
    const seen = new Set<string>();
    const out: GhanaEvent[] = [];
    for (const { e } of scored) {
      if (seen.has(e.slug)) continue;
      seen.add(e.slug);
      out.push(e);
      if (out.length >= 10) break;
    }
    if (out.length < 3) {
      for (const e of events) {
        if (seen.has(e.slug)) continue;
        if (e.isFeatured || e.hot) {
          out.push(e);
          seen.add(e.slug);
        }
        if (out.length >= 8) break;
      }
    }
    return out;
  }, [events, filters.when]);

  return (
    <div style={{ minHeight: '60vh', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 640px) {
          .akw-events-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
        }
        @media (min-width: 1024px) {
          .akw-events-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
        }
      ` }} />
      <div style={{
        position: 'sticky', top: 62, zIndex: 90,
        background: `${C.bg}F5`, backdropFilter: 'blur(18px)',
        borderBottom: `1px solid ${C.bd}`,
        padding: '8px 14px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 1100, margin: '0 auto' }}>
          <IconBtn active={searchOpen || !!filters.search} onClick={() => setSearchOpen(s => !s)} label="Search">
            <Search size={16} />
          </IconBtn>
          <IconBtn active={locStatus === 'found' || locOpen} onClick={() => setLocOpen(true)} label="Location">
            <LocateFixed size={16} />
          </IconBtn>
          <IconBtn active={filterOpen || activeCount > 0} onClick={() => setFilterOpen(true)} label="Filters" badge={activeCount}>
            <Filter size={16} />
          </IconBtn>

          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '1px',
              color: C.c3, textTransform: 'uppercase',
            }}>
              {withDist.length} events
            </span>
          </div>

          <IconBtn active={view === 'grid'} onClick={() => setView('grid')} label="Grid">
            <Grid2X2 size={15} />
          </IconBtn>
          <IconBtn active={view === 'list'} onClick={() => setView('list')} label="List">
            <List size={15} />
          </IconBtn>
        </div>

        <div style={{
          maxWidth: 1100, margin: '10px auto 0',
          display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10,
          WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
        }}>
          {WHEN_OPTS.map(w => (
            <Pill key={w.value} active={filters.when === w.value} onClick={() => set('when', w.value)}>
              {w.label}
            </Pill>
          ))}
        </div>

        {searchOpen && (
          <div style={{ maxWidth: 1100, margin: '0 auto 10px', position: 'relative' }}>
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

        {activeChips.length > 0 && (
          <div style={{
            maxWidth: 1100, margin: '0 auto',
            display: 'flex', gap: 8, flexWrap: 'wrap', paddingBottom: 10,
          }}>
            {activeChips.map(ch => (
              <button
                key={ch.key}
                type="button"
                onClick={ch.clear}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '0.5px',
                  padding: '5px 10px', borderRadius: 999,
                  border: `1px solid ${C.goldBd}`, background: C.goldDim, color: C.gold,
                  cursor: 'pointer',
                }}
              >
                {ch.label}
                <X size={12} />
              </button>
            ))}
            <button
              type="button"
              onClick={clear}
              style={{
                fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '1px',
                padding: '5px 10px', borderRadius: 999, border: 'none',
                background: 'transparent', color: C.c3, cursor: 'pointer', textDecoration: 'underline',
              }}
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '10px 14px 80px', width: '100%', boxSizing: 'border-box' }}>
        {majorEvents.length > 0 && showRails && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <p style={{
                  fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px',
                  textTransform: 'uppercase', color: C.gold, opacity: 0.8, margin: '0 0 4px',
                }}>
                  On the radar
                </p>
                <h2 style={{
                  fontFamily: 'var(--font-cormorant,serif)', fontSize: 'clamp(22px, 5vw, 28px)',
                  fontWeight: 300, color: C.cream, margin: 0, letterSpacing: '-0.4px',
                }}>
                  Hot <em style={{ fontStyle: 'italic' }}>takes</em>
                </h2>
              </div>
            </div>
            <div style={{
              display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8,
              WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
              marginLeft: -14, marginRight: -14, paddingLeft: 14, paddingRight: 14,
            }}>
              {majorEvents.map(ev => {
                const city = ev.city
                  ? ev.city.charAt(0).toUpperCase() + ev.city.slice(1).replace(/-/g, ' ')
                  : '';
                return (
                  <Link
                    key={`major-${ev.slug}`}
                    href={`/events/${ev.slug}`}
                    style={{
                      flex: '0 0 auto',
                      width: 'min(260px, 78vw)',
                      borderRadius: 14,
                      overflow: 'hidden',
                      border: `1px solid ${C.bd}`,
                      background: C.bg2,
                      textDecoration: 'none',
                      position: 'relative',
                      display: 'block',
                    }}
                  >
                    <div style={{ position: 'relative', width: '100%', paddingTop: '62%', background: C.bg3 }}>
                      <div style={{
                        position: 'absolute', inset: 0,
                        backgroundImage: `url(${ev.image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'brightness(0.78) saturate(0.9)',
                      }} />
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(to top, rgba(13,11,8,0.95) 0%, rgba(13,11,8,0.35) 45%, transparent 70%)',
                      }} />
                      <span style={{
                        position: 'absolute', top: 10, left: 10,
                        fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px',
                        textTransform: 'uppercase', padding: '4px 8px', borderRadius: 3,
                        background: 'rgba(200,146,42,0.2)', color: C.gold, border: `1px solid ${C.goldBd}`,
                      }}>
                        {ev.badge || 'Major'}
                      </span>
                      <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
                        <p style={{
                          fontFamily: 'var(--font-inter,sans-serif)', fontSize: 10, color: C.c2,
                          margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {city} · {ev.dateLabel}
                        </p>
                        <p style={{
                          fontFamily: 'var(--font-cormorant,serif)', fontSize: 18, fontWeight: 400,
                          color: C.cream, lineHeight: 1.2, margin: 0, letterSpacing: '-0.2px',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {ev.title}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {showRails && (
          <>
            {userLoc && (
              <Rail
                title="Near"
                italic="you"
                items={railNear}
                distMap={distMap}
                saved={saved}
                onToggleSave={toggleSave}
                saveLoading={saveLoading}
              />
            )}
            <Rail
              title="Free"
              italic="entry"
              items={railFree}
              distMap={distMap}
              saved={saved}
              onToggleSave={toggleSave}
              saveLoading={saveLoading}
            />
            <Rail
              title="New"
              italic="this week"
              items={railNew}
              distMap={distMap}
              saved={saved}
              onToggleSave={toggleSave}
              saveLoading={saveLoading}
            />
          </>
        )}

        <p style={{
          fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2px',
          textTransform: 'uppercase', color: C.gold, opacity: 0.75, marginBottom: 12,
        }}>
          {showRails ? 'All matching' : 'Results'}
        </p>

        {visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: C.c3 }}>
            <MapPin size={28} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 22, color: C.cream, marginBottom: 8 }}>
              No events match
            </p>
            <p style={{ fontSize: 13, marginBottom: 16, fontFamily: 'var(--font-inter,sans-serif)' }}>
              Try another time window, a wider radius, or clear filters.
            </p>
            <button type="button" onClick={clear} style={{
              background: C.gold, color: C.bg, border: 'none', borderRadius: 8, padding: '10px 18px',
              fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 10, letterSpacing: '1px', cursor: 'pointer',
            }}>
              Reset filters
            </button>
          </div>
        ) : (
          <div
            className="akw-events-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: view === 'grid' ? 'repeat(2, minmax(0, 1fr))' : '1fr',
              gap: 12,
              width: '100%',
            }}
          >
            {visible.map(({ event, dist }) => (
              <EventCard
                key={event.slug}
                event={event}
                view={view}
                distKm={dist}
                saved={saved.has(event.slug)}
                saveLoading={saveLoading === event.slug}
                onToggleSave={() => toggleSave(event)}
              />
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

      <Sheet open={locOpen} onClose={() => setLocOpen(false)} title="Find events around you">
        <div style={{ padding: '16px 20px 0' }}>
          <button
            type="button"
            onClick={() => { requestLoc(); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
              border: `1px solid ${C.goldBd}`, background: C.goldDim, color: C.gold,
              fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 11,
              letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600,
            }}
          >
            <Navigation size={16} />
            {locStatus === 'detecting' ? 'Detecting…' : 'Use my current location'}
          </button>
          {locStatus === 'error' && (
            <p style={{ color: C.red, fontSize: 12, marginTop: 8, fontFamily: 'var(--font-inter,sans-serif)' }}>
              Location permission denied. Pick a neighbourhood below.
            </p>
          )}

          <p style={{
            fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2px',
            textTransform: 'uppercase', color: C.gold, opacity: 0.75, margin: '22px 0 10px',
          }}>
            Radius
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
              fontFamily: 'var(--font-inter,sans-serif)',
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
                  <span style={{
                    display: 'block',
                    fontFamily: 'var(--font-cormorant,serif)',
                    fontSize: 18,
                    fontWeight: 400,
                    color: C.cream,
                    lineHeight: 1.2,
                  }}>
                    {p.label}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-dm-mono,monospace)',
                    fontSize: 9,
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    color: C.c3,
                  }}>
                    {p.area}
                  </span>
                </span>
                <ChevronRight size={16} style={{ color: C.c3 }} />
              </button>
            ))}
          </div>
        </div>
      </Sheet>

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
            <Pill active={filters.sort === 'upcoming'} onClick={() => set('sort', 'upcoming')}>Date</Pill>
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
