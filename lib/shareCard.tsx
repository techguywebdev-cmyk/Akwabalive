/* Shared pieces for the share-card pictures (rendered with next/og on the edge) */

export async function rest<T>(path: string): Promise<T | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const r = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' }).catch(() => null);
  return r && r.ok ? ((await r.json()) as T) : null;
}

export type Person = { full_name: string | null; username: string; avatar_url: string | null };

export const person = async (u: string | null) =>
  u ? ((await rest<Person[]>(`profiles?select=full_name,username,avatar_url&username=eq.${encodeURIComponent(u)}&limit=1`))?.[0] ?? null) : null;

export const firstName = (p: Person) => {
  const n = (p.full_name || p.username).split(/\s+/)[0];
  return n.charAt(0).toUpperCase() + n.slice(1);
};

export const cleanUser = (v: string | null) => v?.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 40) || null;

/**
 * Images at the size the card needs: Cloudinary resizes itself; everything else goes through this site's image
 * resizer (cached), so a 3 MB flyer becomes a small JPEG before it's drawn. Pass the request URL for the origin.
 */
let ORIGIN = 'https://tsacoal.com';
export const setOrigin = (reqUrl: string) => { try { ORIGIN = new URL(reqUrl).origin; } catch { /* keep */ } };
export const sized = (u: string, w: number) => {
  if (u.startsWith('data:')) return u;
  if (u.includes('res.cloudinary.com')) return u.replace('/upload/', `/upload/w_${w},c_limit,f_jpg,q_75/`);
  const abs = u.startsWith('/') ? `${ORIGIN}${u}` : u;
  const width = [640, 750, 828, 1080].find((x) => x >= w) ?? 1080;
  return `${ORIGIN}/_next/image?url=${encodeURIComponent(abs)}&w=${width}&q=72`;
};

export const MINT = '#7BE3A8', MINT_TEXT = '#A8F0C6', ON_MINT = '#03130B', PAPER = '#F3FBF6', INK = '#0B110E';

/* The brand gradients (same as the app) */
export const G_MINT = 'linear-gradient(135deg, #D2FBE3 0%, #8FEBB7 34%, #5AD99A 68%, #2FB97E 100%)';
export const G_TEXT = 'linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 38%, #BFF5D6 72%, #7BE3A8 100%)';
export const G_TICKET = 'linear-gradient(160deg, rgba(28,58,42,0.96) 0%, rgba(12,22,17,0.95) 42%, rgba(7,12,9,0.96) 100%)';
/** Text painted with a gradient */
export const gText = (g: string) => ({ backgroundImage: g, backgroundClip: 'text', color: 'transparent' } as const);

export const dayParts = (date: string) => {
  const d = new Date(`${date}T12:00:00Z`);
  return {
    day: d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }).toUpperCase(),
    num: d.getUTCDate(),
    month: d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }).toUpperCase(),
  };
};

/** The picture behind everything: the flyer or photo itself, huge and dark, so every card takes the show's colours */
export function Backdrop({ src, w, h, strength = 0.55 }: { src: string | null; w: number; h: number; strength?: number }) {
  return (
    <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, width: w, height: h, background: '#070B09' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img src={src} alt="" width={w * 1.6} height={h * 1.6} style={{ position: 'absolute', top: -h * 0.3, left: -w * 0.3, width: w * 1.6, height: h * 1.6, objectFit: 'cover', opacity: strength }} />}
      <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, width: w, height: h, background: 'linear-gradient(180deg, rgba(5,8,6,0.72) 0%, rgba(5,8,6,0.5) 30%, rgba(5,8,6,0.82) 62%, rgba(5,8,6,0.97) 100%)' }} />
    </div>
  );
}

/** "Leo's going": their face on a dark pill, mint ring, the line in white and mint */
export function PersonPill({ p, line, tail, scale = 1 }: { p: Person; line: string; tail?: string; scale?: number }) {
  const s = (n: number) => Math.round(n * scale);
  const name = firstName(p);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: s(18), padding: `${s(10)}px ${s(30)}px ${s(10)}px ${s(10)}px`, borderRadius: 999, background: 'linear-gradient(135deg, rgba(28,58,42,0.85) 0%, rgba(8,13,10,0.8) 60%)', border: `${s(2)}px solid rgba(123,227,168,0.35)` }}>
      {p.avatar_url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={p.avatar_url} alt="" width={s(68)} height={s(68)} style={{ width: s(68), height: s(68), borderRadius: 999, objectFit: 'cover', border: `${s(3)}px solid ${MINT}` }} />
        : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: s(68), height: s(68), borderRadius: 999, background: '#16211C', border: `${s(3)}px solid ${MINT}`, color: '#fff', fontSize: s(32) }}>{name.charAt(0)}</div>}
      <div style={{ display: 'flex', fontSize: s(36), letterSpacing: -1, color: '#fff' }}>{line}</div>
      {tail && <div style={{ display: 'flex', fontSize: s(36), letterSpacing: -1, marginLeft: -s(6), ...gText(G_MINT) }}>{tail}</div>}
    </div>
  );
}

/** A quiet "going" mark: their photo, a dashed seat with a + beside it, and a short caption. */
export function GoingMark({ p, scale = 1, ring = MINT }: { p: Person; scale?: number; ring?: string }) {
  const s = (n: number) => Math.round(n * scale);
  const name = firstName(p);
  const d = s(64);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: s(14) }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {p.avatar_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={p.avatar_url} alt="" width={d} height={d} style={{ width: d, height: d, borderRadius: 999, objectFit: 'cover', border: `${s(3)}px solid ${ring}` }} />
          : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: d, height: d, borderRadius: 999, background: '#16211C', border: `${s(3)}px solid ${ring}`, color: '#fff', fontSize: s(30) }}>{name.charAt(0)}</div>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: d, height: d, marginLeft: -s(16), borderRadius: 999, background: 'rgba(0,0,0,0.35)', border: `${s(3)}px dashed rgba(255,255,255,0.7)`, color: '#fff', fontSize: s(38), lineHeight: 1 }}>+</div>
      </div>
      <div style={{ display: 'flex', fontSize: s(24), letterSpacing: s(3), color: 'rgba(255,255,255,0.85)' }}>{`${name.toUpperCase()}’S GOING`}</div>
    </div>
  );
}

export const fontFile =(rel: string) => fetch(new URL(rel, import.meta.url)).then((r) => r.arrayBuffer()).catch(() => null);
