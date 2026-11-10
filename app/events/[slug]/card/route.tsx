import { ImageResponse } from 'next/og';
import { ticketDial } from '@/lib/events/dial';
import { rest, person as getPerson, cleanUser, sized, dayParts, Backdrop, PersonPill, firstName, MINT, MINT_TEXT, G_MINT, G_TEXT, G_TICKET, gText } from '@/lib/shareCard';

export const runtime = 'edge';

const displayFont = () => fetch(new URL('../../../../assets/InterTight-800.woff', import.meta.url)).then((r) => r.arrayBuffer()).catch(() => null);

type Row = {
  slug: string; title: string; date: string; time: string | null; venue: string | null; city: string | null; image_url: string | null;
  artist_slugs: string[] | null; lineup: string[] | null; ticket_source: string | null; description: string | null; flyer_text: string | null; listing_info: unknown;
};

/**
 * A show as a picture to share: story size (1080×1920), or link-preview size with ?format=og.
 * The flyer's own colours fill the background; the details sit on a paper ticket. With ?u=username: "Leo's going".
 */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const q = new URL(req.url).searchParams;
  const og = q.get('format') === 'og';
  const u = cleanUser(q.get('u'));

  const [font, rows, p] = await Promise.all([
    displayFont(),
    rest<Row[]>(`events?select=slug,title,date,time,venue,city,image_url,artist_slugs,lineup,ticket_source,description,flyer_text,listing_info&slug=eq.${encodeURIComponent(params.slug)}&limit=1`),
    getPerson(u),
  ]);
  const e = rows?.[0];
  if (!e) return new Response('Not found', { status: 404 });

  const slugs = (e.artist_slugs ?? []).slice(0, 4);
  const faces = slugs.length
    ? ((await rest<{ spotify_image: string | null; photo_url: string | null }[]>(`artist_profiles?select=spotify_image,photo_url&slug=in.(${slugs.map((s) => `"${s}"`).map(encodeURIComponent).join(',')})`)) ?? [])
      .map((a) => a.spotify_image || a.photo_url).filter((x): x is string => !!x)
    : [];
  const lineup = e.lineup ?? [];
  const acts = lineup.length ? lineup.slice(0, 3).join(', ') + (lineup.length > 3 ? ` +${lineup.length - 3}` : '') : null;
  const { day, num, month } = dayParts(e.date);
  const time = e.time && !/tba|tbc/i.test(e.time) ? e.time : null;
  const place = [e.venue && !/to be announced|tba/i.test(e.venue) ? e.venue : null, e.city ? e.city.charAt(0).toUpperCase() + e.city.slice(1) : null].filter(Boolean).join(', ');
  const dial = ticketDial({ ticketSource: e.ticket_source ?? undefined, description: e.description ?? '', listingInfo: e.listing_info as Parameters<typeof ticketDial>[0]['listingInfo'], flyerText: e.flyer_text ?? undefined });
  const flyer = e.image_url ? sized(e.image_url, og ? 800 : 1080) : null;
  const fit = (base: number) => (e.title.length > 34 ? base * 0.7 : e.title.length > 22 ? base * 0.84 : base);
  const ff = font ? 'Inter Tight' : undefined;
  const fonts = font ? [{ name: 'Inter Tight', data: font, weight: 800 as const, style: 'normal' as const }] : undefined;

  // The ticket: date stub | what, when, where, who | how to get in
  const ticket = (s: number) => (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', borderRadius: 36 * s, background: G_TICKET, border: '2px solid rgba(123,227,168,0.22)', boxShadow: '0 30px 70px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 170 * s, padding: `${30 * s}px 0` }}>
          <div style={{ display: 'flex', fontSize: 24 * s, letterSpacing: 4 * s, ...gText(G_MINT) }}>{month}</div>
          <div style={{ display: 'flex', fontSize: 92 * s, letterSpacing: -4 * s, lineHeight: 1, color: '#fff', marginTop: 2 * s }}>{num}</div>
          <div style={{ display: 'flex', fontSize: 22 * s, letterSpacing: 3 * s, color: 'rgba(255,255,255,0.5)', marginTop: 4 * s }}>{day}</div>
        </div>
        <div style={{ display: 'flex', width: 0, borderLeft: `${3 * s}px dashed rgba(255,255,255,0.16)`, margin: `${22 * s}px 0` }} />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: `${30 * s}px ${36 * s}px ${30 * s}px ${34 * s}px` }}>
          <div style={{ display: 'flex', fontSize: fit(56) * s, letterSpacing: -2.2 * s, lineHeight: 1.02, ...gText(G_TEXT) }}>{e.title}</div>
          {(time || place) && <div style={{ display: 'flex', marginTop: 12 * s, fontSize: 26 * s, color: 'rgba(255,255,255,0.62)' }}>{[time, place].filter(Boolean).join(' · ')}</div>}
          {(faces.length > 0 || acts) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 * s, marginTop: 18 * s }}>
              {faces.length > 0 && (
                <div style={{ display: 'flex' }}>
                  {faces.map((f, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={f} src={f} alt="" width={56 * s} height={56 * s} style={{ width: 56 * s, height: 56 * s, borderRadius: 999, objectFit: 'cover', marginLeft: i ? -16 * s : 0, border: `${3 * s}px solid #0A110D` }} />
                  ))}
                </div>
              )}
              {acts && <div style={{ display: 'flex', fontSize: 25 * s, color: '#fff', maxWidth: 520 * s }}>{acts}</div>}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${18 * s}px ${36 * s}px`, background: G_MINT }}>
        <div style={{ display: 'flex', fontSize: 26 * s, color: '#03130B' }}>{dial ? `Tickets: dial ${dial}` : 'Tickets & line-up on Tsacoal'}</div>
        <div style={{ display: 'flex', fontSize: 26 * s, letterSpacing: -0.5 * s, color: '#03130B' }}>tsacoal.com</div>
      </div>
    </div>
  );

  const greeting = (s: number) => p
    ? <PersonPill p={p} line={`${firstName(p)}’s going.`} tail="Come through." scale={s} />
    : <div style={{ display: 'flex', alignItems: 'center', gap: 12 * s, padding: `${12 * s}px ${26 * s}px`, borderRadius: 999, background: 'rgba(8,13,10,0.72)', fontSize: 26 * s, letterSpacing: 5 * s, color: MINT_TEXT }}>DON’T MISS THIS ONE</div>;

  if (og) {
    const W = 1200, H = 630;
    return new ImageResponse(
      (
        <div style={{ position: 'relative', width: W, height: H, display: 'flex', fontFamily: ff }}>
          <Backdrop src={flyer} w={W} h={H} strength={0.6} />
          <div style={{ display: 'flex', position: 'absolute', top: 40, left: 44, width: 420, height: 525, borderRadius: 26, overflow: 'hidden', background: '#111815', boxShadow: '0 30px 60px rgba(0,0,0,0.6)', transform: 'rotate(-2.5deg)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {flyer && <img src={flyer} alt="" width={420} height={525} style={{ position: 'absolute', top: 0, left: 0, width: 420, height: 525, objectFit: 'cover', opacity: 0.35 }} />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {flyer && <img src={flyer} alt="" width={420} height={525} style={{ position: 'absolute', top: 0, left: 0, width: 420, height: 525, objectFit: 'contain' }} />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', top: 44, left: 520, width: 640, height: 542 }}>
            <div style={{ display: 'flex' }}>{greeting(0.72)}</div>
            <div style={{ display: 'flex', flex: 1 }} />
            {ticket(0.74)}
          </div>
        </div>
      ),
      { width: W, height: H, headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' }, fonts },
    );
  }

  const W = 1080, H = 1920;
  return new ImageResponse(
    (
      <div style={{ position: 'relative', width: W, height: H, display: 'flex', fontFamily: ff }}>
        <Backdrop src={flyer} w={W} h={H} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'absolute', top: 0, left: 0, width: W, height: H, padding: '78px 72px 72px' }}>
          <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', fontSize: 42, letterSpacing: -1.5, color: '#fff' }}>Tsacoal</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 24, letterSpacing: 4, color: 'rgba(255,255,255,0.6)' }}>
              <div style={{ display: 'flex', width: 12, height: 12, borderRadius: 4, background: G_MINT }} />LIVE IN GHANA
            </div>
          </div>
          <div style={{ display: 'flex', marginTop: 48 }}>{greeting(1)}</div>
          <div style={{ display: 'flex', position: 'relative', marginTop: 44, width: 880, height: 1100, borderRadius: 34, overflow: 'hidden', background: '#111815', boxShadow: '0 50px 90px rgba(0,0,0,0.65)', transform: 'rotate(-2deg)', border: '8px solid rgba(255,255,255,0.08)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {flyer && <img src={flyer} alt="" width={880} height={1100} style={{ position: 'absolute', top: 0, left: 0, width: 880, height: 1100, objectFit: 'cover', opacity: 0.35 }} />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {flyer && <img src={flyer} alt="" width={880} height={1100} style={{ position: 'absolute', top: 0, left: 0, width: 880, height: 1100, objectFit: 'contain' }} />}
          </div>
          <div style={{ display: 'flex', flex: 1 }} />
          {ticket(1)}
        </div>
      </div>
    ),
    { width: W, height: H, headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' }, fonts },
  );
}
