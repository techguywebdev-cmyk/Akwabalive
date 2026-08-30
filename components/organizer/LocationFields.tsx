'use client';

import { MapPin } from 'lucide-react';
import { placesForCity, matchPlace, type Place } from '@/lib/places';

const C = {
  bg3: '#1C1710',
  gold: '#C8922A', goldDim: 'rgba(200,146,42,0.14)', goldBd: 'rgba(200,146,42,0.28)',
  cream: '#F5ECD7', c2: 'rgba(245,236,215,0.55)', c3: 'rgba(245,236,215,0.24)',
  bd: 'rgba(245,236,215,0.07)', greenL: '#4ade80',
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: C.bg3, border: `1px solid ${C.bd}`,
  borderRadius: 8, padding: '12px 14px',
  fontFamily: 'var(--font-inter,sans-serif)', fontSize: 14,
  color: C.cream, outline: 'none',
};

export default function LocationFields({
  city, venue, area, lat, lng,
  onChange,
}: {
  city: string;
  venue: string;
  area: string;
  lat: number | null;
  lng: number | null;
  onChange: (next: { area: string; lat: number; lng: number }) => void;
}) {
  const places = placesForCity(city);
  const guessed = !area ? matchPlace(venue, city) : null;

  function pick(p: Place) {
    onChange({ area: p.area, lat: p.lat, lng: p.lng });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{
        fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px',
        textTransform: 'uppercase', color: C.gold, opacity: 0.75, display: 'flex', alignItems: 'center', gap: 8, margin: 0,
      }}>
        <MapPin size={11} /> Neighbourhood pin
      </p>
      <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: C.c3, margin: 0, lineHeight: 1.5 }}>
        Pick the area so events in Dansoman and near-me actually work. This is the pin, not the venue name.
      </p>

      {guessed && (
        <button
          type="button"
          onClick={() => pick(guessed)}
          style={{
            textAlign: 'left', background: C.goldDim, border: `1px solid ${C.goldBd}`,
            color: C.gold, borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
            fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13,
          }}
        >
          Use <strong>{guessed.label}</strong> from the venue text
        </button>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {places.map(p => {
          const active = area === p.area;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p)}
              style={{
                fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '1px',
                textTransform: 'uppercase', padding: '7px 12px', borderRadius: 999, cursor: 'pointer',
                border: `1px solid ${active ? C.goldBd : C.bd}`,
                background: active ? C.goldDim : 'transparent',
                color: active ? C.gold : C.c3,
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {lat != null && lng != null && area ? (
        <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 10, color: C.greenL, margin: 0 }}>
          Pinned · {area} · {lat.toFixed(4)}, {lng.toFixed(4)}
        </p>
      ) : (
        <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: C.c2, margin: 0 }}>
          No pin yet — near-me will guess Accra centre.
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, marginBottom: 8 }}>Area</label>
          <input
            value={area}
            onChange={e => onChange({ area: e.target.value, lat: lat ?? 0, lng: lng ?? 0 })}
            placeholder="Dansoman"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, marginBottom: 8 }}>Lat</label>
          <input
            type="number" step="0.0001"
            value={lat ?? ''}
            onChange={e => onChange({ area, lat: parseFloat(e.target.value) || 0, lng: lng ?? 0 })}
            placeholder="5.5520"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, marginBottom: 8 }}>Lng</label>
          <input
            type="number" step="0.0001"
            value={lng ?? ''}
            onChange={e => onChange({ area, lat: lat ?? 0, lng: parseFloat(e.target.value) || 0 })}
            placeholder="-0.2700"
            style={inputStyle}
          />
        </div>
      </div>
    </div>
  );
              }
