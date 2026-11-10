import { ImageResponse } from 'next/og';
import { ticketDial } from '@/lib/events/dial';

export const runtime = 'edge';

const displayFont = () => fetch(new URL('../../../../assets/InterTight-800.woff', import.meta.url)).then((r) => r.arrayBuffer()).catch(() => null);

async function rest<T>(path: string): Promise<T | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const r = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' }).catch(() => null);
  return r && r.ok ? ((await r.json()) as T) : null;
}

type Row = {
  slug: string; title: string; date: string; time: string | null; venue: string | null; city: string | null; image_url: string | null;
  artist_slugs: string[] | null; lineup: string[] | null; ticket_source: string | null; description: string | null; flyer_text: string | null; listing_info: unknown;
};

/** Cloudinary flyers at a sensible size; others as they are */
const sized = (u: string, w: number) => (u.includes('res.cloudinary.com') ? u.replace('/upload/', `/upload/w_${w},c_limit,f_jpg/`) : u);

const MINT = '#7BE3A8', MINT_TEXT = '#A8F0C6', ON_MINT = '#03130B';
const GROUND = 'radial-gradient(90% 40% at 15% 0%, rgba(70,220,150,0.32) 0%, rgba(70,220,150,0) 100%), radial-gradient(70% 35% at 95% 100%, rgba(40,190,200,0.20) 0%, rgba(40,190,200,0) 100%), linear-gradient(180deg, #0C1611 0%, #070B09 60%, #050606 100%)';

/**
 * A show as a picture to share: story size (1080×1920) by default, or link-preview size with ?format=og.
 * With ?u=username it's personal: their face and "Leo's going".
 */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const q = new URL(req.url).searchParams;
  const og = q.get('format') === 'og';
  const u = q.get('u')?.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 40) || null;

  const [font, rows, people] = await Promise.all([
    displayFont(),
    rest<Row[]>(`events?select=slug,title,date,time,venue,city,image_url,artist_slugs,lineup,ticket_source,description,flyer_text,listing_info&slug=eq.${encodeURIComponent(params.slug)}&limit=1`),
    u ? rest<{ full_name: string | null; username: string; avatar_url: string | null }[]>(`profiles?select=full_name,username,avatar_url&username=eq.${encodeURIComponent(u)}&limit=1`) : Promise.resolve(null),
  ]);
  const e = rows?.[0];
  if (!e) return new Response('Not found', { status: 404 });
  const person = people?.[0] ?? null;
  const first = person ? (([(person.full_name || person.username).split(/\s+/)[0]].map((n) => n.charAt(0).toUpperCase() + n.slice(1)))[0]) : null;

  const slugs = (e.artist_slugs ?? []).slice(0, 4);
  const faces = slugs.length
    ? ((await rest<{ slug: string; spotify_image: string | null; photo_url: string | null }[]>(`artist_profiles?select=slug,spotify_image,photo_url&slug=in.(${slugs.map((s) => `"${s}"`).map(encodeURIComponent).join(',')})`)) ?? [])
      .map((a) => a.spotify_image || a.photo_url).filter((x): x is string => !!x)
    : [];
  const names = (e.lineup ?? []).slice(0, 3);
  const acts = names.length ? names.join(' · ') + ((e.lineup?.length ?? 0) > 3 ? ` +${(e.lineup!.length - 3)}` : '') : null;

  const d = new Date(`${e.date}T12:00:00Z`);
  const day = d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }).toUpperCase();
  const dateNum = d.getUTCDate();
  const month = d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }).toUpperCase();
  const time = e.time && !/tba|tbc/i.test(e.time) ? e.time : null;
  const place = [e.venue && !/to be announced|tba/i.test(e.venue) ? e.venue : null, e.city ? e.city.charAt(0).toUpperCase() + e.city.slice(1) : null].filter(Boolean).join(', ');
  const dial = ticketDial({ ticketSource: e.ticket_source ?? undefined, description: e.description ?? '', listingInfo: e.listing_info as Parameters<typeof ticketDial>[0]['listingInfo'], flyerText: e.flyer_text ?? undefined });
  const flyer = e.image_url ? sized(e.image_url, og ? 700 : 1080) : null;
  const titleSize = (base: number) => (e.title.length > 34 ? base * 0.72 : e.title.length > 22 ? base * 0.85 : base);

  const W = og ? 1200 : 1080, H = og ? 630 : 1920;

  const who = person ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: og ? 14 : 20 }}>
      {person.avatar_url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={person.avatar_url} alt="" width={og ? 52 : 76} height={og ? 52 : 76} style={{ width: og ? 52 : 76, height: og ? 52 : 76, borderRadius: og ? 16 : 24, objectFit: 'cover', border: `3px solid ${MINT}` }} />
        : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: og ? 52 : 76, height: og ? 52 : 76, borderRadius: og ? 16 : 24, background: MINT, color: ON_MINT, fontSize: og ? 26 : 38 }}>{first!.charAt(0).toUpperCase()}</div>}
      <div style={{ display: 'flex', fontSize: og ? 30 : 44, letterSpacing: -1, color: MINT_TEXT }}>{first}’s going. Come through.</div>
    </div>
  ) : (
    <div style={{ display: 'flex', fontSize: og ? 22 : 30, letterSpacing: og ? 5 : 7, textTransform: 'uppercase', color: MINT_TEXT }}>Don’t miss this one</div>
  );

  const faceRow = faces.length ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: og ? 14 : 20 }}>
      <div style={{ display: 'flex' }}>
        {faces.map((f, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={f} src={f} alt="" width={og ? 48 : 72} height={og ? 48 : 72} style={{ width: og ? 48 : 72, height: og ? 48 : 72, borderRadius: 999, objectFit: 'cover', marginLeft: i ? (og ? -14 : -20) : 0, border: '3px solid #0A100D' }} />
        ))}
      </div>
      {acts && <div style={{ display: 'flex', fontSize: og ? 22 : 32, color: 'rgba(255,255,255,0.85)', maxWidth: og ? 420 : 760 }}>{acts}</div>}
    </div>
  ) : acts ? <div style={{ display: 'flex', fontSize: og ? 22 : 32, color: 'rgba(255,255,255,0.85)' }}>{acts}</div> : null;

  const dateTile = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: og ? 96 : 132, borderRadius: og ? 20 : 28, overflow: 'hidden', background: '#F4FFF8' }}>
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: og ? '6px 0' : '9px 0', background: MINT, color: ON_MINT, fontSize: og ? 18 : 24, letterSpacing: 3 }}>{month}</div>
      <div style={{ display: 'flex', fontSize: og ? 46 : 64, letterSpacing: -2, color: '#0B110E', lineHeight: 1, padding: og ? '6px 0 2px' : '10px 0 2px' }}>{dateNum}</div>
      <div style={{ display: 'flex', fontSize: og ? 15 : 20, letterSpacing: 2, color: 'rgba(11,17,14,0.55)', paddingBottom: og ? 8 : 12 }}>{day}</div>
    </div>
  );

  const ticketChip = dial ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: og ? '10px 18px' : '14px 26px', borderRadius: 999, background: MINT, color: ON_MINT, fontSize: og ? 22 : 30 }}>Tickets: dial {dial}</div>
  ) : null;

  const brand = (size: number) => <div style={{ display: 'flex', fontSize: size, letterSpacing: -1, color: '#fff' }}>Tsacoal</div>;

  const body = og ? (
    // Link preview: flyer on the left, the details on the right
    <div style={{ width: W, height: H, display: 'flex', padding: 40, gap: 44, background: GROUND, fontFamily: font ? 'Inter Tight' : undefined }}>
      <div style={{ display: 'flex', width: 440, height: 550, borderRadius: 28, overflow: 'hidden', background: '#111815', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {flyer && <img src={flyer} alt="" width={440} height={550} style={{ width: 440, height: 550, objectFit: 'cover' }} />}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingTop: 10 }}>
        {who}
        <div style={{ display: 'flex', marginTop: 22, fontSize: titleSize(64), letterSpacing: -2.5, lineHeight: 1, color: '#fff' }}>{e.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 26 }}>
          {dateTile}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 420 }}>
            {time && <div style={{ display: 'flex', fontSize: 28, color: '#fff' }}>{time}</div>}
            {place && <div style={{ display: 'flex', fontSize: 24, color: 'rgba(255,255,255,0.6)' }}>{place}</div>}
          </div>
        </div>
        {faceRow && <div style={{ display: 'flex', marginTop: 26 }}>{faceRow}</div>}
        <div style={{ display: 'flex', flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {ticketChip ?? <div style={{ display: 'flex', fontSize: 22, color: 'rgba(255,255,255,0.5)' }}>Tickets and line-up on tsacoal.com</div>}
          {brand(30)}
        </div>
      </div>
    </div>
  ) : (
    // Story: the flyer big and whole, the details beneath
    <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', padding: '72px 72px 64px', background: GROUND, fontFamily: font ? 'Inter Tight' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {brand(40)}
        <div style={{ display: 'flex', fontSize: 24, letterSpacing: 4, color: 'rgba(255,255,255,0.5)' }}>TSACOAL.COM</div>
      </div>
      <div style={{ display: 'flex', marginTop: 44 }}>{who}</div>
      <div style={{ display: 'flex', position: 'relative', marginTop: 32, width: 936, height: 1090, borderRadius: 44, overflow: 'hidden', background: '#111815', boxShadow: '0 40px 80px rgba(0,0,0,0.55)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {flyer && <img src={flyer} alt="" width={936} height={1090} style={{ position: 'absolute', top: 0, left: 0, width: 936, height: 1090, objectFit: 'cover', opacity: 0.35 }} />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {flyer && <img src={flyer} alt="" width={936} height={1090} style={{ position: 'absolute', top: 0, left: 0, width: 936, height: 1090, objectFit: 'contain' }} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 32, marginTop: 44 }}>
        {dateTile}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', fontSize: titleSize(72), letterSpacing: -3, lineHeight: 1, color: '#fff' }}>{e.title}</div>
          <div style={{ display: 'flex', marginTop: 14, fontSize: 32, color: 'rgba(255,255,255,0.62)' }}>{[time, place].filter(Boolean).join(' · ')}</div>
        </div>
      </div>
      {faceRow && <div style={{ display: 'flex', marginTop: 34 }}>{faceRow}</div>}
      <div style={{ display: 'flex', flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {ticketChip ?? <div style={{ display: 'flex', fontSize: 30, color: 'rgba(255,255,255,0.55)' }}>Tickets and line-up on Tsacoal</div>}
        <div style={{ display: 'flex', fontSize: 26, color: 'rgba(255,255,255,0.45)' }}>See who’s going</div>
      </div>
    </div>
  );

  return new ImageResponse(body, {
    width: W, height: H,
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' },
    ...(font ? { fonts: [{ name: 'Inter Tight', data: font, weight: 800 as const, style: 'normal' as const }] } : {}),
  });
}
