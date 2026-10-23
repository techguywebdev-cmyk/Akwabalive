/**
 * Ask image hosts for a copy sharp enough for a full-width flyer on a 3× phone screen.
 * Only rewrites hosts that take a size in the URL; anything else is left as uploaded.
 */
export function hiRes(src?: string | null, width = 1600): string | null {
  if (!src) return null;
  try {
    const u = new URL(src);
    if (u.hostname === 'images.unsplash.com') {
      u.searchParams.set('w', String(width));
      u.searchParams.set('q', '85');
      return u.toString();
    }
    // Supabase Storage image transforms (/render/image/) take width/quality too
    if (u.pathname.includes('/storage/v1/render/image/')) {
      u.searchParams.set('width', String(width));
      u.searchParams.set('quality', '85');
      return u.toString();
    }
    return src;
  } catch {
    return src;
  }
}
