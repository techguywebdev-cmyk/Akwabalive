'use client';
import { C } from '@/lib/theme';

import { majorArtists } from '@/lib/data/artists';

export type LineupValue = {
  /** false = house party / no billed acts — hide picker & clear data on save */
  enabled: boolean;
  artistSlugs: string[];
  /** Extra names not in the major list */
  extraNames: string;
};

export const emptyLineup = (): LineupValue => ({
  enabled: false,
  artistSlugs: [],
  extraNames: '',
});

export default function LineupPicker({
  value,
  onChange,
}: {
  value: LineupValue;
  onChange: (v: LineupValue) => void;
}) {
  const setEnabled = (enabled: boolean) => {
    if (!enabled) {
      onChange({ enabled: false, artistSlugs: [], extraNames: '' });
    } else {
      onChange({ ...value, enabled: true });
    }
  };

  const toggle = (slug: string) => {
    const has = value.artistSlugs.includes(slug);
    onChange({
      ...value,
      enabled: true,
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
        Only for concerts and festivals with named acts. Skip this for house
        parties, pool parties, club nights without a public bill, etc.
      </p>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => setEnabled(false)}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 8,
            border: `1px solid ${!value.enabled ? C.goldBd : C.bd}`,
            background: !value.enabled ? C.goldDim : 'transparent',
            color: !value.enabled ? C.gold : C.c2,
            fontFamily: 'var(--font-dm-mono,monospace)',
            fontSize: 9,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          No lineup
        </button>
        <button
          type="button"
          onClick={() => setEnabled(true)}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 8,
            border: `1px solid ${value.enabled ? C.goldBd : C.bd}`,
            background: value.enabled ? C.goldDim : 'transparent',
            color: value.enabled ? C.gold : C.c2,
            fontFamily: 'var(--font-dm-mono,monospace)',
            fontSize: 9,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Add billed artists
        </button>
      </div>

      {!value.enabled && (
        <p
          style={{
            fontFamily: 'var(--font-inter,sans-serif)',
            fontSize: 12,
            color: C.c3,
            margin: 0,
          }}
        >
          No artists will show on the event page or in the artist filter.
        </p>
      )}

      {value.enabled && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
              onChange={(e) =>
                onChange({ ...value, extraNames: e.target.value })
              }
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
              <span style={{ color: C.gold }}>On the bill:</span>{' '}
              {preview.join(' · ')}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/** Build DB fields from picker value. Empty when lineup is disabled. */
export function lineupPayload(value: LineupValue): {
  artist_slugs: string[] | null;
  lineup: string[] | null;
} {
  if (!value.enabled) {
    return { artist_slugs: null, lineup: null };
  }

  const fromMajor = majorArtists
    .filter((a) => value.artistSlugs.includes(a.slug))
    .map((a) => a.name);
  const extras = value.extraNames
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const lineup: string[] = [];
  for (const n of [...fromMajor, ...extras]) {
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    lineup.push(n);
  }

  if (!lineup.length && !value.artistSlugs.length) {
    return { artist_slugs: null, lineup: null };
  }

  return {
    artist_slugs: value.artistSlugs.length ? [...value.artistSlugs] : null,
    lineup: lineup.length ? lineup : null,
  };
}
