'use client';

import Link from 'next/link';
import type { GhanaEvent } from '@/lib/types';
import { resolveLineupNames } from '@/components/ui/LineupChips';
import { artistForName } from '@/lib/data/artists';
import { useArtistPhotos } from '@/hooks/useArtistPhotos';
import { FONT } from '@/lib/thiscene';

/** The confirmed line-up as a row of round faces with names, for the feed card (only acts we have a photo of) */
export default function LineupFaces({ event, size = 34 }: { event: GhanaEvent; size?: number }) {
  const acts = resolveLineupNames(event)
    .map((name) => ({ name, slug: artistForName(name)?.slug }))
    .filter((x): x is { name: string; slug: string } => !!x.slug);
  const photos = useArtistPhotos(acts.map((x) => x.slug));
  const shown = acts.filter((x) => photos[x.slug]);
  if (!shown.length) return null;
  const faces = shown.slice(0, 4);
  const names = shown.length <= 2 ? shown.map((x) => x.name).join(' & ') : `${shown[0].name}, ${shown[1].name} +${shown.length - 2}`;
  const href = shown.length === 1 ? `/artists/${shown[0].slug}` : `/events/${event.slug}`;
  return (
    <Link href={href} aria-label={`Line-up: ${shown.map((x) => x.name).join(', ')}`}
      style={{ alignSelf: 'flex-start', pointerEvents: 'auto', display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', maxWidth: '100%' }}>
      <span style={{ display: 'inline-flex', flexShrink: 0 }}>
        {faces.map((x, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={x.slug} src={photos[x.slug]!} alt="" width={size} height={size} loading="lazy"
            style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block', marginLeft: i ? -size * 0.3 : 0, boxShadow: '0 0 0 2px rgba(6,12,9,0.9)', position: 'relative', zIndex: faces.length - i }} />
        ))}
      </span>
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: FONT.sans, fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.92)', textShadow: '0 1px 10px rgba(0,0,0,0.6)' }}>{names}</span>
    </Link>
  );
}
