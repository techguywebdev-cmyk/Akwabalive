import { ImageResponse } from 'next/og';
import { getArtistBySlug } from '@/lib/data/artists';
import { rest, person as getPerson, cleanUser, sized, dayParts, PersonPill, firstName, MINT_TEXT, ON_MINT, G_MINT, G_TEXT, G_TICKET, gText, setOrigin } from '@/lib/shareCard';

export const runtime = 'edge';

const displayFont = () => fetch(new URL('../../../assets/InterTight-800.woff', import.meta.url)).then((r) => r.arrayBuffer()).catch(() => null);

type M = { title: string; event_name: string | null; year: number | null; youtube_id: string | null; thumbnail_url: string | null; source: string | null; performers: string[] | null };
type Ev = { slug: string; title: string; date: string; venue: string | null; city: string | null; image_url: string | null };

const clean = (s: string) => s.replace(/\s*[|｜].*$/, '').replace(/\s*\((official|live|full)[^)]*\)/gi, '').replace(/#\S+/g, '').trim();

/**
 * A clip from a night as a picture to share: the still big with a play button, the night's name, and the next
 * edition on a ticket stub (?next=event-slug). Post (default), story, or ?format=og; ?u=username adds the sharer.
 */
export async function GET(req: Request) {
  setOrigin(req.url);
  const q = new URL(req.url).searchParams;
  const id = q.get('id') ?? '';
  if (!/^[a-zA-Z0-9-]{4,64}$/.test(id)) return new Response('Not found', { status: 404 });
  const format = q.get('format') === 'og' ? 'og' : q.get('format') === 'story' ? 'story' : 'post';
  const u = cleanUser(q.get('u'));
  const nextSlug = q.get('next')?.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 120) || null;

  // Shorts have a vertical frame of their own; their wide still is mostly black bars
  const vertical = (yt: string) => fetch(`https://i.ytimg.com/vi/${yt}/oar2.jpg`, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
  const [font, rows, evs, p] = await Promise.all([
    displayFont(),
    rest<M[]>(`moments?select=title,event_name,year,youtube_id,thumbnail_url,source,performers&id=eq.${id}&limit=1`),
    nextSlug ? rest<Ev[]>(`events?select=slug,title,date,venue,city,image_url&slug=eq.${nextSlug}&status=eq.published&limit=1`) : Promise.resolve(null),
    getPerson(u),
  ]);
  const m = rows?.[0];
  if (!m) return new Response('Not found', { status: 404 });
  const next = evs?.[0] && evs[0].date >= new Date().toISOString().slice(0, 10) ? evs[0] : null;
  const yt = m.source === 'upload' || m.source === 'x' ? null : m.youtube_id;
  const tall = yt ? await vertical(yt) : false;
  const still = yt ? `https://i.ytimg.com/vi/${yt}/${tall ? 'oar2' : 'maxresdefault'}.jpg` : m.thumbnail_url;
  // The night's name as the headline, and a short line under it: who was on and when (never the long video title)
  const title = m.event_name || clean(m.title) || m.title;
  const acts = (m.performers ?? []).map((x) => getArtistBySlug(x)?.name).filter(Boolean).slice(0, 2) as string[];
  const summary = [acts.length ? `${acts.join(' & ')} live` : 'Live', m.year].filter(Boolean).join(' · ');
  const ff = font ? 'Inter Tight' : undefined;
  const fonts = font ? [{ name: 'Inter Tight', data: font, weight: 800 as const, style: 'normal' as const }] : undefined;
  const tSize = (base: number) => (title.length > 22 ? base * 0.72 : title.length > 14 ? base * 0.86 : base);
  const where = (s: Ev) => [s.venue && !/to be announced|tba/i.test(s.venue) ? s.venue : null, s.city ? s.city.charAt(0).toUpperCase() + s.city.slice(1) : null].filter(Boolean).join(', ');
  const headers = { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' };

  const play = (size: number) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, borderRadius: 999, backgroundImage: G_MINT, boxShadow: '0 20px 50px rgba(0,0,0,0.55)' }}>
      <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" style={{ marginLeft: size * 0.06 }}><path d="M6 3.5v17a1 1 0 0 0 1.5.86l14-8.5a1 1 0 0 0 0-1.72l-14-8.5A1 1 0 0 0 6 3.5z" fill={ON_MINT} /></svg>
    </div>
  );

  const stub = (s: Ev, k: number) => {
    const d = dayParts(s.date);
    return (
      <div style={{ display: 'flex', alignItems: 'center', width: '100%', borderRadius: 28 * k, background: G_TICKET, border: '2px solid rgba(123,227,168,0.22)', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.45)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 130 * k, padding: `${20 * k}px 0` }}>
          <div style={{ display: 'flex', fontSize: 20 * k, letterSpacing: 3 * k, ...gText(G_MINT) }}>{d.month}</div>
          <div style={{ display: 'flex', fontSize: 64 * k, letterSpacing: -3 * k, lineHeight: 1, color: '#fff' }}>{d.num}</div>
          <div style={{ display: 'flex', fontSize: 17 * k, letterSpacing: 2 * k, color: 'rgba(255,255,255,0.5)' }}>{d.day}</div>
        </div>
        <div style={{ display: 'flex', alignSelf: 'stretch', width: 0, borderLeft: `${3 * k}px dashed rgba(255,255,255,0.16)`, margin: `${16 * k}px 0` }} />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: `${16 * k}px ${24 * k}px` }}>
          <div style={{ display: 'flex', fontSize: 18 * k, letterSpacing: 4 * k, ...gText(G_MINT) }}>NEXT EDITION</div>
          <div style={{ display: 'flex', marginTop: 4 * k, fontSize: (s.title.length > 30 ? 30 : 36) * k, letterSpacing: -1.2 * k, lineHeight: 1.05, color: '#fff' }}>{s.title}</div>
          {where(s) && <div style={{ display: 'flex', marginTop: 6 * k, fontSize: 21 * k, color: 'rgba(255,255,255,0.58)' }}>{where(s)}</div>}
        </div>
        {s.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sized(s.image_url, 300)} alt="" width={92 * k} height={115 * k} style={{ width: 92 * k, height: 115 * k, objectFit: 'cover', borderRadius: 16 * k, marginRight: 18 * k }} />
        )}
      </div>
    );
  };

  const greeting = (k: number) => p
    ? <PersonPill p={p} line={`${firstName(p)} says`} tail="you had to be there." scale={k} />
    : <div style={{ display: 'flex', padding: `${12 * k}px ${26 * k}px`, borderRadius: 999, background: 'rgba(8,13,10,0.72)', border: '2px solid rgba(123,227,168,0.25)', fontSize: 24 * k, letterSpacing: 5 * k, color: MINT_TEXT }}>YOU HAD TO BE THERE</div>;

  if (format === 'og') {
    const W = 1200, H = 630;
    return new ImageResponse(
      (
        <div style={{ position: 'relative', width: W, height: H, display: 'flex', fontFamily: ff, background: '#070B09' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {still && <img src={sized(still, 1080)} alt="" width={W} height={H} style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, objectFit: 'cover' }} />}
          <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, width: W, height: H, background: 'linear-gradient(90deg, rgba(5,8,6,0.94) 0%, rgba(5,8,6,0.78) 45%, rgba(5,8,6,0.2) 100%)' }} />
          <div style={{ display: 'flex', position: 'absolute', top: 245, left: 960 }}>{play(140)}</div>
          <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', top: 50, left: 56, width: 680, height: 530 }}>
            <div style={{ display: 'flex', fontSize: 34, letterSpacing: -1.4, color: '#fff' }}>TsaCoal</div>
            <div style={{ display: 'flex', flex: 1 }} />
            <div style={{ display: 'flex', fontSize: tSize(84), letterSpacing: -3.5, lineHeight: 0.98, ...gText(G_TEXT) }}>{title}</div>
            <div style={{ display: 'flex', marginTop: 12, fontSize: 28, color: 'rgba(255,255,255,0.62)' }}>{summary}</div>
            <div style={{ display: 'flex', marginTop: 30 }}>{next ? stub(next, 0.7) : greeting(0.7)}</div>
          </div>
        </div>
      ),
      { width: W, height: H, headers, fonts },
    );
  }

  // Post (1080×1350) or story (1080×1920): the still across the top, the night and the next edition below
  const story = format === 'story';
  const W = 1080, H = story ? 1920 : 1350, VH = story ? (next ? 1000 : 1180) : (next ? 700 : 860);
  return new ImageResponse(
    (
      <div style={{ position: 'relative', width: W, height: H, display: 'flex', fontFamily: ff, background: '#070B09' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {still && <img src={sized(still, 1080)} alt="" width={W} height={VH} style={{ position: 'absolute', top: 0, left: 0, width: W, height: VH, objectFit: 'cover', objectPosition: tall ? '50% 30%' : '50% 50%' }} />}
        <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, width: W, height: H, background: `linear-gradient(180deg, rgba(5,8,6,0.6) 0px, rgba(5,8,6,0) ${Math.round(VH * 0.25)}px, rgba(5,8,6,0) ${Math.round(VH * 0.55)}px, rgba(5,8,6,0.9) ${Math.round(VH * 0.9)}px, #060907 ${VH}px, #060907 100%)` }} />
        <div style={{ display: 'flex', position: 'absolute', top: VH, left: 0, width: W, height: H - VH, background: 'radial-gradient(70% 60% at 100% 100%, rgba(40,190,200,0.16) 0%, rgba(40,190,200,0) 100%), radial-gradient(60% 50% at 0% 70%, rgba(70,220,150,0.14) 0%, rgba(70,220,150,0) 100%)' }} />
        <div style={{ display: 'flex', position: 'absolute', top: Math.round(VH * 0.42) - (story ? 80 : 65), left: W / 2 - (story ? 80 : 65) }}>{play(story ? 160 : 130)}</div>
        <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', top: 0, left: 0, width: W, height: H, padding: story ? '78px 72px 64px' : '56px 64px 48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', fontSize: story ? 42 : 36, letterSpacing: -1.5, color: '#fff' }}>TsaCoal</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: story ? 24 : 21, letterSpacing: 4, color: 'rgba(255,255,255,0.75)' }}>
              <div style={{ display: 'flex', width: 12, height: 12, borderRadius: 4, backgroundImage: G_MINT }} />MOMENTS
            </div>
          </div>
          <div style={{ display: 'flex', flex: 1 }} />
          <div style={{ display: 'flex' }}>{greeting(story ? 1 : 0.82)}</div>
          <div style={{ display: 'flex', marginTop: story ? 56 : 40, fontSize: tSize(story ? 132 : 108), letterSpacing: -5, lineHeight: 0.95, ...gText(G_TEXT) }}>{title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: story ? 22 : 16, fontSize: story ? 36 : 30, color: 'rgba(255,255,255,0.62)' }}>
            <div style={{ display: 'flex', width: 10, height: 10, borderRadius: 5, backgroundImage: G_MINT }} />{summary}
          </div>
          {next && <div style={{ display: 'flex', marginTop: story ? 44 : 30 }}>{stub(next, story ? 1 : 0.84)}</div>}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: story ? 56 : 40, fontSize: story ? 26 : 22, color: 'rgba(255,255,255,0.45)' }}>Watch it on tsacoal.com</div>
        </div>
      </div>
    ),
    { width: W, height: H, headers, fonts },
  );
}
