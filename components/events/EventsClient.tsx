'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import Nav, { HeaderIconButton } from '@/components/layout/Nav';
import EventFeed from '@/components/events/EventFeed';
import FilterSheet, { CITIES, CATEGORIES, WHEN_OPTS, PRICE_OPTS, type Place } from '@/components/events/FilterSheet';
import { Icon } from '@/components/ui/Icon';
import type { GhanaEvent, FilterState, City, Category } from '@/lib/types';
import { filterEvents, haversine, matchesWhen } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { T, FONT } from '@/lib/thiscene';
import { categoryAccent, toHex } from '@/lib/events/accent';
import { parseDay, longDay } from '@/lib/dates';

const PLACES: Place[] = [
  { id: 'osu', label: 'Osu', area: 'Accra', lat: 5.5580, lng: -0.1820 },
  { id: 'labadi', label: 'Labadi', area: 'Accra', lat: 5.5600, lng: -0.1550 },
  { id: 'east-legon', label: 'East Legon', area: 'Accra', lat: 5.6380, lng: -0.1480 },
  { id: 'airport', label: 'Airport', area: 'Accra', lat: 5.6050, lng: -0.1680 },
  { id: 'dansoman', label: 'Dansoman', area: 'Accra', lat: 5.5520, lng: -0.2700 },
  { id: 'madina', label: 'Madina', area: 'Accra', lat: 5.6830, lng: -0.1670 },
  { id: 'spintex', label: 'Spintex', area: 'Accra', lat: 5.6320, lng: -0.1020 },
  { id: 'tema', label: 'Tema', area: 'Greater Accra', lat: 5.6690, lng: -0.0166 },
  { id: 'kejetia', label: 'Adum, Kumasi', area: 'Kumasi', lat: 6.6900, lng: -1.6250 },
  { id: 'cape-coast-town', label: 'Cape Coast', area: 'Central', lat: 5.1050, lng: -1.2470 },
];

const PAGE_SIZE = 24;

const DEFAULT: FilterState = {
  city: 'all',
  category: null,
  priceFilter: null,
  freeOnly: false,
  maxPrice: 500,
  search: '',
  sort: 'upcoming',
  when: 'upcoming',
};

type View = 'feed' | 'list';

/** "Saturday 14 December" (or the stored label when the date can't be read) */
function dayHeading(e: GhanaEvent) {
  const d = parseDay(e.date);
  if (!d) return e.dateLabel || 'Date to be announced';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  const label = longDay(d);
  if (diff === 0) return `Today · ${label}`;
  if (diff === 1) return `Tomorrow · ${label}`;
  return label;
}

const priceText = (e: GhanaEvent) => (e.price === 0 ? 'Free' : `GH₵ ${e.price.toLocaleString()}`);

/** One borderless row in the list view: picture, category in the event's colour, title, time · venue, price. */
function Row({ event, last }: { event: GhanaEvent; last: boolean }) {
  const accent = toHex(categoryAccent(event.category));
  return (
    <Link
      href={`/events/${event.slug}`}
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: last ? 'none' : `1px solid ${T.hairline}`, textDecoration: 'none', color: T.text }}
    >
      <span style={{ width: 64, height: 80, borderRadius: 12, flex: 'none', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
        {event.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.image} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
      </span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontFamily: FONT.display, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: accent }}>
          {event.category}
        </span>
        <span style={{ fontFamily: FONT.sans, fontSize: 16, fontWeight: 600, lineHeight: 1.25, color: T.white, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {event.title}
        </span>
        <span style={{ fontFamily: FONT.sans, fontSize: 13, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {[event.time, event.venue].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span style={{ fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: event.price === 0 ? T.mintText : 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap' }}>
        {priceText(event)}
      </span>
    </Link>
  );
}

export default function EventsClient({ events }: { events: GhanaEvent[] }) {
  const { user } = useAuth();
  const supabase = createClient();

  // With no upcoming events at all, start on every date so the page is never empty.
  const hasUpcoming = useMemo(() => events.some((e) => matchesWhen(e, 'upcoming')), [events]);
  const base = useMemo<FilterState>(() => ({ ...DEFAULT, when: hasUpcoming ? 'upcoming' : 'all' }), [hasUpcoming]);

  const [filters, setFilters] = useState<FilterState>(base);
  const [page, setPage] = useState(PAGE_SIZE);
  const [view, setViewState] = useState<View>('feed');
  const setView = useCallback((v: View) => {
    setViewState(v);
    try { localStorage.setItem('akw_events_view', v); } catch { /* ignore */ }
  }, []);

  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locLabel, setLocLabel] = useState<string | null>(null);
  const [locStatus, setLocStatus] = useState<'idle' | 'detecting' | 'found' | 'error'>('idle');
  const [radius, setRadius] = useState(10);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [saveLoading, setSaveLoading] = useState<string | null>(null);
  const [going, setGoing] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  const set = useCallback(<K extends keyof FilterState>(k: K, v: FilterState[K]) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(PAGE_SIZE);
  }, []);

  const clearLoc = useCallback(() => {
    setUserLoc(null);
    setLocLabel(null);
    setLocStatus('idle');
    setFilters((f) => (f.sort === 'nearby' ? { ...f, sort: 'upcoming' } : f));
    try { localStorage.removeItem('akwaaba_loc'); } catch { /* ignore */ }
  }, []);

  const clear = useCallback(() => {
    setFilters(base);
    setPage(PAGE_SIZE);
    clearLoc();
  }, [base, clearLoc]);

  // Saved view, saved place, and links like /events?category=food&city=accra&search=1
  useEffect(() => {
    try {
      const v = localStorage.getItem('akw_events_view');
      if (v === 'feed' || v === 'list') setViewState(v);
      else if (v === 'grid') setViewState('list');
    } catch { /* ignore */ }
    try {
      const raw = localStorage.getItem('akwaaba_loc');
      if (raw) {
        const p = JSON.parse(raw) as { lat: number; lng: number; label: string; radius?: number };
        if (p?.lat && p?.lng) {
          setUserLoc({ lat: p.lat, lng: p.lng });
          setLocLabel(p.label || 'Saved place');
          setLocStatus('found');
          if (p.radius) setRadius(p.radius);
        }
      }
    } catch { /* ignore */ }
    const q = new URLSearchParams(window.location.search);
    const cat = q.get('category');
    const city = q.get('city');
    const when = q.get('when');
    const text = q.get('q');
    setFilters((f) => ({
      ...f,
      ...(cat && CATEGORIES.some((c) => c.value === cat) ? { category: cat as Category } : {}),
      ...(city && CITIES.some((c) => c.value === city) ? { city: city as City } : {}),
      ...(when && WHEN_OPTS.some((w) => w.value === when) ? { when: when as FilterState['when'] } : {}),
      ...(text ? { search: text } : {}),
      ...(q.get('price') === 'free' ? { priceFilter: 'free' as const } : {}),
    }));
    if (q.get('view') === 'list' || cat || city || q.get('price')) setViewState('list');
    if (q.get('search') === '1' || text) setSearchOpen(true);
  }, []);

  useEffect(() => {
    if (!userLoc || !locLabel) return;
    try { localStorage.setItem('akwaaba_loc', JSON.stringify({ ...userLoc, label: locLabel, radius })); } catch { /* ignore */ }
  }, [userLoc, locLabel, radius]);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 60);
  }, [searchOpen]);

  useEffect(() => {
    if (!user) { setSaved(new Set()); setGoing(new Set()); return; }
    supabase.from('dream_events').select('event_slug').eq('user_id', user.id)
      .then(({ data }) => setSaved(new Set((data || []).map((r: { event_slug: string }) => r.event_slug))));
    supabase.from('event_attendance').select('event_slug').eq('user_id', user.id).eq('status', 'going')
      .then(({ data }) => setGoing(new Set((data || []).map((r: { event_slug: string }) => r.event_slug))));
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSave = useCallback(async (event: GhanaEvent) => {
    if (!user) { window.location.href = '/auth'; return; }
    setSaveLoading(event.slug);
    try {
      if (saved.has(event.slug)) {
        await supabase.from('dream_events').delete().eq('user_id', user.id).eq('event_slug', event.slug);
        setSaved((prev) => { const n = new Set(prev); n.delete(event.slug); return n; });
      } else {
        await supabase.from('dream_events').upsert({ user_id: user.id, event_slug: event.slug, event_title: event.title, event_image: event.image, is_public: true });
        setSaved((prev) => new Set(prev).add(event.slug));
      }
    } finally {
      setSaveLoading(null);
    }
  }, [user, saved, supabase]);

  const toggleGoing = useCallback(async (event: GhanaEvent) => {
    if (!user) { window.location.href = '/auth'; return; }
    const on = going.has(event.slug);
    setGoing((prev) => { const n = new Set(prev); if (on) n.delete(event.slug); else n.add(event.slug); return n; });
    const { error } = on
      ? await supabase.from('event_attendance').delete().eq('user_id', user.id).eq('event_slug', event.slug).eq('status', 'going')
      : await supabase.from('event_attendance').upsert({ user_id: user.id, event_slug: event.slug, status: 'going', is_public: true }, { onConflict: 'user_id,event_slug' });
    if (error) setGoing((prev) => { const n = new Set(prev); if (on) n.add(event.slug); else n.delete(event.slug); return n; });
  }, [user, going, supabase]);

  const requestLoc = useCallback(() => {
    if (!navigator.geolocation) { setLocStatus('error'); return; }
    setLocStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocLabel('Near you');
        setLocStatus('found');
        setFilters((f) => ({ ...f, sort: 'nearby', city: 'all' }));
      },
      () => setLocStatus('error'),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }, []);

  const pickPlace = useCallback((p: Place) => {
    setUserLoc({ lat: p.lat, lng: p.lng });
    setLocLabel(p.label);
    setLocStatus('found');
    setFilters((f) => ({ ...f, sort: 'nearby', city: 'all' }));
  }, []);

  const filtered = useMemo(
    () => filterEvents(events, filters, userLoc, filters.sort === 'nearby' ? radius : 999999),
    [events, filters, userLoc, radius],
  );

  const items = useMemo(
    () => filtered.map((e) => ({ event: e, dist: userLoc ? haversine(userLoc.lat, userLoc.lng, e.lat, e.lng) : null })),
    [filtered, userLoc],
  );

  // What's switched on, in words — shown under the list title
  const summary = useMemo(() => {
    const parts: string[] = [];
    if (filters.when !== base.when) parts.push(WHEN_OPTS.find((w) => w.value === filters.when)?.label ?? '');
    if (filters.city !== 'all') parts.push(CITIES.find((c) => c.value === filters.city)?.label ?? '');
    if (filters.category) parts.push(CATEGORIES.find((c) => c.value === filters.category)?.label ?? '');
    if (filters.priceFilter) parts.push(PRICE_OPTS.find((p) => p.value === filters.priceFilter)?.label ?? '');
    if (locStatus === 'found' && locLabel) parts.push(`${locLabel} · ${radius} km`);
    if (filters.search) parts.push(`“${filters.search}”`);
    return parts.filter(Boolean);
  }, [filters, base.when, locStatus, locLabel, radius]);

  const filtersOn = summary.length > 0 || filters.sort !== 'upcoming';

  // List view: group by day
  const groups = useMemo(() => {
    const out: { key: string; label: string; events: GhanaEvent[] }[] = [];
    for (const e of filtered.slice(0, page)) {
      const key = (e.date || e.dateLabel || '').slice(0, 10);
      const last = out[out.length - 1];
      if (last && last.key === key && filters.sort === 'upcoming') last.events.push(e);
      else out.push({ key, label: dayHeading(e), events: [e] });
    }
    return out;
  }, [filtered, page, filters.sort]);

  const headerActions = (
    <>
      <HeaderIconButton
        label={view === 'feed' ? 'Show as a list' : 'Show full-screen cards'}
        icon={view === 'feed' ? 'list' : 'feed'}
        onClick={() => setView(view === 'feed' ? 'list' : 'feed')}
      />
      <HeaderIconButton label="Search" icon="search" onClick={() => setSearchOpen((s) => !s)} active={searchOpen || !!filters.search} pressed={searchOpen} />
      <HeaderIconButton
        label={filtersOn ? `Sort and filter, ${summary.length || 1} on` : 'Sort and filter'}
        icon="sliders"
        onClick={() => setFilterOpen(true)}
        active={filtersOn}
        dot={filtersOn}
      />
    </>
  );

  const headerH = 74;
  const searchH = searchOpen ? 60 : 0;

  return (
    <>
      <Nav active="Events" actions={headerActions} />

      {searchOpen && (
        <div style={{ position: 'fixed', zIndex: 195, top: `calc(${headerH}px + env(safe-area-inset-top, 0px))`, left: 16, right: 16, maxWidth: 720, margin: '0 auto' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, height: 50, padding: '0 8px 0 16px', borderRadius: 25, background: 'rgba(5,18,11,0.82)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', color: T.text2 }}>
            <Icon name="search" size={19} />
            <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Search events</span>
            <input
              ref={searchRef}
              value={filters.search}
              onChange={(e) => set('search', e.target.value)}
              placeholder="Events, artists, venues, areas…"
              style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: T.white, fontFamily: FONT.sans, fontSize: 15 }}
            />
            <button type="button" aria-label="Close search" onClick={() => { set('search', ''); setSearchOpen(false); }} style={{ width: 36, height: 36, borderRadius: 18, border: 'none', background: 'rgba(255,255,255,0.06)', color: T.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Icon name="close" size={17} />
            </button>
          </label>
        </div>
      )}

      {view === 'feed' ? (
        <EventFeed
          items={items}
          saved={saved}
          saveLoading={saveLoading}
          onToggleSave={toggleSave}
          going={going}
          onToggleGoing={toggleGoing}
          topInset={headerH + searchH}
          onShowAll={filters.when !== 'all' ? () => set('when', 'all') : clear}
          showAllLabel={filters.when !== 'all' ? 'Include past events' : 'Clear filters'}
        />
      ) : (
        <main style={{ maxWidth: 760, margin: '0 auto', padding: `calc(${headerH + searchH + 10}px + env(safe-area-inset-top, 0px)) 20px 40px` }}>
          <h1 style={{ margin: 0, fontFamily: FONT.display, fontSize: 'clamp(36px, 7vw, 52px)', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.035em', color: T.white }}>
            Events
          </h1>
          <p style={{ margin: '10px 0 0', fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>
            {summary.length > 0 && <>{summary.join(' · ')} · </>}
            <span style={{ color: 'rgba(255,255,255,0.9)' }}>{filtered.length} event{filtered.length === 1 ? '' : 's'}</span>
            {filtersOn && (
              <button type="button" onClick={clear} style={{ marginLeft: 10, background: 'none', border: 'none', padding: 0, color: T.mintText, fontFamily: FONT.sans, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                Clear
              </button>
            )}
          </p>

          {filtered.length === 0 ? (
            <div style={{ padding: '72px 0', textAlign: 'center' }}>
              <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: T.white }}>Nothing matches yet</p>
              <p style={{ margin: '8px 0 20px', fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>Try another date, city or price.</p>
              <button type="button" onClick={filters.when !== 'all' ? () => set('when', 'all') : clear} style={{ height: 48, padding: '0 22px', borderRadius: 999, border: 'none', background: T.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                {filters.when !== 'all' ? 'Include past events' : 'Clear filters'}
              </button>
            </div>
          ) : (
            groups.map((g, gi) => (
              <section key={`${g.key}-${gi}`} style={{ marginTop: gi === 0 ? 28 : 24 }}>
                {filters.sort === 'upcoming' && (
                  <h2 style={{ margin: '0 0 2px', fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
                    {g.label}
                  </h2>
                )}
                {g.events.map((e, i) => <Row key={e.slug} event={e} last={i === g.events.length - 1} />)}
              </section>
            ))
          )}

          {page < filtered.length && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}>
              <button type="button" onClick={() => setPage((p) => p + PAGE_SIZE)} style={{ height: 46, padding: '0 22px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: T.text, fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Show more
              </button>
            </div>
          )}
        </main>
      )}

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        set={set}
        clear={clear}
        count={filtered.length}
        locStatus={locStatus}
        locLabel={locLabel}
        radius={radius}
        setRadius={setRadius}
        requestLoc={requestLoc}
        places={PLACES}
        pickPlace={pickPlace}
        clearLoc={clearLoc}
      />
    </>
  );
}
