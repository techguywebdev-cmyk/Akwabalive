'use client';

import { useState, useMemo, useCallback, useEffect, useRef, type CSSProperties } from 'react';
import Link from 'next/link';
import { Mic2, Search, X, ArrowUpRight } from 'lucide-react';
import { useArtistPhotos } from '@/hooks/useArtistPhotos';
import ShowNudge from '@/components/events/ShowNudge';
import { Avatar as FriendAvatar, sentence as friendSentence, type Friend } from '@/components/social/FriendsStrip';
import { artistsInQuery, performsAt } from '@/lib/data/artists';
import { Portrait } from '@/components/artists/parts';
import Nav from '@/components/layout/Nav';
import EventFeed from '@/components/events/EventFeed';
import HotRail, { HOT_RAIL_H } from '@/components/events/HotRail';
import { linkTentpoles } from '@/lib/data/tentpoles';
import { loadAll as loadAllMoments } from '@/components/moments/EventMoments';
import { momentsForEvent } from '@/lib/moments/match';
import EventTile from '@/components/events/EventTile';
import FilterSheet, { CITIES, CATEGORIES, WHEN_OPTS, PRICE_OPTS, type Place } from '@/components/events/FilterSheet';
import { Icon } from '@/components/ui/Icon';
import type { GhanaEvent, FilterState, City, Category } from '@/lib/types';
import { filterEvents, haversine, matchesWhen } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { T, FONT, GRAD } from '@/lib/thiscene';
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

type View = 'feed' | 'list' | 'grid';

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

const priceText = (e: GhanaEvent) => (e.priceUnknown ? 'Tickets' : e.price === 0 ? 'Free' : `GH₵ ${e.price.toLocaleString()}`);

const ARTIST_ROW_H = 66;

/** One borderless row in the list view: picture, quiet category, title, time · venue, price. */
function Row({ event, last, performer }: { event: GhanaEvent; last: boolean; performer?: { name: string; slug: string } | null }) {
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
        {performer ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 700, color: T.mintText }}>
            <Mic2 size={13} strokeWidth={2.4} /> {performer.name} is performing
          </span>
        ) : (
          <span style={{ fontFamily: FONT.display, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
            {event.category}
          </span>
        )}
        <span style={{ fontFamily: FONT.sans, fontSize: 16, fontWeight: 600, lineHeight: 1.25, color: T.white, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {event.title}
        </span>
        <span style={{ fontFamily: FONT.sans, fontSize: 13, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {[event.time, event.venue].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span style={{ fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: event.price === 0 && !event.priceUnknown ? T.mintText : 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap' }}>
        {priceText(event)}
      </span>
    </Link>
  );
}

/* ── Feed mix ─────────────────────────────────────────────────────── */
// Each page load brings a new seed from the server (so server and browser agree); the first one sticks for the whole
// visit, so going back to the feed shows the same order, and a reload starts a new mix
let seed: number | null = null;
function feedSeed(fresh: number) {
  if (typeof window === 'undefined') return fresh; // the server renders each request with its own seed
  if (seed === null) seed = fresh;
  return seed;
}
function rng(n: number) { return () => { n = (n + 0x6d2b79f5) | 0; let t = Math.imul(n ^ (n >>> 15), 1 | n); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** Weighted shuffle: hot, featured and this-fortnight events are more likely near the top */
function mix(list: GhanaEvent[], s: number): GhanaEvent[] {
  const r = rng(s);
  const now = Date.now();
  return list.map((e) => {
    const d = parseDay(e.date)?.getTime() ?? now;
    const days = (d - now) / 86400000;
    const w = (e.isFeatured ? 3 : 1) * (e.hot ? 2.5 : 1) * (e.highlight ? 1.3 : 1) * (days < 0 ? 0.3 : days <= 14 ? 1.8 : days <= 45 ? 1.2 : 1);
    return { e, k: Math.pow(r(), 1 / w) };
  }).sort((a, b) => b.k - a.k).map((x) => x.e);
}

export default function EventsClient({ events, seed: seedProp = 1 }: { events: GhanaEvent[]; seed?: number }) {
  const { user } = useAuth();
  const supabase = createClient();

  // With no upcoming events at all, start on every date so the page is never empty.
  const hasUpcoming = useMemo(() => events.some((e) => matchesWhen(e, 'upcoming')), [events]);
  const base = useMemo<FilterState>(() => ({ ...DEFAULT, when: hasUpcoming ? 'upcoming' : 'all' }), [hasUpcoming]);

  const [filters, setFilters] = useState<FilterState>(base);
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
  const [searchFocus, setSearchFocus] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [saveLoading, setSaveLoading] = useState<string | null>(null);
  const [going, setGoing] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  const set = useCallback(<K extends keyof FilterState>(k: K, v: FilterState[K]) => {
    setFilters((f) => ({ ...f, [k]: v }));
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
    clearLoc();
  }, [base, clearLoc]);

  // Saved view, saved place, and links like /events?category=food&city=accra&search=1
  useEffect(() => {
    try {
      const v = localStorage.getItem('akw_events_view');
      if (v === 'feed' || v === 'list' || v === 'grid') setViewState(v);
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
      ...(q.get('campus') === '1' ? { campus: true } : {}),
    }));
    if (q.get('view') === 'list' || cat || city || q.get('price') || q.get('campus')) setViewState('list');
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
    if (!user) { window.location.href = `/auth?next=${encodeURIComponent(window.location.pathname + window.location.search)}`; return; }
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
    if (!user) { window.location.href = `/auth?next=${encodeURIComponent(window.location.pathname + window.location.search)}`; return; }
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

  // With nothing filtered, the feed is a fresh mix on every visit (hot and soon events lean to the top).
  // The mix holds while browsing in and back out, and changes on reload.
  const untouched = JSON.stringify(filters) === JSON.stringify(base);
  // Which events have moments (same matching as the cards), so the big nights you can watch lead the feed
  const [withClips, setWithClips] = useState<Set<string>>(new Set());
  useEffect(() => {
    let live = true;
    loadAllMoments().then((all) => {
      if (!live) return;
      setWithClips(new Set(events.filter((e) => momentsForEvent(e, all).length > 0).map((e) => e.slug)));
    });
    return () => { live = false; };
  }, [events]);
  const ordered = useMemo(() => {
    if (!untouched) return filtered;
    // Through the season the big nights lead the feed (shuffled each visit); everything else follows mixed
    if (Date.now() < Date.parse('2027-01-06T00:00:00Z')) {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' });
      const picked = linkTentpoles(filtered).map((t) => t.event).filter(Boolean) as GhanaEvent[];
      // Big nights with moments to watch come first, then the other big nights. Each group is shuffled per visit
      // (sooner and featured ones lean to the top), so a reload doesn't open on the same show every time.
      const all = Array.from(new Set([...picked, ...filtered.filter((e) => e.hot)])).filter((e) => (e.date ?? '') >= today);
      const seed = feedSeed(seedProp);
      const majors = [...mix(all.filter((e) => withClips.has(e.slug)), seed), ...mix(all.filter((e) => !withClips.has(e.slug)), seed + 7)];
      const lead = new Set(majors.map((e) => e.slug));
      return [...majors, ...mix(filtered.filter((e) => !lead.has(e.slug)), feedSeed(seedProp))];
    }
    return mix(filtered, feedSeed(seedProp));
  }, [filtered, untouched, withClips]); // eslint-disable-line react-hooks/exhaustive-deps
  // The Hot rail: hot and featured shows coming up (featured order first, then soonest)
  const hotShows = useMemo(() => {
    const today = new Date(new Date().toDateString()).getTime();
    return events
      .filter((e) => (e.hot || e.isFeatured) && e.image && (parseDay(e.date)?.getTime() ?? 0) >= today)
      .sort((a, b) => ((a.isFeatured ? a.featuredOrder ?? 100 : 1000) - (b.isFeatured ? b.featuredOrder ?? 100 : 1000)) || (parseDay(a.date)?.getTime() ?? 0) - (parseDay(b.date)?.getTime() ?? 0))
      .slice(0, 12);
  }, [events]);
  // Where the people you follow are going (signed in only)
  const [planRows, setPlanRows] = useState<{ slug: string; friends: Friend[] }[]>([]);
  useEffect(() => {
    if (!user) { setPlanRows([]); return; }
    let live = true;
    supabase.auth.getSession().then(({ data }) => {
      const t = data.session?.access_token;
      if (!t) return;
      fetch('/api/friends/plans', { headers: { authorization: `Bearer ${t}` } }).then((r) => (r.ok ? r.json() : { plans: [] }))
        .then((j) => { if (live) setPlanRows(j.plans ?? []); }).catch(() => {});
    });
    return () => { live = false; };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  const friendPlans = useMemo(() => {
    const bySlug = new Map(events.map((e) => [e.slug, e]));
    const rows = planRows.filter((p) => bySlug.get(p.slug)?.image);
    return rows.length ? { events: rows.map((p) => bySlug.get(p.slug)!), by: Object.fromEntries(rows.map((p) => [p.slug, p.friends])) } : null;
  }, [planRows, events]);

  const items = useMemo(
    () => ordered.map((e) => ({ event: e, dist: userLoc ? haversine(userLoc.lat, userLoc.lng, e.lat, e.lng) : null })),
    [ordered, userLoc],
  );

  // What's switched on, in words — shown under the list title
  const summary = useMemo(() => {
    const parts: string[] = [];
    if (filters.when !== base.when) parts.push(WHEN_OPTS.find((w) => w.value === filters.when)?.label ?? '');
    if (filters.city !== 'all') parts.push(CITIES.find((c) => c.value === filters.city)?.label ?? '');
    if (filters.category) parts.push(CATEGORIES.find((c) => c.value === filters.category)?.label ?? '');
    if (filters.campus) parts.push('Campus nights');
    if (filters.priceFilter) parts.push(PRICE_OPTS.find((p) => p.value === filters.priceFilter)?.label ?? '');
    if (locStatus === 'found' && locLabel) parts.push(`${locLabel} · ${radius} km`);
    if (filters.search) parts.push(`“${filters.search}”`);
    return parts.filter(Boolean);
  }, [filters, base.when, locStatus, locLabel, radius]);

  const filtersOn = summary.length > 0 || filters.sort !== 'upcoming';

  // List view: group by day
  const groups = useMemo(() => {
    const out: { key: string; label: string; events: GhanaEvent[] }[] = [];
    for (const e of filtered) {
      const key = (e.date || e.dateLabel || '').slice(0, 10);
      const last = out[out.length - 1];
      if (last && last.key === key && filters.sort === 'upcoming') last.events.push(e);
      else out.push({ key, label: dayHeading(e), events: [e] });
    }
    return out;
  }, [filtered, filters.sort]);

  // One capsule: search | filters (the cards/list switch lives in the filter sheet)
  const capBtn = (on: boolean): CSSProperties => ({ position: 'relative', width: 46, height: 44, padding: 0, border: 'none', background: on ? 'rgba(123,227,168,0.14)' : 'transparent', color: on ? T.mintText : T.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' });
  const headerActions = (
    <div role="group" aria-label="Search and filter" style={{ display: 'flex', alignItems: 'center', height: 44, borderRadius: 15, overflow: 'hidden', background: 'rgba(3,10,6,0.38)', border: 'none', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
      <button type="button" aria-label="Search" aria-pressed={searchOpen} onClick={() => setSearchOpen((s) => !s)} style={capBtn(searchOpen || !!filters.search)}>
        <Icon name="search" size={21} strokeWidth={1.9} />
      </button>
      <span aria-hidden style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.14)' }} />
      <button type="button" aria-label={filtersOn ? `Sort and filter, ${summary.length || 1} on` : 'Sort and filter'} onClick={() => setFilterOpen(true)} style={capBtn(filtersOn)}>
        <Icon name="sliders" size={21} strokeWidth={1.9} />
        {filtersOn && <span aria-hidden style={{ position: 'absolute', top: 9, right: 10, width: 7, height: 7, borderRadius: 2, background: T.mint, boxShadow: '0 0 0 2px rgba(3,8,6,0.9)' }} />}
      </button>
    </div>
  );

  const headerH = 72;
  // Searching an artist: their card under the search box, and "X is performing" on each show they're on
  const searchArtist = useMemo(() => (filters.search ? artistsInQuery(filters.search)[0] ?? null : null), [filters.search]);
  const performerFor = useCallback((e: GhanaEvent) => (searchArtist && performsAt(e, searchArtist) ? { name: searchArtist.name, slug: searchArtist.slug } : null), [searchArtist]);
  const artistShows = searchArtist ? filtered.filter((e) => performsAt(e, searchArtist)).length : 0;
  const artistPhoto = useArtistPhotos(searchArtist ? [searchArtist.slug] : []);
  const searchH = searchOpen ? 66 + (searchArtist ? ARTIST_ROW_H + 1 : 0) : 0;
  // The Hot rail sits on the list view; the feed keeps its full-height flyers
  const railH = hotShows.length && view !== 'feed' && !filters.search ? HOT_RAIL_H : 0;

  return (
    <>
      <Nav active="Events" actions={headerActions} onSearch={() => setSearchOpen(true)} onFilter={() => setFilterOpen(true)} filtersOn={filtersOn} />
      {view !== 'feed' && !filters.search && <HotRail events={hotShows} top={headerH + searchH} />}

      {searchOpen && (
        <div style={{ position: 'fixed', zIndex: 195, top: `calc(${headerH}px + env(safe-area-inset-top, 0px))`, left: 16, right: 16, maxWidth: 720, margin: '0 auto' }}>
          {/* One panel: the search field, and the artist you're searching for joined underneath */}
          <div style={{ borderRadius: 20, overflow: 'hidden', background: '#0D1210', border: 'none', boxShadow: '0 18px 44px rgba(0,0,0,0.5)', transition: 'border-color 160ms ease' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, height: 54, padding: '0 6px 0 16px' }}>
              <Search size={19} strokeWidth={2.2} color={T.mint} />
              <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Search events</span>
              <input
                ref={searchRef}
                className="ak-search"
                value={filters.search}
                onChange={(e) => set('search', e.target.value)}
                onFocus={() => setSearchFocus(true)}
                onBlur={() => setSearchFocus(false)}
                placeholder="Artists, events, venues, areas"
                style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: T.white, fontFamily: FONT.sans, fontSize: 16, fontWeight: 500 }}
              />
              <button type="button" aria-label="Close search" onClick={() => { set('search', ''); setSearchOpen(false); }} style={{ width: 42, height: 42, borderRadius: 21, border: 'none', background: 'none', color: T.text2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={19} strokeWidth={2.2} />
              </button>
            </label>
            {searchArtist && (
              <Link href={`/artists/${searchArtist.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 12, height: ARTIST_ROW_H, padding: '0 12px 0 14px', borderTop: `1px solid ${T.hairline}`, textDecoration: 'none' }}>
                <Portrait name={searchArtist.name} url={artistPhoto[searchArtist.slug] ?? null} size={42} ring={artistShows > 0} />
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontFamily: FONT.display, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.text3 }}>Artist</span>
                  <span style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {searchArtist.name}
                    <span style={{ marginLeft: 8, fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, letterSpacing: 0, color: artistShows ? T.mintText : T.text2 }}>
                      {artistShows ? `${artistShows} upcoming ${artistShows === 1 ? 'show' : 'shows'}` : 'No upcoming shows'}
                    </span>
                  </span>
                </span>
                <span aria-hidden style={{ width: 34, height: 34, borderRadius: 17, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: GRAD.mint, color: T.onMint }}>
                  <ArrowUpRight size={18} strokeWidth={2.4} />
                </span>
              </Link>
            )}
          </div>
          <style>{`.ak-search::placeholder{color:rgba(255,255,255,0.38)}`}</style>
        </div>
      )}

      {!searchOpen && view === 'feed' && <ShowNudge events={events} compact />}

      {view === 'feed' ? (
        <EventFeed
          items={items}
          saved={saved}
          saveLoading={saveLoading}
          onToggleSave={toggleSave}
          going={going}
          onToggleGoing={toggleGoing}
          topInset={headerH + searchH}
          hot={filters.search ? [] : hotShows}
          performerFor={searchArtist ? performerFor : undefined}
          friendPlans={filters.search ? null : friendPlans}
          onShowAll={filters.when !== 'all' ? () => set('when', 'all') : clear}
          showAllLabel={filters.when !== 'all' ? 'Include past events' : 'Clear filters'}
        />
      ) : (
        <main style={{ maxWidth: view === 'grid' ? 1120 : 760, margin: '0 auto', padding: `calc(${headerH + searchH + railH + 10}px + env(safe-area-inset-top, 0px)) 20px 40px` }}>
          {!filters.search && <ShowNudge events={events} />}
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

          {!filters.search && new Date() < new Date('2027-01-06') && (
            <Link href="/december" style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 20, textDecoration: 'none', background: 'radial-gradient(120% 140% at 0% 0%, rgba(123,227,168,0.18) 0%, rgba(123,227,168,0.03) 60%), #0D1210', border: 'none'}}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.mintText }}>15 Dec – 5 Jan</span>
                <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.display, fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>Detty December</span>
                <span style={{ display: 'block', marginTop: 1, fontFamily: FONT.sans, fontSize: 13.5, color: T.text2 }}>The big shows, day by day</span>
              </span>
              <span aria-hidden style={{ width: 38, height: 38, borderRadius: 19, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: GRAD.mint, color: T.onMint }}><ArrowUpRight size={18} strokeWidth={2.4} /></span>
            </Link>
          )}

          {friendPlans && !filters.search && (
            <section aria-label="Where your friends are going" style={{ marginTop: 26 }}>
              <h2 style={{ margin: '0 0 12px', fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.mintText }}>Where your friends are going</h2>
              <div className="no-scrollbar" style={{ display: 'flex', gap: 14, overflowX: 'auto', margin: '0 -20px', padding: '0 20px 4px' }}>
                {friendPlans.events.map((e) => (
                  <Link key={e.slug} href={`/events/${e.slug}`} style={{ flexShrink: 0, width: 132, textDecoration: 'none' }}>
                    <span style={{ position: 'relative', display: 'block', width: 132, height: 165, borderRadius: 16, overflow: 'hidden', background: '#111', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={e.image!} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <span style={{ position: 'absolute', left: 8, bottom: 8, display: 'flex' }}>
                        {friendPlans.by[e.slug].slice(0, 3).map((f, k) => <span key={f.id} style={{ marginLeft: k ? -8 : 0 }}><FriendAvatar f={f} size={26} ring="#050606" /></span>)}
                      </span>
                    </span>
                    <span style={{ display: 'block', marginTop: 8, fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 600, color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
                    <span style={{ display: 'block', marginTop: 1, fontFamily: FONT.sans, fontSize: 12.5, color: T.mintText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{friendSentence(friendPlans.by[e.slug])}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {filtered.length === 0 ? (
            <div style={{ padding: '72px 0', textAlign: 'center' }}>
              <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: T.white }}>Nothing matches yet</p>
              <p style={{ margin: '8px 0 20px', fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>Try another date, city or price.</p>
              <button type="button" onClick={filters.when !== 'all' ? () => set('when', 'all') : clear} style={{ height: 48, padding: '0 22px', borderRadius: 999, border: 'none', background: GRAD.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
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
                {view === 'grid' ? (
                  // Flyers side by side: two across on a phone, more on wider screens
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(calc(50% - 6px), 200px), 1fr))', gap: '18px 12px', marginTop: 12 }}>
                    {g.events.map((e) => <EventTile key={e.slug} event={e} performer={performerFor(e)} />)}
                  </div>
                ) : g.events.map((e, i) => <Row key={e.slug} event={e} last={i === g.events.length - 1} performer={performerFor(e)} />)}
              </section>
            ))
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
        view={view}
        setView={setView}
      />
    </>
  );
}
