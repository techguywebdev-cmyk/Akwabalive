import Link from 'next/link';
import FlyerWall from '@/components/ui/FlyerWall';
import { T, FONT, GROUND, GRAD } from '@/lib/thiscene';
import { hiRes } from '@/lib/events/image';

export const metadata = { title: 'Not found — Tsacoal' };
export const revalidate = 600;

type Soon = { slug: string; title: string; date: string; image_url: string };

/** What's coming up, so a dead link still leads somewhere good */
async function soon(): Promise<Soon[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  const today = new Date().toISOString().slice(0, 10);
  try {
    const r = await fetch(`${url}/rest/v1/events?select=slug,title,date,image_url&status=eq.published&date=gte.${today}&image_url=not.is.null&order=is_hot.desc,date.asc&limit=10`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 600 } });
    const rows = r.ok ? ((await r.json()) as Soon[]) : [];
    return rows.filter((e) => !/images\.unsplash\.com/.test(e.image_url));
  } catch { return []; }
}

const day = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

export default async function NotFound() {
  const shows = await soon();
  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed' }}>
      {shows.length > 0 && (
        <div style={{ position: 'relative', height: 'calc(min(52vw, 250px) + env(safe-area-inset-top, 0px))' }}>
          <FlyerWall images={shows.map((s) => hiRes(s.image_url, 360) ?? s.image_url)} height="calc(100% + 160px)" strength={0.6} />
        </div>
      )}
      <main style={{ position: 'relative', zIndex: 2, maxWidth: 640, margin: '0 auto', padding: `${shows.length ? 0 : 120}px 20px 70px` }}>
        <Link href="/" style={{ display: 'inline-block', fontFamily: FONT.display, fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', color: T.white, textDecoration: 'none' }}>Tsacoal</Link>
        <p style={{ margin: '22px 0 0', fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.mintText }}>Page not found</p>
        <h1 style={{ margin: '8px 0 0', fontFamily: FONT.display, fontSize: 'clamp(36px, 10vw, 52px)', fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.0, background: GRAD.text, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>
          This one left the party
        </h1>
        <p style={{ margin: '12px 0 0', maxWidth: 440, fontFamily: FONT.sans, fontSize: 15.5, lineHeight: 1.55, color: T.text2 }}>
          The link may be old, or the show was taken down. Here’s what’s on instead.
        </p>

        {shows.length > 0 && (
          <section style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>Coming up</h2>
              <Link href="/events" style={{ fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 600, color: T.mintText, textDecoration: 'none' }}>See all</Link>
            </div>
            <div className="ak-noscroll" style={{ display: 'flex', gap: 12, marginTop: 14, marginRight: -20, paddingRight: 20, overflowX: 'auto', scrollSnapType: 'x mandatory' }}>
              {shows.slice(0, 8).map((s) => (
                <Link key={s.slug} href={`/events/${s.slug}`} style={{ width: 138, flexShrink: 0, scrollSnapAlign: 'start', textDecoration: 'none' }}>
                  <span style={{ position: 'relative', display: 'block', aspectRatio: '4 / 5', borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', boxShadow: '0 10px 26px rgba(0,0,0,0.4)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={hiRes(s.image_url, 400) ?? s.image_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <span style={{ position: 'absolute', left: 7, top: 7, height: 22, padding: '0 8px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', background: 'rgba(5,10,7,0.72)', color: T.white, fontFamily: FONT.sans, fontSize: 11.5, fontWeight: 700 }}>{day(s.date)}</span>
                  </span>
                  <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: 8, fontFamily: FONT.display, fontSize: 14.5, fontWeight: 700, lineHeight: 1.25, color: T.white }}>{s.title}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 30 }}>
          <Link href="/" style={{ height: 44, padding: '0 20px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', background: GRAD.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>Go to the feed</Link>
          <Link href="/moments" style={{ fontFamily: FONT.sans, fontSize: 14.5, fontWeight: 600, color: T.text2, textDecoration: 'none' }}>Watch moments</Link>
        </div>
      </main>
    </div>
  );
}
