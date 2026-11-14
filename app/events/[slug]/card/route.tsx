import { ImageResponse } from 'next/og';
import { ticketDial } from '@/lib/events/dial';
import { cityLabel } from '@/lib/utils';
import { isFilm } from '@/lib/events/kind';
import { rest, person as getPerson, cleanUser, sized, dayParts, Backdrop, PersonPill, GoingMark, firstName, MINT, MINT_TEXT, ON_MINT, G_MINT, G_TEXT, G_TICKET, gText, setOrigin } from '@/lib/shareCard';

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
  // A film has showtimes and a cast, not a line-up
  const film = isFilm({ title: e.title, venue: e.venue, description: e.description, flyerText: e.flyer_text });
  const cta = dial ? `Tickets: dial ${dial}` : film ? 'Tickets & showtimes on TsaCoal' : 'Tickets & line-up on TsaCoal';
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
        <div style={{ display: 'flex', fontSize: 26 * s, color: '#03130B' }}>{cta}</div>
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
      { width: W, height: H, headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' }, fonts },
    );
  }

  // Post (1080×1350, shows whole on X, Instagram and WhatsApp) and story (1080×1920).
  // Three designs (?t=1 Poster, 2 Full bleed, 3 Neon), picked at random when someone shares.
  const story = format === 'story';
  const W = 1080, H = story ? 1920 : 1350;
  const t = Math.min(3, Math.max(1, Number(q.get('t')) || 1));
  // The flyer's main colour (worked out on the phone), lifted so it reads on a dark card
  const tint = (() => {
    const c = q.get('c');
    if (!c || !/^[0-9a-f]{6}$/i.test(c)) return '#FFE04A';
    let [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16));
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    if (lum < 0.55) { const m = (0.55 - lum) / (1 - lum); [r, g, b] = [r, g, b].map((v) => Math.round(v + (255 - v) * m)); }
    return `rgb(${r},${g},${b})`;
  })();
  const k = story ? 1.2 : 1;
  const when = [day, num, month].join(' ');

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', fontSize: story ? 42 : 36, letterSpacing: -1.5, color: '#fff' }}>TsaCoal</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: story ? 24 : 21, letterSpacing: 4, color: 'rgba(255,255,255,0.65)' }}>
        <div style={{ display: 'flex', width: 12, height: 12, borderRadius: 4, background: G_MINT }} />{liveIn}
      </div>
    </div>
  );
  // The flyer, whole (never cropped): its own blur fills any spare space inside the frame
  const flyerBox = (w: number, rot = 0, dim = 1) => {
    const h = Math.round(w * 1.25);
    return (
      <div style={{ display: 'flex', position: 'relative', width: w, height: h, borderRadius: 30, overflow: 'hidden', background: '#111815', boxShadow: '0 50px 90px rgba(0,0,0,0.7)', border: '6px solid rgba(255,255,255,0.1)', transform: `rotate(${rot}deg)`, opacity: dim }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {flyer && <img src={flyer} alt="" width={w} height={h} style={{ position: 'absolute', top: 0, left: 0, width: w, height: h, objectFit: 'cover', opacity: 0.35 }} />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {flyer && dim === 1 && <img src={flyer} alt="" width={w} height={h} style={{ position: 'absolute', top: 0, left: 0, width: w, height: h, objectFit: 'contain' }} />}
      </div>
    );
  };
  const title = (size: number, center = false) => (
    <div style={{ display: 'flex', justifyContent: center ? 'center' : 'flex-start', textAlign: center ? 'center' : 'left', fontSize: fit(size), letterSpacing: -3.5, lineHeight: 0.98, ...gText(G_TEXT) }}>{e.title}</div>
  );
  const where = (center = false, withDate = false) => {
    const line = [withDate ? when : null, time, place].filter(Boolean).join(' · ');
    return line ? <div style={{ display: 'flex', justifyContent: center ? 'center' : 'flex-start', textAlign: center ? 'center' : 'left', marginTop: 14, fontSize: story ? 32 : 27, color: 'rgba(255,255,255,0.7)' }}>{line}</div> : null;
  };
  const who = (center = false) => (faces.length > 0 || acts) ? (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: center ? 'center' : 'flex-start', gap: 16, marginTop: story ? 26 : 18 }}>
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
  ) : null;
  const pill = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: story ? 40 : 26, padding: story ? '22px 34px' : '17px 28px', borderRadius: 999, background: G_MINT }}>
      <div style={{ display: 'flex', fontSize: story ? 30 : 25, color: ON_MINT }}>{cta}</div>
      <div style={{ display: 'flex', fontSize: story ? 28 : 24, color: ON_MINT }}>tsacoal.com</div>
    </div>
  );
  const spacer = <div style={{ display: 'flex', flex: 1 }} />;
  const hello = <div style={{ display: 'flex', justifyContent: 'center', marginTop: story ? 44 : 28 }}>{greeting(story ? 1 : 0.86)}</div>;

  // Satori lays a fragment's children out in a row, so each design is its own column
  const COL = { display: 'flex', flexDirection: 'column', flex: 1, width: '100%' } as const;
  // Each design has its own layout, colour and way of saying how to get in, so they don't read as one card
  const dateLine = [day, num, month].join(' ');
  const ticketLine = dial ? `Dial ${dial}` : 'tsacoal.com';
  const plain = (w: number, radius: number, rot = 0) => {
    const h = Math.round(w * 1.25);
    return (
      <div style={{ display: 'flex', position: 'relative', width: w, height: h, borderRadius: radius, overflow: 'hidden', background: '#0B0F0D', transform: `rotate(${rot}deg)`, boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {flyer && <img src={flyer} alt="" width={w} height={h} style={{ position: 'absolute', top: 0, left: 0, width: w, height: h, objectFit: 'cover', opacity: 0.35 }} />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {flyer && <img src={flyer} alt="" width={w} height={h} style={{ position: 'absolute', top: 0, left: 0, width: w, height: h, objectFit: 'contain' }} />}
      </div>
    );
  };
  const CW = W - (story ? 144 : 128); // content width

  let body: JSX.Element;
  let ground: JSX.Element = <Backdrop src={flyer} w={W} h={H} />;
  if (t === 2) {
    // Full bleed: the flyer is the whole card, bright and uncovered at the top, with the date and place
    // in one row along the bottom (calendar | pin), like a finished festival poster
    const fh = Math.round(W * 1.25); // the flyer at full width
    const INK = '4,18,11';
    ground = (
      <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, width: W, height: H, background: `rgb(${INK})` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {flyer && <img src={flyer} alt="" width={W} height={H} style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, objectFit: 'cover', opacity: 0.4 }} />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {flyer && <img src={flyer} alt="" width={W} height={fh} style={{ position: 'absolute', top: 0, left: 0, width: W, height: fh, objectFit: 'contain' }} />}
        <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, width: W, height: 190, background: `linear-gradient(180deg, rgba(${INK},0.82) 0%, rgba(${INK},0) 100%)` }} />
        <div style={{ display: 'flex', position: 'absolute', left: 0, bottom: 0, width: W, height: story ? H - fh + 240 : 470, background: `linear-gradient(180deg, rgba(${INK},0) 0%, rgba(${INK},0.9) ${story ? 30 : 38}%, rgba(${INK},0.98) 100%)` }} />
      </div>
    );
    const cal = (sz: number) => (
      <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M8 14h2M14 14h2M8 17.5h2" />
      </svg>
    );
    const pin = (sz: number) => (
      <svg width={sz} height={sz} viewBox="0 0 24 24" fill="#fff">
        <path fillRule="evenodd" d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2z" />
      </svg>
    );
    body = (
      <div style={COL}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', fontSize: story ? 44 : 38, letterSpacing: -1.5, color: '#fff' }}>TsaCoal</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: story ? 24 : 21, letterSpacing: 4, color: '#fff' }}>{liveIn}<div style={{ display: 'flex', width: 4, height: 30, borderRadius: 2, background: G_MINT }} /></div>
        </div>
        {spacer}
        {/* A brush-stroke banner, tilted: who's going, or the nudge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: story ? 40 : 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: `${12 * k}px ${44 * k}px`, borderRadius: '18px 44px 22px 40px', background: 'linear-gradient(100deg, #1F9D55 0%, #3FCB7C 45%, #7BE3A8 100%)', transform: 'rotate(-3deg)', boxShadow: '0 16px 36px rgba(0,0,0,0.45)', fontSize: 34 * k, letterSpacing: 1, color: '#fff' }}>
            {p ? `${firstName(p)}’s going. Come through!` : film ? 'Now showing. Don’t miss it!' : 'Don’t miss this one!'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 * k }}>
            {cal(74 * k)}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', fontSize: 30 * k, letterSpacing: 3, color: '#fff' }}>{day}</div>
              <div style={{ display: 'flex', fontSize: 84 * k, letterSpacing: -3, lineHeight: 0.95, color: tint }}>{num}</div>
              <div style={{ display: 'flex', fontSize: 30 * k, letterSpacing: 3, color: '#fff' }}>{month}</div>
            </div>
          </div>
          <div style={{ display: 'flex', width: 4, height: 130 * k, margin: `0 ${40 * k}px`, borderRadius: 2, background: 'rgba(255,255,255,0.85)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 * k, maxWidth: 520 * k }}>
            {pin(64 * k)}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: 36 * k, letterSpacing: -0.6, lineHeight: 1.12, color: '#fff', maxWidth: 420 * k }}>{place || cityName || 'Ghana'}</div>
              {time && <div style={{ display: 'flex', marginTop: 6, fontSize: 26 * k, color: 'rgba(255,255,255,0.75)' }}>{time}</div>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, marginTop: story ? 44 : 26 }}>
          <div style={{ display: 'flex', fontSize: story ? 34 : 28, letterSpacing: -1, color: '#fff' }}>TsaCoal</div>
          <div style={{ display: 'flex', width: 3, height: 34, borderRadius: 2, background: 'rgba(255,255,255,0.7)' }} />
          <div style={{ display: 'flex', fontSize: story ? 28 : 24, color: 'rgba(255,255,255,0.9)' }}>{dial ? `Tickets: dial ${dial}` : 'tsacoal.com'}</div>
        </div>
      </div>
    );
  } else if (t === 3) {
    // Neon: violet and pink light, the date in three tiles, the flyer in a glowing frame, everything centred
    const N = 'linear-gradient(135deg, #FF7AB8 0%, #B58CFF 100%)', fw = story ? 700 : 540;
    ground = (
      <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, width: W, height: H }}>
        <Backdrop src={flyer} w={W} h={H} strength={0.7} />
        <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, width: W, height: H, background: 'linear-gradient(160deg, rgba(120,70,255,0.42) 0%, rgba(20,8,40,0.5) 45%, rgba(255,80,160,0.3) 100%)' }} />
      </div>
    );
    const tile = (txt: string | number, big = false) => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: (big ? 150 : 170) * k, height: 104 * k, borderRadius: 26, background: big ? N : 'rgba(255,255,255,0.1)', border: big ? '0px solid transparent' : '2px solid rgba(255,255,255,0.22)', fontSize: (big ? 72 : 40) * k, letterSpacing: big ? -3 : 6, color: big ? '#1B0B2E' : '#fff' }}>{txt}</div>
    );
    body = (
      <div style={COL}>
        {p ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', fontSize: story ? 42 : 36, letterSpacing: -1.5, color: '#fff' }}>TsaCoal</div>
            <GoingMark p={p} scale={story ? 1.1 : 0.95} ring="#FF9BCB" />
          </div>
        ) : header}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: story ? 70 : 34 }}>{tile(day)}{tile(num, true)}{tile(month)}</div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: story ? 60 : 30 }}>
          <div style={{ display: 'flex', padding: 9, borderRadius: 40, background: N, boxShadow: '0 0 90px rgba(181,140,255,0.45)' }}>{plain(fw, 32)}</div>
        </div>
        {spacer}
        <div style={{ display: 'flex', justifyContent: 'center', textAlign: 'center', fontSize: fit(story ? 78 : 62), letterSpacing: -3, lineHeight: 1, ...gText('linear-gradient(180deg, #FFFFFF 0%, #FFD6EA 60%, #D9C2FF 100%)') }}>{e.title}</div>
        <div style={{ display: 'flex', justifyContent: 'center', textAlign: 'center', marginTop: 12, fontSize: story ? 30 : 26, color: 'rgba(255,255,255,0.72)' }}>{[time, place].filter(Boolean).join(' · ')}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, marginTop: story ? 34 : 22 }}>
          <div style={{ display: 'flex', padding: story ? '16px 30px' : '13px 26px', borderRadius: 999, background: '#fff', fontSize: story ? 28 : 24, color: '#1B0B2E' }}>{ticketLine}</div>
          {dial ? <div style={{ display: 'flex', fontSize: story ? 26 : 22, letterSpacing: 2, color: 'rgba(255,255,255,0.7)' }}>tsacoal.com</div> : null}
        </div>
      </div>
    );
  } else {
    // Poster: the flyer tilted, a round date sticker on its corner
    const FW = story ? 720 : 600, FH = Math.round(FW * 1.25);
    body = (
      <div style={COL}>
        {header}{hello}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: story ? 50 : 34 }}>
          <div style={{ display: 'flex', position: 'relative', width: FW, height: FH, transform: 'rotate(-3deg)' }}>
            {flyerBox(FW)}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'absolute', right: story ? 24 : -178, bottom: story ? -196 : -8, width: story ? 220 : 200, height: story ? 220 : 200, borderRadius: 999, background: G_MINT, transform: 'rotate(10deg)', boxShadow: '0 24px 50px rgba(0,0,0,0.55)', border: '6px solid rgba(255,255,255,0.35)' }}>
              <div style={{ display: 'flex', fontSize: story ? 30 : 26, letterSpacing: 4, color: ON_MINT }}>{day}</div>
              <div style={{ display: 'flex', fontSize: story ? 94 : 84, letterSpacing: -5, lineHeight: 0.95, color: ON_MINT }}>{num}</div>
              <div style={{ display: 'flex', fontSize: story ? 30 : 26, letterSpacing: 4, color: ON_MINT }}>{month}</div>
            </div>
          </div>
        </div>
        {spacer}
        {title(story ? 84 : 70)}{where()}{who()}{pill}
      </div>
    );
  }

  return new ImageResponse(
    (
      <div style={{ position: 'relative', width: W, height: H, display: 'flex', fontFamily: ff }}>
        {ground}
        <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', top: 0, left: 0, width: W, height: H, padding: story ? '78px 72px 64px' : '56px 64px 52px' }}>
          {body}
        </div>
      </div>
    ),
    { width: W, height: H, headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' }, fonts },
  );
}
