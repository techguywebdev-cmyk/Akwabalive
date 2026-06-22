'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, MapPin, SlidersHorizontal, Grid2X2, List, X, ChevronDown, Filter } from 'lucide-react';
import clsx from 'clsx';
import type { GhanaEvent, FilterState, City, Category } from '@/lib/types';
import { filterEvents, haversine, formatDistance, formatPrice, cityLabel } from '@/lib/utils';
import EventCard from '@/components/ui/EventCard';

/* ── CONSTANTS ───────────────────────────────────────── */
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
  { value: 'festival',  label: 'Festival',    emoji: '🎪' },
  { value: 'concert',   label: 'Concert',     emoji: '🎵' },
  { value: 'food',      label: 'Food & Drink', emoji: '🍲' },
  { value: 'nightlife', label: 'Nightlife',   emoji: '🌙' },
  { value: 'culture',   label: 'Culture',     emoji: '🎭' },
  { value: 'sports',    label: 'Sports',      emoji: '⚽' },
  { value: 'tech',      label: 'Tech',        emoji: '💻' },
  { value: 'art',       label: 'Art',         emoji: '🎨' },
];

const PRICE_FILTERS = [
  { value: 'free',  label: 'Free'      },
  { value: 'u50',   label: 'Under ₵50' },
  { value: 'u200',  label: 'Under ₵200'},
  { value: 'o200',  label: '₵200+'     },
] as const;

const PAGE_SIZE = 12;
const BATCH     = 8;

const DEFAULT_FILTERS: FilterState = {
  city:        'all',
  category:    null,
  priceFilter: null,
  freeOnly:    false,
  maxPrice:    500,
  search:      '',
  sort:        'upcoming',
};

/* ── DESIGN TOKENS ───────────────────────────────────── */
// Warm cinematic palette — applied via inline style vars
// so this file is self-contained and works before
// tailwind.config.ts is updated on Vercel.
const T = {
  bg:        '#0D0B08',
  bg2:       '#141109',
  bg3:       '#1C1710',
  bg4:       '#242018',
  gold:      '#C8922A',
  goldDim:   'rgba(200,146,42,0.15)',
  goldBd:    'rgba(200,146,42,0.28)',
  cream:     '#F5ECD7',
  cream2:    'rgba(245,236,215,0.55)',
  cream3:    'rgba(245,236,215,0.24)',
  cream4:    'rgba(245,236,215,0.08)',
  red:       '#CE1126',
  green:     '#1B4332',
  greenL:    '#2D6A4F',
  bd:        'rgba(245,236,215,0.07)',
  bd2:       'rgba(245,236,215,0.12)',
};

/* ── TINY SHARED UI ──────────────────────────────────── */
function Pill({
  active, onClick, children,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-dm-mono, monospace)',
        fontSize: 11,
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        padding: '6px 14px',
        borderRadius: 999,
        border: `1px solid ${active ? T.goldBd : T.bd}`,
        background: active ? T.goldDim : 'transparent',
        color: active ? T.gold : T.cream3,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 180ms',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

/* ── BOTTOM SHEET (mobile filter drawer) ─────────────── */
function BottomSheet({
  open, onClose, children,
}: {
  open: boolean; onClose: () => void; children: React.ReactNode;
}) {
  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            background: 'rgba(13,11,8,0.82)',
            backdropFilter: 'blur(4px)',
          }}
        />
      )}
      {/* Sheet */}
      <div
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0,
          zIndex: 401,
          background: T.bg2,
          borderTop: `1px solid ${T.bd2}`,
          borderRadius: '20px 20px 0 0',
          padding: '0 0 40px',
          maxHeight: '85vh',
          overflowY: 'auto',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 320ms cubic-bezier(.22,1,.36,1)',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: T.bd2 }} />
        </div>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 20px 16px',
          borderBottom: `1px solid ${T.bd}`,
        }}>
          <span style={{ fontFamily: 'var(--font-syne, sans-serif)', fontSize: 17, fontWeight: 700, color: T.cream }}>
            Filter Events
          </span>
          <button onClick={onClose} style={{ color: T.cream3, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

/* ── FILTER SECTION INSIDE SHEET ─────────────────────── */
function SheetSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '20px 20px 0' }}>
      <p style={{
        fontFamily: 'var(--font-dm-mono, monospace)',
        fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase',
        color: T.gold, opacity: 0.7, marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ display: 'block', width: 14, height: 1, background: T.gold }} />
        {title}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

/* ── EVENT CARD (inline, warm palette) ───────────────── */
function WarmEventCard({
  event,
  distanceKm,
  listMode = false,
}: {
  event: GhanaEvent;
  distanceKm?: number;
  listMode?: boolean;
}) {
  if (listMode) {
    return (
      <Link
        href={`/events/${event.slug}`}
        style={{
          display: 'flex',
          borderBottom: `1px solid ${T.bd}`,
          background: 'transparent',
          textDecoration: 'none',
          transition: 'background 200ms',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = T.cream4)}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <div style={{ position: 'relative', width: 180, height: 140, flexShrink: 0, overflow: 'hidden' }}>
          <Image
            src={event.image} alt={event.title} fill sizes="180px"
            style={{ objectFit: 'cover', filter: 'brightness(0.75)' }}
          />
        </div>
        <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <p style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', color: T.cream3, marginBottom: 6 }}>
            {event.badge}
          </p>
          <h3 style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: 18, fontWeight: 400, color: T.cream, lineHeight: 1.2, marginBottom: 6 }}>
            {event.title}
          </h3>
          <p style={{ fontFamily: 'var(--font-inter, sans-serif)', fontSize: 11, color: T.cream3, marginBottom: 'auto' }}>
            {event.dateLabel} · {event.venue}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginTop: 8, borderTop: `1px solid ${T.bd}` }}>
            <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: 15, color: T.cream }}>
              {event.price === 0 ? (
                <span style={{ color: '#4ade80', fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>Free</span>
              ) : `₵${event.price}`}
            </span>
            <span style={{
              fontFamily: 'var(--font-dm-mono, monospace)', fontSize: 7.5, letterSpacing: '2px', textTransform: 'uppercase',
              background: T.gold, color: '#000', padding: '8px 14px', borderRadius: 5,
            }}>
              Get Tickets
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/events/${event.slug}`}
      style={{
        display: 'block', position: 'relative', overflow: 'hidden',
        borderRadius: 14, border: `1px solid ${T.bd}`,
        background: T.bg2, textDecoration: 'none',
        transition: 'transform 320ms cubic-bezier(.22,1,.36,1), box-shadow 320ms, border-color 320ms',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = `0 20px 48px rgba(0,0,0,0.55), 0 0 0 1px ${T.goldBd}`;
        e.currentTarget.style.borderColor = T.goldBd;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = T.bd;
      }}
    >
      {event.hot && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${T.gold}, rgba(200,146,42,0.15))`, zIndex: 6 }} />
      )}

      {/* Image */}
      <div style={{ position: 'relative', width: '100%', paddingTop: '58%', overflow: 'hidden', background: T.bg3 }}>
        <Image
          src={event.image} alt={event.title} fill sizes="(max-width:640px) 50vw, 400px"
          style={{ objectFit: 'cover', filter: 'brightness(0.78) saturate(0.85)' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${T.bg2} 0%, rgba(13,11,8,0.2) 55%, transparent 100%)` }} />
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 4, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--font-dm-mono, monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase',
            padding: '4px 9px', borderRadius: 3,
            background: 'rgba(200,146,42,0.2)', color: T.gold, border: `1px solid ${T.goldBd}`,
          }}>
            {event.badge}
          </span>
          {distanceKm !== undefined && (
            <span style={{
              fontFamily: 'var(--font-dm-mono, monospace)', fontSize: 7, letterSpacing: '1px', textTransform: 'uppercase',
              padding: '4px 9px', borderRadius: 3,
              background: 'rgba(45,106,79,0.2)', color: '#6ee7a0', border: '1px solid rgba(45,106,79,0.35)',
            }}>
              {formatDistance(distanceKm)} away
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, fontFamily: 'var(--font-inter, sans-serif)', fontSize: 10, color: T.cream3 }}>
          <MapPin size={9} style={{ opacity: 0.5, flexShrink: 0 }} />
          <span style={{ color: T.cream2, fontWeight: 500 }}>{cityLabel(event.city)}</span>
          <span style={{ color: T.cream4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}> · {event.venue}</span>
        </div>
        <h3 style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: 19, fontWeight: 400, color: T.cream, lineHeight: 1.18, marginBottom: 8, letterSpacing: '-0.2px' }}>
          {event.title}
        </h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontFamily: 'var(--font-inter, sans-serif)', fontSize: 9.5, color: T.cream3, marginBottom: 14 }}>
          <span>{event.dateLabel}</span>
          <span>{event.time}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 12, borderTop: `1px solid ${T.bd}` }}>
          {event.price === 0 ? (
            <span style={{ fontFamily: 'var(--font-inter, sans-serif)', fontSize: 10, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#4ade80', flex: 1 }}>Free</span>
          ) : (
            <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: 16, color: T.cream, flex: 1 }}>
              <span style={{ fontSize: 10, color: T.gold, marginRight: 1 }}>₵</span>{event.price}
            </span>
          )}
          <span style={{
            fontFamily: 'var(--font-dm-mono, monospace)', fontSize: 7.5, letterSpacing: '2px', textTransform: 'uppercase',
            background: T.gold, color: '#000', padding: '9px 16px', borderRadius: 6, flexShrink: 0,
            fontWeight: 600,
          }}>
            Get Tickets
          </span>
        </div>
      </div>

      {/* Bottom sweep */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${T.gold}, rgba(200,146,42,0.1))`, transform: 'scaleX(0)', transformOrigin: 'left', transition: 'transform 480ms cubic-bezier(.22,1,.36,1)', zIndex: 5 }} />
    </Link>
  );
                                            }
