'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { FilterState, City, Category, WhenFilter, SortMode } from '@/lib/types';
import { T, FONT, EASE } from '@/lib/thiscene';
import { Icon, CATEGORY_ICONS } from '@/components/ui/Icon';

export const CITIES: { value: City | 'all'; label: string }[] = [
  { value: 'all', label: 'All Ghana' },
  { value: 'accra', label: 'Accra' },
  { value: 'kumasi', label: 'Kumasi' },
  { value: 'cape-coast', label: 'Cape Coast' },
  { value: 'takoradi', label: 'Takoradi' },
  { value: 'tamale', label: 'Tamale' },
  { value: 'ho', label: 'Ho' },
];

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'concert', label: 'Concerts' },
  { value: 'festival', label: 'Festivals' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'food', label: 'Food & drink' },
  { value: 'culture', label: 'Culture' },
  { value: 'sports', label: 'Sports' },
  { value: 'art', label: 'Art' },
  { value: 'tech', label: 'Tech' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'fashion', label: 'Fashion' },
];

export const WHEN_OPTS: { value: WhenFilter; label: string }[] = [
  { value: 'tonight', label: 'Tonight' },
  { value: 'weekend', label: 'This weekend' },
  { value: 'week', label: 'Next 7 days' },
  { value: 'upcoming', label: 'All upcoming' },
  { value: 'all', label: 'Include past' },
];

export const PRICE_OPTS = [
  { value: 'free', label: 'Free' },
  { value: 'u50', label: 'Under GH₵ 50' },
  { value: 'u200', label: 'Under GH₵ 200' },
  { value: 'o200', label: 'GH₵ 200+' },
] as const;

export const SORT_OPTS: { value: SortMode; label: string }[] = [
  { value: 'upcoming', label: 'Soonest' },
  { value: 'popular', label: 'Most popular' },
  { value: 'newest', label: 'Just added' },
  { value: 'nearby', label: 'Nearest' },
];

export const RADIUS_OPTS = [3, 5, 10, 25, 50];

export interface Place { id: string; label: string; area: string; lat: number; lng: number }

/** Sheet chip: unselected = faint fill; selected = mint tint with a mint ring. */
export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, height: 40, padding: '0 15px', borderRadius: 999,
        fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
        color: on ? T.white : 'rgba(255,255,255,0.78)',
        background: on ? 'rgba(123,227,168,0.16)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${on ? 'rgba(123,227,168,0.55)' : 'transparent'}`,
        transition: 'background 160ms ease, border-color 160ms ease, color 160ms ease',
      }}
    >
      {children}
    </button>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = `fs-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div role="group" aria-labelledby={id} style={{ paddingTop: 22 }}>
      <h3 id={id} style={{ margin: '0 0 12px', fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{children}</div>
    </div>
  );
}

/**
 * Sort & filter, opened from the single header icon. Everything that used to sit in the
 * toolbar lives here: sort, date window, city, category, price and location.
 */
export default function FilterSheet({
  open, onClose, filters, set, clear, count,
  locStatus, locLabel, radius, setRadius, requestLoc, places, pickPlace, clearLoc,
}: {
  open: boolean;
  onClose: () => void;
  filters: FilterState;
  set: <K extends keyof FilterState>(k: K, v: FilterState[K]) => void;
  clear: () => void;
  count: number;
  locStatus: 'idle' | 'detecting' | 'found' | 'error';
  locLabel: string | null;
  radius: number;
  setRadius: (r: number) => void;
  requestLoc: () => void;
  places: Place[];
  pickPlace: (p: Place) => void;
  clearLoc: () => void;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!open) { setShown(false); return; }
    const t = requestAnimationFrame(() => setShown(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(t); document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, border: 'none', cursor: 'default', background: 'rgba(1,4,3,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', opacity: shown ? 1 : 0, transition: 'opacity 280ms ease' }}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Sort and filter"
        style={{
          position: 'relative', width: '100%', maxWidth: 560, maxHeight: '88svh', display: 'flex', flexDirection: 'column',
          borderRadius: '28px 28px 0 0', borderTop: '1px solid rgba(255,255,255,0.1)',
          background: 'linear-gradient(180deg, rgba(14,44,30,0.98) 0%, rgba(6,18,12,0.99) 40%, #040B07 100%)',
          transform: shown ? 'translateY(0)' : 'translateY(100%)', transition: `transform 320ms ${EASE.sheet}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <span style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 4px 20px' }}>
          <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: T.white }}>Sort &amp; filter</h2>
          <button type="button" aria-label="Close" onClick={onClose} style={{ width: 44, height: 44, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: 'none', color: T.text, cursor: 'pointer' }}>
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
          <Group title="Sort by">
            {SORT_OPTS.map((o) => (
              <Chip key={o.value} on={filters.sort === o.value} onClick={() => { set('sort', o.value); if (o.value === 'nearby' && locStatus !== 'found') requestLoc(); }}>
                {o.label}
              </Chip>
            ))}
          </Group>

          <Group title="When">
            {WHEN_OPTS.map((o) => (
              <Chip key={o.value} on={filters.when === o.value} onClick={() => set('when', o.value)}>{o.label}</Chip>
            ))}
          </Group>

          <Group title="City">
            {CITIES.map((c) => (
              <Chip key={c.value} on={filters.city === c.value} onClick={() => set('city', c.value)}>{c.label}</Chip>
            ))}
          </Group>

          <Group title="Category">
            {CATEGORIES.map((c) => {
              const on = filters.category === c.value;
              return (
                <Chip key={c.value} on={on} onClick={() => set('category', on ? null : c.value)}>
                  <Icon name={CATEGORY_ICONS[c.value] ?? 'sparkle'} size={16} color={on ? T.mintText : 'rgba(255,255,255,0.6)'} />
                  {c.label}
                </Chip>
              );
            })}
          </Group>

          <Group title="Price">
            {PRICE_OPTS.map((p) => {
              const on = filters.priceFilter === p.value;
              return <Chip key={p.value} on={on} onClick={() => set('priceFilter', on ? null : p.value)}>{p.label}</Chip>;
            })}
          </Group>

          <Group title="Near">
            <Chip on={locStatus === 'found' && locLabel === 'Near you'} onClick={requestLoc}>
              <Icon name="locate" size={16} />
              {locStatus === 'detecting' ? 'Finding you…' : 'My location'}
            </Chip>
            {places.map((p) => (
              <Chip key={p.id} on={locStatus === 'found' && locLabel === p.label} onClick={() => pickPlace(p)}>{p.label}</Chip>
            ))}
          </Group>
          {locStatus === 'error' && (
            <p role="alert" style={{ fontFamily: FONT.sans, fontSize: 13, color: T.danger, margin: '10px 0 0' }}>
              We couldn&apos;t get your location. Pick an area instead.
            </p>
          )}
          {locStatus === 'found' && (
            <>
              <Group title={`Within · ${locLabel ?? ''}`}>
                {RADIUS_OPTS.map((r) => <Chip key={r} on={radius === r} onClick={() => setRadius(r)}>{r} km</Chip>)}
              </Group>
              <button type="button" onClick={clearLoc} style={{ marginTop: 12, background: 'none', border: 'none', padding: 0, color: T.mintText, fontFamily: FONT.sans, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                Clear location
              </button>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px calc(18px + env(safe-area-inset-bottom, 0px))', borderTop: `1px solid ${T.hairline}` }}>
          <button type="button" onClick={clear} style={{ height: 48, padding: '0 8px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)', fontFamily: FONT.sans, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>
            Reset
          </button>
          <button type="button" onClick={onClose} style={{ flex: 1, height: 52, borderRadius: 999, border: 'none', background: T.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            {count === 0 ? 'No events match' : `Show ${count} event${count === 1 ? '' : 's'}`}
          </button>
        </div>
      </section>
    </div>
  );
}
