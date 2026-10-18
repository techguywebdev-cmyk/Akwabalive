'use client';
import { C } from '@/lib/theme';

import type { GhanaEvent } from '@/lib/types';
import { getArtistBySlug } from '@/lib/data/artists';

/** Resolve display names: prefer lineup, else map artistSlugs to names */
export function resolveLineupNames(event: Pick<GhanaEvent, 'lineup' | 'artistSlugs'>): string[] {
  if (event.lineup?.length) return event.lineup;
  if (event.artistSlugs?.length) {
    return event.artistSlugs
      .map((s) => getArtistBySlug(s)?.name ?? s)
      .filter(Boolean);
  }
  return [];
}

export function LineupChips({
  event,
  max = 4,
  compact = false,
}: {
  event: Pick<GhanaEvent, 'lineup' | 'artistSlugs'>;
  max?: number;
  compact?: boolean;
}) {
  const names = resolveLineupNames(event);
  if (!names.length) return null;

  const shown = names.slice(0, max);
  const more = names.length - shown.length;

  if (compact) {
    return (
      <p
        style={{
          fontFamily: 'var(--font-inter,sans-serif)',
          fontSize: 10,
          color: C.c2,
          margin: '0 0 6px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: C.gold }}>Lineup</span>
        {' · '}
        {shown.join(', ')}
        {more > 0 ? ` +${more}` : ''}
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {shown.map((name) => {
        return (
          <span
            key={name}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              borderRadius: 999,
              border: `1px solid ${C.goldBd}`,
              background: C.goldDim,
              color: C.gold,
              fontFamily: 'var(--font-dm-mono,monospace)',
              fontSize: 10,
              letterSpacing: '0.5px',
            }}
          >
            {name}
          </span>
        );
      })}
      {more > 0 && (
        <span
          style={{
            fontFamily: 'var(--font-dm-mono,monospace)',
            fontSize: 10,
            color: C.c3,
            alignSelf: 'center',
          }}
        >
          +{more} more
        </span>
      )}
    </div>
  );
}

export function LineupSection({
  event,
}: {
  event: Pick<GhanaEvent, 'lineup' | 'artistSlugs'>;
}) {
  const names = resolveLineupNames(event);
  if (!names.length) return null;

  return (
    <div style={{ marginTop: 36 }}>
      <p
        style={{
          fontFamily: 'var(--font-dm-mono,monospace)',
          fontSize: 10,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: C.gold,
          opacity: 0.75,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{ display: 'block', width: 16, height: 1, background: C.gold }}
        />
        On the bill
      </p>
      <LineupChips event={event} max={12} />
    </div>
  );
}
