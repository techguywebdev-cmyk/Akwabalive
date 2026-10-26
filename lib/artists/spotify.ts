/**
 * Spotify artist lookups (Client Credentials flow — no user sign-in).
 * Needs SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET; without them every lookup returns nothing.
 * Spotify's terms let us show artist images as long as we credit and link back to Spotify.
 */

export type SpotifyArtist = { id: string; url: string; image: string | null; followers: number | null; popularity: number | null };

let token: { value: string; expires: number } | null = null;

async function getToken(signal: AbortSignal): Promise<string | null> {
  const id = process.env.SPOTIFY_CLIENT_ID, secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (token && token.expires > Date.now() + 60_000) return token.value;
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST', signal, cache: 'no-store',
    headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) { console.warn('[spotify] token failed', r.status); return null; }
  const j = await r.json();
  token = { value: j.access_token, expires: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return token.value;
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');

/** The Spotify artist whose name matches exactly (the most-followed one if several do) */
async function findOne(name: string, auth: string, signal: AbortSignal): Promise<SpotifyArtist | null> {
  const q = encodeURIComponent(`artist:"${name}"`);
  const r = await fetch(`https://api.spotify.com/v1/search?type=artist&limit=10&q=${q}`, { headers: { Authorization: `Bearer ${auth}` }, signal, cache: 'no-store' });
  if (!r.ok) { console.warn('[spotify] search failed', r.status, name); return null; }
  const items: Array<{ id: string; name: string; external_urls?: { spotify?: string }; images?: { url: string; width?: number }[]; followers?: { total?: number }; popularity?: number }> =
    (await r.json())?.artists?.items ?? [];
  const exact = items.filter((a) => norm(a.name) === norm(name)).sort((a, b) => (b.followers?.total ?? 0) - (a.followers?.total ?? 0));
  const a = exact[0];
  if (!a) return null;
  const img = [...(a.images ?? [])].sort((x, y) => (y.width ?? 0) - (x.width ?? 0))[0];
  return { id: a.id, url: a.external_urls?.spotify ?? `https://open.spotify.com/artist/${a.id}`, image: img?.url ?? null, followers: a.followers?.total ?? null, popularity: a.popularity ?? null };
}

/** Look up several artists by name. Returns null when Spotify isn't set up or the lookup failed. */
export async function lookupSpotify(names: { slug: string; name: string }[], ms: number): Promise<Map<string, SpotifyArtist | null> | null> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const auth = await getToken(ctl.signal);
    if (!auth) return null;
    const out = new Map<string, SpotifyArtist | null>();
    await Promise.all(names.map(async ({ slug, name }) => {
      try { out.set(slug, await findOne(name, auth, ctl.signal)); } catch { /* leave unset: retried next time */ }
    }));
    return out;
  } catch (e) { console.warn('[spotify] lookup failed', String(e)); return null; } finally { clearTimeout(t); }
}

export const spotifyConfigured = () => !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
