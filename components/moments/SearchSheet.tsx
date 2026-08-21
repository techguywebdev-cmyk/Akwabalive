'use client';

import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Moment } from './types';
import { C } from './types';

interface SearchSheetProps {
  moments: Moment[];
  onSelect: (index: number) => void;
  onClose: () => void;
}

export default function SearchSheet({ moments, onSelect, onClose }: SearchSheetProps) {
  const [q, setQ] = useState('');
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
  const [featuredOnly, setFeaturedOnly] = useState(false);

  const years = useMemo(() => {
    const set = new Set<number>();
    moments.forEach((m) => {
      if (m.year != null) set.add(m.year);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [moments]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return moments
      .map((m, idx) => ({ m, idx }))
      .filter(({ m }) => {
        if (featuredOnly && !m.is_featured) return false;
        if (yearFilter !== 'all' && m.year !== yearFilter) return false;
        if (!query) return true;
        return (
          m.title.toLowerCase().includes(query) ||
          m.event_name.toLowerCase().includes(query) ||
          (m.description ?? '').toLowerCase().includes(query)
        );
      });
  }, [moments, q, yearFilter, featuredOnly]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 35,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '16px 16px 12px',
          borderBottom: `1px solid ${C.glassBd}`,
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(255,255,255,0.08)',
            border: `1px solid ${C.glassBd}`,
            borderRadius: 12,
            padding: '10px 14px',
          }}
        >
          <Search size={16} style={{ color: C.c3 }} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search moments, artists, festivals…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'var(--font-inter,sans-serif)',
              fontSize: 14,
              color: C.cream,
            }}
          />
        </div>
        <button
          onClick={onClose}
          aria-label="Close search"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            border: `1px solid ${C.glassBd}`,
            color: C.c3,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={18} />
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '12px 16px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        <FilterChip
          active={yearFilter === 'all'}
          onClick={() => setYearFilter('all')}
          label="All years"
        />
        {years.map((y) => (
          <FilterChip
            key={y}
            active={yearFilter === y}
            onClick={() => setYearFilter(y)}
            label={String(y)}
          />
        ))}
        <FilterChip
          active={featuredOnly}
          onClick={() => setFeaturedOnly((v) => !v)}
          label="Featured"
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>
        {filtered.length === 0 ? (
          <p
            style={{
              textAlign: 'center',
              padding: '40px 0',
              fontFamily: 'var(--font-inter,sans-serif)',
              fontSize: 14,
              color: C.c3,
            }}
          >
            No moments match your search
          </p>
        ) : (
          filtered.map(({ m, idx }) => (
            <button
              key={m.id}
              onClick={() => {
                onSelect(idx);
                onClose();
              }}
              style={{
                width: '100%',
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                padding: '12px 0',
                background: 'none',
                border: 'none',
                borderBottom: `1px solid ${C.glassBd}`,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <img
                src={`https://img.youtube.com/vi/${m.youtube_id}/mqdefault.jpg`}
                alt=""
                style={{
                  width: 72,
                  height: 48,
                  borderRadius: 8,
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontFamily: 'var(--font-inter,sans-serif)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.cream,
                    marginBottom: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {m.title}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-inter,sans-serif)',
                    fontSize: 11,
                    color: C.c3,
                  }}
                >
                  {m.event_name}
                  {m.year != null ? ` · ${m.year}` : ''}
                  {m.is_featured ? ' · Featured' : ''}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0,
        padding: '6px 14px',
        borderRadius: 20,
        border: `1px solid ${active ? 'rgba(200,146,42,0.5)' : C.glassBd}`,
        background: active ? C.goldDim : 'rgba(255,255,255,0.06)',
        color: active ? C.gold : C.c3,
        fontFamily: 'var(--font-dm-mono,monospace)',
        fontSize: 9,
        letterSpacing: '1px',
        textTransform: 'uppercase',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
