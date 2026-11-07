'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Tapping a moment anywhere opens the Moments page at that clip (back returns here), instead of a popup
 * player, so people find the rest of Moments. Pass the picked clip's id; `done` clears the pick.
 */
export function useOpenInMoments(id: string | number | null | undefined, done: () => void) {
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    if (id === null || id === undefined) return;
    router.push(`/moments?id=${id}&from=${encodeURIComponent(path || '/')}`);
    done();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
}
