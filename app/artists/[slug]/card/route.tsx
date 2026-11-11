import { ImageResponse } from 'next/og';
import { getArtistBySlug } from '@/lib/data/artists';
import { rest, person as getPerson, cleanUser, sized, dayParts, Backdrop, PersonPill, firstName, MINT, MINT_TEXT, G_MINT, G_TEXT, G_TICKET, gText, setOrigin } from '@/lib/shareCard';

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
      <div style={{ display: 'flex', marginTop: 6 * k, fontSize: 22 * k, color: 'rgba(255,255,255,0.58)' }}>Follow on Tsacoal and hear first.</div>
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
      { width: W, height: H, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' }, fonts },
    );
  }

  // Post (1080×1350, whole on X, Instagram and WhatsApp) or story (1080×1920)
  const story = format === 'story';
  const W = 1080, H = story ? 1920 : 1350, PH = story ? 1150 : 760;
  return new ImageResponse(
    (
      <div style={{ position: 'relative', width: W, height: H, display: 'flex', fontFamily: ff, background: '#070B09' }}>
        {/* The artist big at the top, fading into the page */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {photo && <img src={sized(photo, 1080)} alt="" width={W} height={PH} style={{ position: 'absolute', top: 0, left: 0, width: W, height: PH, objectFit: 'cover', objectPosition: '50% 18%' }} />}
        <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, width: W, height: H, background: `linear-gradient(180deg, rgba(5,8,6,0.55) 0px, rgba(5,8,6,0) ${Math.round(PH * 0.22)}px, rgba(5,8,6,0) ${Math.round(PH * 0.55)}px, rgba(5,8,6,0.88) ${Math.round(PH * 0.88)}px, #060907 ${PH}px, #060907 100%)` }} />
        <div style={{ display: 'flex', position: 'absolute', top: PH, left: 0, width: W, height: H - PH, background: 'radial-gradient(70% 60% at 100% 100%, rgba(40,190,200,0.16) 0%, rgba(40,190,200,0) 100%), radial-gradient(60% 50% at 0% 20%, rgba(70,220,150,0.16) 0%, rgba(70,220,150,0) 100%)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', top: 0, left: 0, width: W, height: H, padding: story ? '78px 72px 64px' : '56px 64px 48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', fontSize: story ? 42 : 36, letterSpacing: -1.5, color: '#fff' }}><span style={{ backgroundImage: 'linear-gradient(135deg, #D2FBE3 0%, #8FEBB7 34%, #5AD99A 68%, #2FB97E 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>Tsa</span><span>Coal</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: story ? 24 : 21, letterSpacing: 4, color: 'rgba(255,255,255,0.75)' }}>
              <div style={{ display: 'flex', width: 12, height: 12, borderRadius: 4, background: G_MINT }} />LIVE IN GHANA
            </div>
          </div>
          <div style={{ display: 'flex', flex: 1 }} />
          <div style={{ display: 'flex' }}>{greeting(story ? 1 : 0.82)}</div>
          {artist.genre && <div style={{ display: 'flex', marginTop: story ? 34 : 22, fontSize: story ? 26 : 22, letterSpacing: 6, ...gText(G_MINT) }}>{artist.genre.toUpperCase()}</div>}
          <div style={{ display: 'flex', marginTop: 6, fontSize: nameSize(story ? 150 : 124), letterSpacing: -6, lineHeight: 0.92, ...gText(G_TEXT) }}>{artist.name}</div>
          <div style={{ display: 'flex', marginTop: story ? 44 : 28, fontSize: story ? 24 : 20, letterSpacing: 5, color: 'rgba(255,255,255,0.5)' }}>{list.length ? (list.length === 1 ? 'NEXT SHOW' : 'NEXT SHOWS') : 'SHOWS'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: story ? 18 : 12, marginTop: story ? 18 : 12 }}>{list.length ? list.map((s) => stub(s, story ? 1 : 0.84)) : empty(story ? 1 : 0.84)}</div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: story ? 40 : 24, fontSize: story ? 26 : 22, color: 'rgba(255,255,255,0.5)' }}>tsacoal.com/artists/{artist.slug}</div>
        </div>
      </div>
    ),
    { width: W, height: H, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' }, fonts },
  );
}
