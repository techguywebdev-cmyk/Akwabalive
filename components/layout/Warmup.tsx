'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PrefetchKind } from 'next/dist/client/components/router-reducer/router-reducer-types';
import { prefetchMoments } from '@/hooks/useMoments';
import { prefetchUpcoming } from '@/hooks/useNextEdition';

// The places people go from the first page; loaded ahead so tapping them opens straight away
const PAGES = ['/', '/events', '/moments', '/calendars', '/december', '/shows', '/artists'];

/**
 * Once the first page has loaded and the phone is idle, quietly fetch the main pages and the Moments feed
 * (with the first clips' pictures), so moving around the site doesn't show loading screens.
 * Skipped on slow or data-saver connections.
 */
export default function Warmup() {
  const router = useRouter();
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? '')) return;
    const idle = (fn: () => void, wait: number) => {
      const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
      const t = setTimeout(() => (w.requestIdleCallback ? w.requestIdleCallback(fn, { timeout: 2000 }) : fn()), wait);
      return () => clearTimeout(t);
    };
    const here = window.location.pathname;
    const stops = [
      // Data first: the Moments feed and its first pictures, and the shows coming up
      idle(() => {
        prefetchMoments().then((rows) => {
          (rows ?? []).slice(0, 4).forEach((m) => { const img = new Image(); img.src = `https://i.ytimg.com/vi/${m.youtube_id}/hqdefault.jpg`; });
        });
        prefetchUpcoming();
      }, 1200),
      // Then the pages themselves, in full
      idle(() => { PAGES.filter((p) => p !== here).forEach((p) => router.prefetch(p, { kind: PrefetchKind.FULL })); }, 2500),
    ];
    return () => stops.forEach((s) => s());
  }, [router]);
  return null;
}
