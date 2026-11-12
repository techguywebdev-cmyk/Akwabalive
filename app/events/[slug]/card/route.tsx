import { ImageResponse } from 'next/og';
import { ticketDial } from '@/lib/events/dial';
import { cityLabel } from '@/lib/utils';
import { rest, person as getPerson, cleanUser, sized, dayParts, Backdrop, PersonPill, firstName, MINT, MINT_TEXT, ON_MINT, G_MINT, G_TEXT, G_TICKET, gText, setOrigin } from '@/lib/shareCard';

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
  setOrigin(req.url);
  const q = new URL(req.url).searchParams;
  const format = q.get('format') === 'og' ? 'og' : q.get('format') === 'story' ? 'story' : 'post';
  const og = format === 'og';
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
  const cityName = e.city ? cityLabel(e.city) : null;
  const place = [e.venue && !/to be announced|tba/i.test(e.venue) ? e.venue : null, cityName && !(e.venue ?? '').toLowerCase().includes(cityName.toLowerCase()) ? cityName : null].filter(Boolean).join(', ');
  // Where the show is (Live in Accra, Live in London), not a blanket "Ghana"
  const liveIn = `LIVE IN ${(cityName ?? 'Ghana').toUpperCase()}`;
  const dial = ticketDial({ ticketSource: e.ticket_source ?? undefined, description: e.description ?? '', listingInfo: e.listing_info as Parameters<typeof ticketDial>[0]['listingInfo'], flyerText: e.flyer_text ?? undefined });
  const flyer = e.image_url ? sized(e.image_url, og ? 750 : format === 'story' ? 1080 : 828) : null;
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
        <div style={{ display: 'flex', fontSize: 26 * s, color: '#03130B' }}>{dial ? `Tickets: dial ${dial}` : 'Tickets & line-up on TsaCoal'}</div>
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
      { width: W, height: H, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' }, fonts },
    );
  }

  // Post (1080×1350, shows whole on X, Instagram and WhatsApp) and story (1080×1920): a poster.
  // The flyer whole and tilted, a mint date sticker slapped on its corner, the name in the brand gradient beneath.
  const story = format === 'story';
  const W = 1080, H = story ? 1920 : 1350;
  const FW = story ? 720 : 600, FH = Math.round(FW * 1.25);
  const sticker = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'absolute', right: story ? 24 : -178, bottom: story ? -196 : -8, width: story ? 220 : 200, height: story ? 220 : 200, borderRadius: 999, background: G_MINT, transform: 'rotate(10deg)', boxShadow: '0 24px 50px rgba(0,0,0,0.55)', border: '6px solid rgba(255,255,255,0.35)' }}>
      <div style={{ display: 'flex', fontSize: story ? 30 : 26, letterSpacing: 4, color: ON_MINT }}>{day}</div>
      <div style={{ display: 'flex', fontSize: story ? 94 : 84, letterSpacing: -5, lineHeight: 0.95, color: ON_MINT }}>{num}</div>
      <div style={{ display: 'flex', fontSize: story ? 30 : 26, letterSpacing: 4, color: ON_MINT }}>{month}</div>
    </div>
  );
  return new ImageResponse(
    (
      <div style={{ position: 'relative', width: W, height: H, display: 'flex', fontFamily: ff }}>
        <Backdrop src={flyer} w={W} h={H} />
        <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', top: 0, left: 0, width: W, height: H, padding: story ? '78px 72px 64px' : '56px 64px 52px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', fontSize: story ? 42 : 36, letterSpacing: -1.5, color: '#fff' }}>TsaCoal</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: story ? 24 : 21, letterSpacing: 4, color: 'rgba(255,255,255,0.65)' }}>
              <div style={{ display: 'flex', width: 12, height: 12, borderRadius: 4, background: G_MINT }} />{liveIn}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: story ? 44 : 28 }}>{greeting(story ? 1 : 0.86)}</div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: story ? 50 : 34 }}>
            <div style={{ display: 'flex', position: 'relative', width: FW, height: FH, transform: 'rotate(-3deg)' }}>
              <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, width: FW, height: FH, borderRadius: 30, overflow: 'hidden', background: '#111815', boxShadow: '0 50px 90px rgba(0,0,0,0.7)', border: '6px solid rgba(255,255,255,0.1)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {flyer && <img src={flyer} alt="" width={FW} height={FH} style={{ position: 'absolute', top: 0, left: 0, width: FW, height: FH, objectFit: 'cover', opacity: 0.35 }} />}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {flyer && <img src={flyer} alt="" width={FW} height={FH} style={{ position: 'absolute', top: 0, left: 0, width: FW, height: FH, objectFit: 'contain' }} />}
              </div>
              {sticker}
            </div>
          </div>

          <div style={{ display: 'flex', flex: 1 }} />
          <div style={{ display: 'flex', fontSize: fit(story ? 84 : 70), letterSpacing: -3.5, lineHeight: 0.98, ...gText(G_TEXT) }}>{e.title}</div>
          {(time || place) && <div style={{ display: 'flex', marginTop: 14, fontSize: story ? 32 : 27, color: 'rgba(255,255,255,0.7)' }}>{[time, place].filter(Boolean).join(' · ')}</div>}
          {(faces.length > 0 || acts) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: story ? 26 : 18 }}>
              {faces.length > 0 && (
                <div style={{ display: 'flex' }}>
                  {faces.map((f, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={f} src={f} alt="" width={story ? 66 : 54} height={story ? 66 : 54} style={{ width: story ? 66 : 54, height: story ? 66 : 54, borderRadius: 999, objectFit: 'cover', marginLeft: i ? -18 : 0, border: '3px solid #0A110D' }} />
                  ))}
                </div>
              )}
              {acts && <div style={{ display: 'flex', fontSize: story ? 30 : 25, color: '#fff' }}>{acts}</div>}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: story ? 40 : 26, padding: story ? '22px 34px' : '17px 28px', borderRadius: 999, background: G_MINT }}>
            <div style={{ display: 'flex', fontSize: story ? 30 : 25, color: ON_MINT }}>{dial ? `Tickets: dial ${dial}` : 'Tickets & line-up on TsaCoal'}</div>
            <div style={{ display: 'flex', fontSize: story ? 28 : 24, color: ON_MINT }}>tsacoal.com</div>
          </div>
        </div>
      </div>
    ),
    { width: W, height: H, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' }, fonts },
  );
}
