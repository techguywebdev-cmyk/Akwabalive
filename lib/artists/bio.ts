import type { Artist } from '@/lib/types';

export type ArtistBio = { description: string | null; text: string; url: string };

const UA = 'AkwaabaEvents/1.0 (https://tsacoal.com; techguywebdev@gmail.com)';

/** The opening of the artist's Wikipedia article (cached for a day); null when there isn't a real one */
export async function getArtistBio(artist: Pick<Artist, 'wiki'>, ms = 2500): Promise<ArtistBio | null> {
  if (!artist.wiki) return null;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(artist.wiki.replace(/ /g, '_'))}?redirect=true`, {
      headers: { 'User-Agent': UA, 'Api-User-Agent': UA }, signal: ctl.signal, next: { revalidate: 86400 },
    });
    if (!r.ok) return null;
    const j = await r.json() as { type?: string; description?: string; extract?: string; content_urls?: { desktop?: { page?: string } } };
    if (j.type === 'disambiguation' || !j.extract || j.extract.length < 60) return null;
    // Only keep it if it's about a musician, not a namesake
    if (!/(singer|rapper|musician|songwriter|producer|artist|band|duo|group|DJ|disc jockey|record|music|vocalist|gospel|hip hop|highlife|afrobeats|dancehall|reggae)/i.test(`${j.description ?? ''} ${j.extract}`)) return null;
    return {
      description: j.description ? j.description.charAt(0).toUpperCase() + j.description.slice(1) : null,
      text: j.extract,
      url: j.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(artist.wiki.replace(/ /g, '_'))}`,
    };
  } catch { return null; } finally { clearTimeout(t); }
}
