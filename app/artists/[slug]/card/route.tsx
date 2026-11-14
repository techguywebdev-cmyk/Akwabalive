import { ImageResponse } from 'next/og';
import { getArtistBySlug } from '@/lib/data/artists';
import { rest, sized, dayParts, Backdrop, liftTint, MINT_TEXT, G_MINT, G_TEXT, G_TICKET, ON_MINT, gText, setOrigin } from '@/lib/shareCard';

export const runtime = 'edge';

const displayFont = () => fetch(new URL('../../../../assets/InterTight-800.woff', import.meta.url)).then((r) => r.arrayBuffer()).catch(() => null);

type Show = { slug: string; title: string; date: string; venue: string | null; city: string | null; image_url: string | null };

/**
 * An artist and where to catch them, as a picture to share: story size, or ?format=og for link previews.
 * Their photo fills the card; the next shows sit on paper tickets. With ?u=username it carries the sharer's face.
 */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const artist = getArtistBySlug(params.slug);
  if (!artist) return new Response('Not found', { status: 404 });
  setOrigin(req.url);
  const q = new URL(req.url).searchParams;
  const format = q.get('format') === 'og' ? 'og' : q.get('format') === 'story' ? 'story' : 'post';
  const og = format === 'og';
    const today = new Date().toISOString().slice(0, 10);
  const name = artist.name.replace(/[,()*]/g, ' ').trim();

  const [font, prof, shows] = await Promise.all([
    displayFont(),
    rest<{ spotify_image: string | null; photo_url: string | null }[]>(`artist_profiles?select=spotify_image,photo_url&slug=eq.${encodeURIComponent(artist.slug)}&limit=1`),
    rest<Show[]>(`events?select=slug,title,date,venue,city,image_url&status=eq.published&date=gte.${today}&or=${encodeURIComponent(`(artist_slugs.cs.{${artist.slug}},title.ilike.*${name}*)`)}&order=date&limit=${format === 'story' ? 4 : og ? 2 : 3}`),
  ]);
  const photo = prof?.[0]?.spotify_image || prof?.[0]?.photo_url || null;
  const list = shows ?? [];
  const ff = font ? 'Inter Tight' : undefined;
  const fonts = font ? [{ name: 'Inter Tight', data: font, weight: 800 as const, style: 'normal' as const }] : undefined;
  const nameSize = (base: number) => (artist.name.length > 14 ? base * 0.62 : artist.name.length > 9 ? base * 0.8 : base);
  const where = (s: Show) => [s.venue && !/to be announced|tba/i.test(s.venue) ? s.venue : null, s.city ? s.city.charAt(0).toUpperCase() + s.city.slice(1) : null].filter(Boolean).join(', ');

  // One show as a small paper ticket: date stub | name and place | flyer
  const stub = (s: Show, k: number) => {
    const d = dayParts(s.date);
    return (
      <div key={s.slug} style={{ display: 'flex', alignItems: 'center', width: '100%', borderRadius: 28 * k, background: G_TICKET, border: '2px solid rgba(123,227,168,0.22)', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.45)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 130 * k, padding: `${20 * k}px 0` }}>
          <div style={{ display: 'flex', fontSize: 20 * k, letterSpacing: 3 * k, ...gText(G_MINT) }}>{d.month}</div>
          <div style={{ display: 'flex', fontSize: 64 * k, letterSpacing: -3 * k, lineHeight: 1, color: '#fff' }}>{d.num}</div>
          <div style={{ display: 'flex', fontSize: 17 * k, letterSpacing: 2 * k, color: 'rgba(255,255,255,0.5)' }}>{d.day}</div>
        </div>
        <div style={{ display: 'flex', alignSelf: 'stretch', width: 0, borderLeft: `${3 * k}px dashed rgba(255,255,255,0.16)`, margin: `${16 * k}px 0` }} />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: `${16 * k}px ${24 * k}px` }}>
          <div style={{ display: 'flex', fontSize: (s.title.length > 30 ? 30 : 36) * k, letterSpacing: -1.2 * k, lineHeight: 1.05, color: '#fff' }}>{s.title}</div>
          {where(s) && <div style={{ display: 'flex', marginTop: 6 * k, fontSize: 21 * k, color: 'rgba(255,255,255,0.58)' }}>{where(s)}</div>}
        </div>
        {s.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sized(s.image_url, 300)} alt="" width={92 * k} height={115 * k} style={{ width: 92 * k, height: 115 * k, objectFit: 'cover', borderRadius: 16 * k, marginRight: 18 * k }} />
        )}
      </div>
    );
  };

  const empty = (k: number) => (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: `${28 * k}px ${34 * k}px`, borderRadius: 28 * k, background: G_TICKET, border: '2px solid rgba(123,227,168,0.22)' }}>
      <div style={{ display: 'flex', fontSize: 34 * k, letterSpacing: -1 * k, color: '#fff' }}>No dates announced yet</div>
      <div style={{ display: 'flex', marginTop: 6 * k, fontSize: 22 * k, color: 'rgba(255,255,255,0.58)' }}>Follow on TsaCoal and hear first.</div>
    </div>
  );

  const greeting = (k: number) => <div style={{ display: 'flex', padding: `${12 * k}px ${26 * k}px`, borderRadius: 999, background: 'rgba(8,13,10,0.72)', fontSize: 24 * k, letterSpacing: 5 * k, color: MINT_TEXT }}>{list.length ? `CATCH ${artist.name.toUpperCase()} LIVE` : `${artist.name.toUpperCase()} ON TSACOAL`}</div>;

  if (og) {
    const W = 1200, H = 630;
    return new ImageResponse(
      (
        <div style={{ position: 'relative', width: W, height: H, display: 'flex', fontFamily: ff }}>
          <Backdrop src={photo} w={W} h={H} strength={0.55} />
          <div style={{ display: 'flex', position: 'absolute', top: 44, left: 44, width: 400, height: 542, borderRadius: 30, overflow: 'hidden', background: '#111815', boxShadow: '0 30px 60px rgba(0,0,0,0.6)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {photo && <img src={sized(photo, 800)} alt="" width={400} height={542} style={{ width: 400, height: 542, objectFit: 'cover', objectPosition: '50% 20%' }} />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', top: 44, left: 484, width: 672, height: 542 }}>
            <div style={{ display: 'flex' }}>{greeting(0.7)}</div>
            <div style={{ display: 'flex', marginTop: 22, fontSize: nameSize(96), letterSpacing: -4, lineHeight: 0.95, ...gText(G_TEXT) }}>{artist.name}</div>
            <div style={{ display: 'flex', flex: 1 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{list.length ? list.map((s) => stub(s, 0.72)) : empty(0.72)}</div>
          </div>
        </div>
      ),
      { width: W, height: H, headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' }, fonts },
    );
  }

  // Post (1080×1350, whole on X, Instagram and WhatsApp) or story (1080×1920), in the same three designs as
  // show cards (?t=1 Poster, 2 Full bleed, 3 Neon), picked at random when someone shares
  const story = format === 'story';
  const W = 1080, H = story ? 1920 : 1350;
  const t = Math.min(3, Math.max(1, Number(q.get('t')) || 1));
  const k = story ? 1.2 : 1;
  const tint = liftTint(q.get('c'), '#FFE04A');
  const COL = { display: 'flex', flexDirection: 'column', flex: 1, width: '100%' } as const;
  const spacer = <div style={{ display: 'flex', flex: 1 }} />;
  const link = `tsacoal.com/artists/${artist.slug}`;
  const genre = artist.genre ? artist.genre.toUpperCase() : 'ARTIST';
  const top = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', fontSize: story ? 42 : 36, letterSpacing: -1.5, color: '#fff' }}>TsaCoal</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: story ? 24 : 21, letterSpacing: 4, color: 'rgba(255,255,255,0.7)' }}>
        <div style={{ display: 'flex', width: 12, height: 12, borderRadius: 4, background: G_MINT }} />ARTIST PROFILE
      </div>
    </div>
  );
  const pic = (w: number, h: number, radius: number, extra: Record<string, string | number> = {}) => (
    <div style={{ display: 'flex', position: 'relative', width: w, height: h, borderRadius: radius, overflow: 'hidden', background: '#111815', ...extra }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {photo && <img src={sized(photo, 1080)} alt="" width={w} height={h} style={{ width: w, height: h, objectFit: 'cover', objectPosition: '50% 22%' }} />}
    </div>
  );
  const label = (color: string, center = false) => (
    <div style={{ display: 'flex', justifyContent: center ? 'center' : 'flex-start', marginTop: story ? 40 : 24, fontSize: story ? 23 : 19, letterSpacing: 5, color }}>
      {list.length ? (list.length === 1 ? 'NEXT SHOW' : 'UPCOMING SHOWS') : 'SHOWS'}
    </div>
  );
  // Their upcoming shows, one row each: a date chip, then the show and where it is
  const rows = (o: { chip: string; chipBorder: string; num: string; month: string; panel: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: story ? 14 : 10, marginTop: story ? 16 : 12 }}>
      {list.length ? list.map((s) => {
        const d = dayParts(s.date);
        return (
          <div key={s.slug} style={{ display: 'flex', alignItems: 'center', gap: 20 * k, padding: `${12 * k}px ${18 * k}px`, borderRadius: 24 * k, background: o.panel }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 92 * k, height: 92 * k, borderRadius: 20 * k, background: o.chip, border: o.chipBorder }}>
              <div style={{ display: 'flex', fontSize: 40 * k, letterSpacing: -2, lineHeight: 1, color: o.num }}>{d.num}</div>
              <div style={{ display: 'flex', marginTop: 2, fontSize: 17 * k, letterSpacing: 3, color: o.month }}>{d.month}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', fontSize: (s.title.length > 30 ? 28 : 33) * k, letterSpacing: -0.8, lineHeight: 1.08, color: '#fff' }}>{s.title}</div>
              <div style={{ display: 'flex', marginTop: 4, fontSize: 21 * k, color: 'rgba(255,255,255,0.62)' }}>{[d.day, where(s)].filter(Boolean).join(' · ')}</div>
            </div>
          </div>
        );
      }) : (
        <div style={{ display: 'flex', flexDirection: 'column', padding: `${22 * k}px ${26 * k}px`, borderRadius: 24 * k, background: o.panel }}>
          <div style={{ display: 'flex', fontSize: 32 * k, letterSpacing: -0.8, color: '#fff' }}>No dates announced yet</div>
          <div style={{ display: 'flex', marginTop: 4, fontSize: 21 * k, color: 'rgba(255,255,255,0.62)' }}>Follow on TsaCoal and hear first.</div>
        </div>
      )}
    </div>
  );

  let ground: JSX.Element = <Backdrop src={photo} w={W} h={H} />;
  let body: JSX.Element;
  if (t === 2) {
    // Full bleed: the artist fills the card, their name over the photo, the shows on a dark glass panel
    const INK = '4,18,11';
    ground = (
      <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, width: W, height: H, background: `rgb(${INK})` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {photo && <img src={sized(photo, 1080)} alt="" width={W} height={H} style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, objectFit: 'cover', objectPosition: '50% 18%' }} />}
        <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, width: W, height: 200, background: `linear-gradient(180deg, rgba(${INK},0.8) 0%, rgba(${INK},0) 100%)` }} />
        <div style={{ display: 'flex', position: 'absolute', left: 0, bottom: 0, width: W, height: story ? 1150 : 860, background: `linear-gradient(180deg, rgba(${INK},0) 0%, rgba(${INK},0.86) 38%, rgba(${INK},0.98) 100%)` }} />
      </div>
    );
    body = (
      <div style={COL}>
        {top}
        {spacer}
        <div style={{ display: 'flex', fontSize: story ? 26 : 22, letterSpacing: 6, color: tint }}>{genre}</div>
        <div style={{ display: 'flex', marginTop: 6, fontSize: nameSize(story ? 150 : 124), letterSpacing: -6, lineHeight: 0.92, color: '#fff' }}>{artist.name}</div>
        {label('rgba(255,255,255,0.55)')}
        {rows({ chip: 'rgba(255,255,255,0.08)', chipBorder: '2px solid rgba(255,255,255,0.16)', num: tint, month: '#fff', panel: 'rgba(255,255,255,0.06)' })}
        <div style={{ display: 'flex', marginTop: story ? 36 : 22, fontSize: story ? 26 : 22, letterSpacing: 1, color: 'rgba(255,255,255,0.6)' }}>{link}</div>
      </div>
    );
  } else if (t === 3) {
    // Neon: the photo in a pink-violet glowing ring, the name in light, the shows with glowing date chips
    const N = 'linear-gradient(135deg, #FF7AB8 0%, #B58CFF 100%)';
    ground = (
      <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, width: W, height: H }}>
        <Backdrop src={photo} w={W} h={H} strength={0.7} />
        <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, width: W, height: H, background: 'linear-gradient(160deg, rgba(120,70,255,0.42) 0%, rgba(20,8,40,0.5) 45%, rgba(255,80,160,0.3) 100%)' }} />
      </div>
    );
    const fw = story ? 560 : 360;
    body = (
      <div style={COL}>
        {top}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: story ? 70 : 34 }}>
          <div style={{ display: 'flex', padding: 9, borderRadius: fw, background: N, boxShadow: '0 0 90px rgba(181,140,255,0.45)' }}>{pic(fw, fw, fw)}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', textAlign: 'center', marginTop: story ? 36 : 22, fontSize: nameSize(story ? 120 : 100), letterSpacing: -5, lineHeight: 0.95, ...gText('linear-gradient(180deg, #FFFFFF 0%, #FFD6EA 60%, #D9C2FF 100%)') }}>{artist.name}</div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8, fontSize: story ? 24 : 20, letterSpacing: 6, color: '#FFB8DA' }}>{genre}</div>
        {spacer}
        {rows({ chip: N, chipBorder: '0px solid transparent', num: '#1B0B2E', month: '#1B0B2E', panel: 'rgba(255,255,255,0.08)' })}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: story ? 34 : 20 }}>
          <div style={{ display: 'flex', padding: story ? '16px 30px' : '12px 26px', borderRadius: 999, background: '#fff', fontSize: story ? 28 : 23, color: '#1B0B2E' }}>{link}</div>
        </div>
      </div>
    );
  } else {
    // Spotlight: the artist's photo large across the top with their name on it, the shows underneath.
    // The photo takes whatever room the shows leave, so the card is always full.
    const n = Math.max(1, list.length);
    const rowH = 116 * k, gap = story ? 14 : 10;
    const inner = H - (story ? 142 : 108);
    const PH = Math.round(inner - (story ? 50 : 44) - (story ? 34 : 26) - (n * rowH + (n - 1) * gap) - (story ? 16 : 12) - (story ? 64 : 46));
    const PW = W - (story ? 144 : 128);
    body = (
      <div style={COL}>
        {top}
        <div style={{ display: 'flex', position: 'relative', width: PW, height: PH, marginTop: story ? 34 : 26, borderRadius: 36, overflow: 'hidden', background: '#111815', boxShadow: '0 30px 70px rgba(0,0,0,0.55)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {photo && <img src={sized(photo, 1080)} alt="" width={PW} height={PH} style={{ position: 'absolute', top: 0, left: 0, width: PW, height: PH, objectFit: 'cover', objectPosition: '50% 20%' }} />}
          <div style={{ display: 'flex', position: 'absolute', left: 0, bottom: 0, width: PW, height: Math.round(PH * 0.5), background: 'linear-gradient(180deg, rgba(4,10,7,0) 0%, rgba(4,10,7,0.75) 60%, rgba(4,10,7,0.92) 100%)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', left: story ? 44 : 36, right: story ? 44 : 36, bottom: story ? 40 : 30 }}>
            <div style={{ display: 'flex' }}>
              <div style={{ display: 'flex', padding: `${8 * k}px ${18 * k}px`, borderRadius: 999, background: G_MINT, fontSize: 19 * k, letterSpacing: 4, color: ON_MINT }}>{genre}</div>
            </div>
            <div style={{ display: 'flex', marginTop: 14, fontSize: nameSize(story ? 150 : 128), letterSpacing: -6, lineHeight: 0.92, ...gText(G_TEXT) }}>{artist.name}</div>
          </div>
        </div>
        {rows({ chip: G_MINT, chipBorder: '0px solid transparent', num: ON_MINT, month: ON_MINT, panel: G_TICKET })}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: story ? 30 : 18, fontSize: story ? 26 : 22, color: 'rgba(255,255,255,0.55)' }}>{link}</div>
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
