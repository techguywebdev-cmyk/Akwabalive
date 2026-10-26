'use client';

import Link from 'next/link';
import { Repeat } from 'lucide-react';
import type { GhanaEvent } from '@/lib/types';
import { seriesForEvent } from '@/lib/data/series';
import { FollowPill } from '@/components/artists/parts';
import { T, FONT } from '@/lib/thiscene';

/** "Part of Rapperholic · Follow" on an event page, when the event is an edition of a series */
export default function PartOfSeries({ event }: { event: Pick<GhanaEvent, 'title' | 'description'> }) {
  const s = seriesForEvent(event);
  if (!s) return null;
  return (
    <Link href={`/shows/${s.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 28, textDecoration: 'none' }}>
      <span style={{ width: 44, height: 44, borderRadius: 22, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(123,227,168,0.12)', color: T.mintText }}>
        <Repeat size={19} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 13, color: T.text3 }}>Part of</span>
        <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT.display, fontSize: 17, fontWeight: 700, color: T.white }}>{s.name}</span>
      </span>
      <FollowPill kind="series" slug={s.slug} label={s.name} />
    </Link>
  );
}
