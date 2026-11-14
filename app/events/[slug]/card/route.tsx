import { ImageResponse } from 'next/og';
import { ticketDial } from '@/lib/events/dial';
import { cityLabel } from '@/lib/utils';
import { isFilm } from '@/lib/events/kind';
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
  // Five poster designs (?t=1…5), picked at random when someone shares, so feeds don't fill with one look.
  const story = format === 'story';
  const W = 1080, H = story ? 1920 : 1350;
  const t = Math.min(5, Math.max(1, Number(q.get('t')) || 1));
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
  const going = p ? <div style={{ display: 'flex' }}>{greeting(story ? 0.9 : 0.76)}</div> : null;
  const CW = W - (story ? 144 : 128); // content width

  let body: JSX.Element;
  let ground: JSX.Element = <Backdrop src={flyer} w={W} h={H} />;
  if (t === 2) {
    // Gallery: a plain dark wall, the flyer hung large, a small caption like a label beside a painting
    ground = <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, width: W, height: H, background: 'linear-gradient(180deg, #0C100E 0%, #050706 100%)' }} />;
    const fw = story ? 936 : 800;
    body = (
      <div style={COL}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', fontSize: story ? 38 : 32, letterSpacing: -1.2, color: '#fff' }}>TsaCoal</div>
          {going ?? <div style={{ display: 'flex', fontSize: story ? 24 : 21, letterSpacing: 4, color: 'rgba(255,255,255,0.5)' }}>{liveIn}</div>}
        </div>
        {spacer}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'flex', padding: 3, background: 'rgba(255,255,255,0.55)', borderRadius: 10 }}>{plain(fw, 8)}</div>
        </div>
        {spacer}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: CW - 330 }}>
            <div style={{ display: 'flex', fontSize: fit(story ? 50 : 44), letterSpacing: -1.6, lineHeight: 1.04, color: '#fff' }}>{e.title}</div>
            <div style={{ display: 'flex', marginTop: 10, fontSize: story ? 27 : 24, lineHeight: 1.3, color: 'rgba(255,255,255,0.55)' }}>{[dateLine, time, place].filter(Boolean).join(' · ')}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', fontSize: 19, letterSpacing: 5, color: 'rgba(255,255,255,0.45)' }}>TICKETS</div>
            <div style={{ display: 'flex', marginTop: 6, fontSize: story ? 36 : 32, letterSpacing: -0.5, color: MINT_TEXT }}>{ticketLine}</div>
          </div>
        </div>
      </div>
    );
  } else if (t === 3) {
    // Colour block: a coral slab carrying the date in black, the flyer leaning over its edge
    const C = '#FF7A59', bw = story ? 440 : 400, bh = story ? 900 : 700, fw = story ? 580 : 520;
    body = (
      <div style={COL}>
        {header}
        <div style={{ display: 'flex', position: 'relative', height: bh, marginTop: story ? 70 : 36 }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: bw, height: bh, padding: 34, borderRadius: 40, background: `linear-gradient(160deg, #FFB199 0%, ${C} 55%, #E9522E 100%)` }}>
            <div style={{ display: 'flex', fontSize: 40 * k, letterSpacing: 8, color: '#1A0A05' }}>{day}</div>
            <div style={{ display: 'flex', fontSize: (String(num).length > 1 ? 250 : 300) * k, letterSpacing: -14, lineHeight: 0.86, color: '#1A0A05' }}>{num}</div>
            <div style={{ display: 'flex', fontSize: 82 * k, letterSpacing: 2, lineHeight: 1, color: '#1A0A05' }}>{month}</div>
            {time && <div style={{ display: 'flex', marginTop: 14, fontSize: 30 * k, color: 'rgba(26,10,5,0.7)' }}>{time}</div>}
          </div>
          <div style={{ display: 'flex', position: 'absolute', right: 0, top: story ? 120 : 26 }}>{plain(fw, 26, 4)}</div>
        </div>
        {spacer}
        {going && <div style={{ display: 'flex', marginBottom: 18 }}>{going}</div>}
        <div style={{ display: 'flex', fontSize: fit(story ? 82 : 68), letterSpacing: -3.2, lineHeight: 0.98, color: '#fff' }}>{e.title}</div>
        {place ? <div style={{ display: 'flex', marginTop: 12, fontSize: story ? 31 : 27, color: 'rgba(255,255,255,0.7)' }}>{place}</div> : null}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: story ? 36 : 24, padding: story ? '22px 30px' : '17px 26px', borderRadius: 18, border: `3px solid ${C}` }}>
          <div style={{ display: 'flex', fontSize: story ? 30 : 26, letterSpacing: 2, color: C }}>{(dial ? `Dial ${dial}` : film ? 'Showtimes on TsaCoal' : 'Tickets on TsaCoal').toUpperCase()}</div>
          <div style={{ display: 'flex', fontSize: story ? 26 : 22, letterSpacing: 3, color: 'rgba(255,255,255,0.6)' }}>TSACOAL.COM</div>
        </div>
      </div>
    );
  } else if (t === 4) {
    // Editorial: the name set huge in capitals, the facts as a labelled list, the flyer leaning in from the right
    const G = '#F5C451', fw = story ? 560 : 480;
    const fact = (label: string, value: string | null) => value ? (
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: story ? 30 : 22 }}>
        <div style={{ display: 'flex', fontSize: 19 * k, letterSpacing: 6, color: G }}>{label}</div>
        <div style={{ display: 'flex', marginTop: 4, fontSize: 31 * k, lineHeight: 1.18, color: '#fff' }}>{value}</div>
      </div>
    ) : null;
    body = (
      <div style={COL}>
        <div style={{ display: 'flex', fontSize: fit(story ? 118 : 100), letterSpacing: -4.5, lineHeight: 0.92, color: '#fff', textTransform: 'uppercase' }}>{e.title}</div>
        <div style={{ display: 'flex', width: 140, height: 6, marginTop: story ? 34 : 24, borderRadius: 3, background: G }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: story ? 40 : 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: CW - fw - 40 }}>
            {fact('WHEN', [dateLine, time].filter(Boolean).join(' · '))}
            {fact('WHERE', place || null)}
            {fact(film ? 'CAST' : 'WITH', acts)}
            {fact('TICKETS', ticketLine)}
          </div>
          <div style={{ display: 'flex', marginTop: story ? 40 : 30 }}>{plain(fw, 22, -3)}</div>
        </div>
        {spacer}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', fontSize: story ? 40 : 34, letterSpacing: -1.4, color: '#fff' }}>TsaCoal</div>
          {going ?? <div style={{ display: 'flex', fontSize: story ? 24 : 21, letterSpacing: 4, color: 'rgba(255,255,255,0.55)' }}>{liveIn}</div>}
        </div>
      </div>
    );
  } else if (t === 5) {
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
        {header}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: story ? 70 : 34 }}>{tile(day)}{tile(num, true)}{tile(month)}</div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: story ? 60 : 30 }}>
          <div style={{ display: 'flex', padding: 9, borderRadius: 40, background: N, boxShadow: '0 0 90px rgba(181,140,255,0.45)' }}>{plain(fw, 32)}</div>
        </div>
        {spacer}
        <div style={{ display: 'flex', justifyContent: 'center', textAlign: 'center', fontSize: fit(story ? 78 : 62), letterSpacing: -3, lineHeight: 1, ...gText('linear-gradient(180deg, #FFFFFF 0%, #FFD6EA 60%, #D9C2FF 100%)') }}>{e.title}</div>
        <div style={{ display: 'flex', justifyContent: 'center', textAlign: 'center', marginTop: 12, fontSize: story ? 30 : 26, color: 'rgba(255,255,255,0.72)' }}>{[time, place].filter(Boolean).join(' · ')}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, marginTop: story ? 34 : 22 }}>
          {going}
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
