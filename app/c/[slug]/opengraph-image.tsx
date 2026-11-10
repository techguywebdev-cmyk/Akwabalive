import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'A calendar on Akwaaba';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const displayFont = () => fetch(new URL('../../../assets/InterTight-800.woff', import.meta.url)).then((r) => r.arrayBuffer()).catch(() => null);

async function rest<T>(path: string): Promise<T | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const r = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 300 } }).catch(() => null);
  return r && r.ok ? ((await r.json()) as T) : null;
}

/** Share card for a calendar: the name, who made it, and its flyers fanned on the right */
export default async function OG({ params }: { params: { slug: string } }) {
  const [font, rows] = await Promise.all([
    displayFont(),
    rest<{ title: string; profiles: { full_name: string | null; username: string | null } | null; calendar_events: { event_slug: string }[] }[]>(
      `calendars?select=title,profiles(full_name,username),calendar_events(event_slug)&slug=eq.${encodeURIComponent(params.slug)}&is_public=eq.true&limit=1`),
  ]);
  const c = rows?.[0];
  const slugs = c?.calendar_events.map((e) => e.event_slug) ?? [];
  const evs = slugs.length ? await rest<{ image_url: string | null }[]>(`events?select=image_url&slug=in.(${slugs.map(encodeURIComponent).join(',')})&image_url=not.is.null&order=date&limit=3`) : null;
  const flyers = (evs ?? []).map((e) => e.image_url!).filter(Boolean);
  const who = params.slug.startsWith('akwaaba-') ? 'Akwaaba' : c?.profiles?.full_name || c?.profiles?.username || 'Someone';
  const title = c?.title ?? 'A calendar on Akwaaba';

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', padding: 72, fontFamily: font ? 'Inter Tight' : undefined,
        background: 'radial-gradient(70% 70% at 80% 30%, rgba(60,170,110,0.35) 0%, rgba(40,130,85,0) 70%), linear-gradient(180deg, #0B140F 0%, #050806 100%)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: flyers.length ? 600 : 1056 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <svg width="56" height="56" viewBox="0 0 24 24">
              <rect x="1" y="1" width="22" height="22" rx="7" fill="#7BE3A8" />
              <path d="M10.5 5.5v9.5a3.2 3.2 0 0 0 3.2 3.2h1.8" fill="none" stroke="#03130B" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M7.5 9.5h8" fill="none" stroke="#03130B" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1, color: '#fff' }}>tsacoal</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <span style={{ fontSize: 26, letterSpacing: 4, textTransform: 'uppercase', color: '#A8F0C6' }}>{who}’s calendar</span>
            <span style={{ fontSize: title.length > 26 ? 64 : 80, fontWeight: 800, letterSpacing: -3, lineHeight: 1.0, color: '#fff' }}>{title}</span>
            <span style={{ fontSize: 30, color: 'rgba(255,255,255,0.6)' }}>{slugs.length} {slugs.length === 1 ? 'show' : 'shows'} · Like it, rate it, make your own</span>
          </div>
        </div>
        {flyers.length > 0 && (
          <div style={{ display: 'flex', position: 'relative', width: 456, height: 486 }}>
            {flyers.map((f, i) => {
              const off = i - (flyers.length - 1) / 2;
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={f} src={f} alt="" width={250} height={333} style={{ position: 'absolute', left: 103 + off * 110, top: 70 + Math.abs(off) * 20, width: 250, height: 333, objectFit: 'cover', borderRadius: 22, transform: `rotate(${off * 8}deg)`, boxShadow: '0 30px 60px rgba(0,0,0,0.6)' }} />
              );
            })}
          </div>
        )}
      </div>
    ),
    { ...size, ...(font ? { fonts: [{ name: 'Inter Tight', data: font, weight: 800 as const, style: 'normal' as const }] } : {}) },
  );
}
