import { ImageResponse } from 'next/og';
import { getArtistBySlug } from '@/lib/data/artists';
import { rest, person as getPerson, cleanUser, sized, dayParts, Backdrop, PersonPill, GoingMark, liftTint, firstName, MINT, MINT_TEXT, G_MINT, G_TEXT, G_TICKET, ON_MINT, gText, setOrigin } from '@/lib/shareCard';

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
  const u = cleanUser(q.get('u'));
  const today = new Date().toISOString().slice(0, 10);
  const name = artist.name.replace(/[,()*]/g, ' ').trim();

  const [font, prof, shows, p] = await Promise.all([
    displayFont(),
    rest<{ spotify_image: string | null; photo_url: string | null }[]>(`artist_profiles?select=spotify_image,photo_url&slug=eq.${encodeURIComponent(artist.slug)}&limit=1`),
    rest<Show[]>(`events?select=slug,title,date,venue,city,image_url&status=eq.published&date=gte.${today}&or=${encodeURIComponent(`(artist_slugs.cs.{${artist.slug}},title.ilike.*${name}*)`)}&order=date&limit=${format === 'story' ? 3 : 2}`),
    getPerson(u),
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

  const greeting = (k: number) => p
    ? <PersonPill p={p} line={`${firstName(p)} says`} tail={list.length ? `catch ${artist.name} live.` : `watch ${artist.name}.`} scale={k} />
    : <div style={{ display: 'flex', padding: `${12 * k}px ${26 * k}px`, borderRadius: 999, background: 'rgba(8,13,10,0.72)', fontSize: 24 * k, letterSpacing: 5 * k, color: MINT_TEXT }}>{list.length ? `CATCH ${artist.name.toUpperCase()} LIVE` : `${artist.name.toUpperCase()} ON TSACOAL`}</div>;

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
  const next = list[0];
  const nd = next ? dayParts(next.date) : null;
  const COL = { display: 'flex', flexDirection: 'column', flex: 1, width: '100%' } as const;
  const spacer = <div style={{ display: 'flex', flex: 1 }} />;
  const link = `tsacoal.com/artists/${artist.slug}`;
  const nudge = list.length ? `Catch ${artist.name} live` : `${artist.name} on TsaCoal`;
  const mark = (ring: string) => p
    ? <GoingMark p={p} scale={story ? 1.1 : 0.95} ring={ring} label={list.length ? `${firstName(p).toUpperCase()}’S GOING` : `${firstName(p).toUpperCase()}’S A FAN`} />
    : null;
  const top = (right: JSX.Element | null) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', fontSize: story ? 42 : 36, letterSpacing: -1.5, color: '#fff' }}>TsaCoal</div>
      {right ?? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: story ? 24 : 21, letterSpacing: 4, color: 'rgba(255,255,255,0.7)' }}>
          <div style={{ display: 'flex', width: 12, height: 12, borderRadius: 4, background: G_MINT }} />{artist.genre ? artist.genre.toUpperCase() : 'LIVE IN GHANA'}
        </div>
      )}
    </div>
  );
  const pic = (w: number, h: number, radius: number, extra: Record<string, string | number> = {}) => (
    <div style={{ display: 'flex', position: 'relative', width: w, height: h, borderRadius: radius, overflow: 'hidden', background: '#111815', ...extra }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {photo && <img src={sized(photo, 1080)} alt="" width={w} height={h} style={{ width: w, height: h, objectFit: 'cover', objectPosition: '50% 22%' }} />}
    </div>
  );
  // Further shows as one quiet line each: date, then the show
  const more = (from: number, color: string, size: number) => list.slice(from).map((s) => {
    const d = dayParts(s.date);
    return (
      <div key={s.slug} style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10, fontSize: size, color: 'rgba(255,255,255,0.8)' }}>
        <div style={{ display: 'flex', fontSize: size * 0.85, letterSpacing: 3, color }}>{`${d.num} ${d.month}`}</div>
        <div style={{ display: 'flex' }}>{[s.title, s.city ? s.city.charAt(0).toUpperCase() + s.city.slice(1) : null].filter(Boolean).join(' · ')}</div>
      </div>
    );
  });

  let ground: JSX.Element = <Backdrop src={photo} w={W} h={H} />;
  let body: JSX.Element;
  if (t === 2) {
    // Full bleed: the artist fills the card; name, a tilted banner and the next show along the bottom
    const INK = '4,18,11';
    ground = (
      <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, width: W, height: H, background: `rgb(${INK})` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {photo && <img src={sized(photo, 1080)} alt="" width={W} height={H} style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, objectFit: 'cover', objectPosition: '50% 18%' }} />}
        <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, width: W, height: 200, background: `linear-gradient(180deg, rgba(${INK},0.8) 0%, rgba(${INK},0) 100%)` }} />
        <div style={{ display: 'flex', position: 'absolute', left: 0, bottom: 0, width: W, height: story ? 1000 : 720, background: `linear-gradient(180deg, rgba(${INK},0) 0%, rgba(${INK},0.88) 45%, rgba(${INK},0.98) 100%)` }} />
      </div>
    );
    const cal = (sz: number) => (
      <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M8 14h2M14 14h2M8 17.5h2" />
      </svg>
    );
    body = (
      <div style={COL}>
        {top(mark(MINT))}
        {spacer}
        <div style={{ display: 'flex', justifyContent: 'center', textAlign: 'center', fontSize: nameSize(story ? 150 : 128), letterSpacing: -6, lineHeight: 0.92, color: '#fff' }}>{artist.name}</div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: story ? 36 : 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: `${12 * k}px ${44 * k}px`, borderRadius: '18px 44px 22px 40px', background: 'linear-gradient(100deg, #1F9D55 0%, #3FCB7C 45%, #7BE3A8 100%)', transform: 'rotate(-3deg)', boxShadow: '0 16px 36px rgba(0,0,0,0.45)', fontSize: 32 * k, letterSpacing: 1, color: '#fff' }}>{`${nudge}!`}</div>
        </div>
        {next && nd ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: story ? 44 : 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 * k }}>
              {cal(70 * k)}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', fontSize: 28 * k, letterSpacing: 3, color: '#fff' }}>{nd.day}</div>
                <div style={{ display: 'flex', fontSize: 80 * k, letterSpacing: -3, lineHeight: 0.95, color: tint }}>{nd.num}</div>
                <div style={{ display: 'flex', fontSize: 28 * k, letterSpacing: 3, color: '#fff' }}>{nd.month}</div>
              </div>
            </div>
            <div style={{ display: 'flex', width: 4, height: 124 * k, margin: `0 ${36 * k}px`, borderRadius: 2, background: 'rgba(255,255,255,0.85)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 500 * k }}>
              <div style={{ display: 'flex', fontSize: (next.title.length > 26 ? 32 : 38) * k, letterSpacing: -0.8, lineHeight: 1.1, color: '#fff' }}>{next.title}</div>
              {where(next) && <div style={{ display: 'flex', marginTop: 6, fontSize: 25 * k, color: 'rgba(255,255,255,0.75)' }}>{where(next)}</div>}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: story ? 40 : 26, fontSize: 28 * k, color: 'rgba(255,255,255,0.78)' }}>No dates yet. Follow and hear first.</div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: story ? 44 : 28, fontSize: story ? 26 : 22, letterSpacing: 1, color: 'rgba(255,255,255,0.6)' }}>{link}</div>
      </div>
    );
  } else if (t === 3) {
    // Neon: the photo framed in a pink-violet glow, the name in light, the next date as glowing tiles
    const N = 'linear-gradient(135deg, #FF7AB8 0%, #B58CFF 100%)';
    ground = (
      <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, width: W, height: H }}>
        <Backdrop src={photo} w={W} h={H} strength={0.7} />
        <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, width: W, height: H, background: 'linear-gradient(160deg, rgba(120,70,255,0.42) 0%, rgba(20,8,40,0.5) 45%, rgba(255,80,160,0.3) 100%)' }} />
      </div>
    );
    const tile = (txt: string | number, big = false) => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: (big ? 130 : 150) * k, height: 90 * k, borderRadius: 24, background: big ? N : 'rgba(255,255,255,0.1)', border: big ? '0px solid transparent' : '2px solid rgba(255,255,255,0.22)', fontSize: (big ? 62 : 34) * k, letterSpacing: big ? -3 : 6, color: big ? '#1B0B2E' : '#fff' }}>{txt}</div>
    );
    const fw = story ? 800 : 520;
    body = (
      <div style={COL}>
        {top(mark('#FF9BCB'))}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: story ? 70 : 40 }}>
          <div style={{ display: 'flex', padding: 9, borderRadius: fw, background: N, boxShadow: '0 0 90px rgba(181,140,255,0.45)' }}>{pic(fw, fw, fw)}</div>
        </div>
        {spacer}
        <div style={{ display: 'flex', justifyContent: 'center', textAlign: 'center', fontSize: nameSize(story ? 130 : 110), letterSpacing: -5, lineHeight: 0.95, ...gText('linear-gradient(180deg, #FFFFFF 0%, #FFD6EA 60%, #D9C2FF 100%)') }}>{artist.name}</div>
        {next && nd ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: story ? 34 : 22 }}>
            <div style={{ display: 'flex', gap: 12 }}>{tile(nd.day)}{tile(nd.num, true)}{tile(nd.month)}</div>
            <div style={{ display: 'flex', textAlign: 'center', marginTop: 14, fontSize: story ? 30 : 26, color: 'rgba(255,255,255,0.75)' }}>{[next.title, where(next)].filter(Boolean).join(' · ')}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18, fontSize: story ? 30 : 26, color: 'rgba(255,255,255,0.75)' }}>No dates yet. Follow and hear first.</div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: story ? 34 : 22 }}>
          <div style={{ display: 'flex', padding: story ? '16px 30px' : '13px 26px', borderRadius: 999, background: '#fff', fontSize: story ? 28 : 24, color: '#1B0B2E' }}>{link}</div>
        </div>
      </div>
    );
  } else {
    // Poster: the artist as a tilted photo print, a round mint sticker with the next date on its corner
    const FW = story ? 720 : 580, FH = Math.round(FW * 1.15);
    body = (
      <div style={COL}>
        {top(mark(MINT))}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: story ? 70 : 40 }}>
          <div style={{ display: 'flex', position: 'relative', width: FW, height: FH, transform: 'rotate(-3deg)' }}>
            {pic(FW, FH, 30, { boxShadow: '0 40px 80px rgba(0,0,0,0.6)', border: '10px solid #F3FBF6' })}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'absolute', right: story ? 24 : -150, bottom: story ? -150 : -10, width: story ? 220 : 196, height: story ? 220 : 196, borderRadius: 999, background: G_MINT, transform: 'rotate(10deg)', boxShadow: '0 24px 50px rgba(0,0,0,0.55)', border: '6px solid rgba(255,255,255,0.35)' }}>
              {nd ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ display: 'flex', fontSize: story ? 28 : 24, letterSpacing: 4, color: ON_MINT }}>{nd.day}</div>
                  <div style={{ display: 'flex', fontSize: story ? 90 : 80, letterSpacing: -5, lineHeight: 0.95, color: ON_MINT }}>{nd.num}</div>
                  <div style={{ display: 'flex', fontSize: story ? 28 : 24, letterSpacing: 4, color: ON_MINT }}>{nd.month}</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: story ? 30 : 26, letterSpacing: 3, color: ON_MINT }}><div style={{ display: 'flex' }}>FOLLOW</div><div style={{ display: 'flex' }}>ON</div><div style={{ display: 'flex' }}>TSACOAL</div></div>
              )}
            </div>
          </div>
        </div>
        {spacer}
        <div style={{ display: 'flex', fontSize: nameSize(story ? 140 : 116), letterSpacing: -6, lineHeight: 0.92, ...gText(G_TEXT) }}>{artist.name}</div>
        {next ? (
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: story ? 22 : 14 }}>
            <div style={{ display: 'flex', fontSize: story ? 34 : 29, letterSpacing: -0.6, color: '#fff' }}>{[next.title, where(next)].filter(Boolean).join(' · ')}</div>
            {more(1, MINT_TEXT, story ? 26 : 22)}
          </div>
        ) : (
          <div style={{ display: 'flex', marginTop: 14, fontSize: story ? 32 : 27, color: 'rgba(255,255,255,0.7)' }}>No dates yet. Follow and hear first.</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: story ? 40 : 26, padding: story ? '22px 34px' : '17px 28px', borderRadius: 999, background: G_MINT }}>
          <div style={{ display: 'flex', fontSize: story ? 30 : 25, color: ON_MINT }}>{nudge}</div>
          <div style={{ display: 'flex', fontSize: story ? 28 : 24, color: ON_MINT }}>tsacoal.com</div>
        </div>
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
