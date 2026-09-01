'use client';

import { majorArtists } from '@/lib/data/artists';

const C = {
  bg2: '#141109',
  bg3: '#1C1710',
  gold: '#C8922A',
  goldDim: 'rgba(200,146,42,0.14)',
  goldBd: 'rgba(200,146,42,0.28)',
  cream: '#F5ECD7',
  c2: 'rgba(245,236,215,0.55)',
  c3: 'rgba(245,236,215,0.24)',
  bd: 'rgba(245,236,215,0.07)',
  bd2: 'rgba(245,236,215,0.13)',
};

export type LineupValue = {
  artistSlugs: string[];
  /** Extra names not in the major list */
  extraNames: string;
};

export default function LineupPicker({
  value,
  onChange,
}: {
  value: LineupValue;
  onChange: (v: LineupValue) => void;
}) {
  const toggle = (slug: string) => {
    const has = value.artistSlugs.includes(slug);
    onChange({
      ...value,
      artistSlugs: has
        ? value.artistSlugs.filter((s) => s !== slug)
        : [...value.artistSlugs, slug],
    });
  };

  const selectedNames = majorArtists
    .filter((a) => value.artistSlugs.includes(a.slug))
    .map((a) => a.name);
  const extras = value.extraNames
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const preview = [...selectedNames, ...extras];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p
        style={{
          fontFamily: 'var(--font-inter,sans-serif)',
          fontSize: 12,
          color: C.c2,
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        Tap every act on the bill — headliners and supporting. This powers the
        artist filter (e.g. Sarkodie on a festival still shows under Sarkodie).
      </p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {majorArtists.map((a) => {
          const on = value.artistSlugs.includes(a.slug);
          return (
            <button
              key={a.slug}
              type="button"
              onClick={() => toggle(a.slug)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px 6px 6px',
                borderRadius: 999,
                border: `1px solid ${on ? C.goldBd : C.bd}`,
                background: on ? C.goldDim : C.bg3,
                cursor: 'pointer',
                color: on ? C.gold : C.c2,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.image}
                alt=""
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-dm-mono,monospace)',
                  fontSize: 9,
                  letterSpacing: '0.5px',
                }}
              >
                {a.name}
              </span>
            </button>
          );
        })}
      </div>

      <div>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-dm-mono,monospace)',
            fontSize: 8,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: C.c3,
            marginBottom: 6,
          }}
        >
          Other acts (comma-separated)
        </label>
        <input
          type="text"
          value={value.extraNames}
          onChange={(e) => onChange({ ...value, extraNames: e.target.value })}
          placeholder="e.g. Joey B, Darkovibes"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: C.bg3,
            border: `1px solid ${C.bd}`,
            borderRadius: 8,
            padding: '10px 12px',
            color: C.cream,
            fontFamily: 'var(--font-inter,sans-serif)',
            fontSize: 13,
            outline: 'none',
          }}
        />
      </div>

      {preview.length > 0 && (
        <p
          style={{
            fontFamily: 'var(--font-inter,sans-serif)',
            fontSize: 12,
            color: C.c2,
            margin: 0,
          }}
        >
          <span style={{ color: C.gold }}>On the bill:</span> {preview.join(' · ')}
        </p>
      )}
    </div>
  );
}

/** Build DB fields from picker value */
export function lineupPayload(value: LineupValue): {
  artist_slugs: string[];
  lineup: string[];
} {
  const fromMajor = majorArtists
    .filter((a) => value.artistSlugs.includes(a.slug))
    .map((a) => a.name);
  const extras = value.extraNames
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  // Dedupe case-insensitive
  const seen = new Set<string>();
  const lineup: string[] = [];
  for (const n of [...fromMajor, ...extras]) {
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    lineup.push(n);
  }
  return {
    artist_slugs: [...value.artistSlugs],
    lineup,
  };
}
