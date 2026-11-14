/** A film showing (cinema release, premiere, screening) rather than a live show: it has a cast, not a line-up */
export function isFilm(e: { title?: string | null; venue?: string | null; description?: string | null; flyerText?: string | null }): boolean {
  const near = `${e.title ?? ''} ${e.venue ?? ''}`;
  if (/\b(cinemas?|movie|film|premiere|screening)\b/i.test(near)) return true;
  return /\b(a .{2,60} film\b|film by|in cinemas|showing nationwide|movie premiere|box office)\b/i.test(`${e.description ?? ''} ${e.flyerText ?? ''}`);
}
