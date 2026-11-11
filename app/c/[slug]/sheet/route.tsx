import { ImageResponse } from 'next/og';
import { sheetMonths, shortName, WEEKDAYS, type SheetEvent } from '@/lib/calendarSheet';

export const runtime = 'edge';

const displayFont = () => fetch(new URL('../../../../assets/InterTight-800.woff', import.meta.url)).then((r) => r.arrayBuffer()).catch(() => null);

async function rest<T>(path: string): Promise<T | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const r = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' }).catch(() => null);
  return r && r.ok ? ((await r.json()) as T) : null;
}

/** Cloudinary flyers come down small; others as they are */
const small = (u: string) => (u.includes('res.cloudinary.com') ? u.replace('/upload/', '/upload/w_300,c_limit,f_jpg/') : u);

const W = 1080, PAD = 64, GAP = 12;
const CELL = Math.floor((W - PAD * 2 - GAP * 6) / 7);
const FLYER_H = Math.round(CELL * 1.25);
const FULL_ROW = FLYER_H + 40, THIN_ROW = 58, MONTH_HEAD = 132;

/**
 * The calendar as one picture to share (story size or longer): the name, who made it, then each month with the
 * flyer and name of every show on its date. Public calendars only.
 */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const [font, rows] = await Promise.all([
    displayFont(),
    rest<{ title: string; profiles: { full_name: string | null; username: string | null } | null; calendar_events: { event_slug: string }[] }[]>(
      `calendars?select=title,profiles(full_name,username),calendar_events(event_slug)&slug=eq.${encodeURIComponent(params.slug)}&is_public=eq.true&limit=1`),
  ]);
  const c = rows?.[0];
  if (!c) return new Response('Not found', { status: 404 });
  const slugs = c.calendar_events.map((e) => e.event_slug);
  const events = slugs.length ? (await rest<SheetEvent[]>(`events?select=slug,title,date,image_url&slug=in.(${slugs.map((s) => `"${s}"`).map(encodeURIComponent).join(',')})&order=date`)) ?? [] : [];
  const months = sheetMonths(events);
  const who = params.slug.startsWith('akwaaba-') ? 'TsaCoal' : c?.profiles?.full_name || c?.profiles?.username || 'Someone';

  const body = months.reduce((h, mo) => h + MONTH_HEAD + mo.weeks.reduce((s, w) => s + (w.full ? FULL_ROW : THIN_ROW) + GAP, 0) + 30, 0);
  const H = Math.max(1350, Math.min(3200, 300 + body + 150));

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', padding: `${PAD}px ${PAD}px 0`, fontFamily: font ? 'Inter Tight' : undefined,
        background: 'radial-gradient(80% 30% at 20% 0%, rgba(70,220,150,0.30) 0%, rgba(70,220,150,0) 100%), radial-gradient(60% 25% at 90% 8%, rgba(40,190,200,0.18) 0%, rgba(40,190,200,0) 100%), linear-gradient(180deg, #0C1611 0%, #070B09 60%, #050606 100%)' }}>
        <div style={{ display: 'flex', fontSize: 26, letterSpacing: 6, textTransform: 'uppercase', color: '#A8F0C6' }}>{who}’s calendar</div>
        <div style={{ display: 'flex', marginTop: 14, fontSize: c.title.length > 22 ? 74 : 92, fontWeight: 800, letterSpacing: -3, lineHeight: 1, color: '#fff' }}>{c.title}</div>
        <div style={{ display: 'flex', marginTop: 16, fontSize: 30, color: 'rgba(255,255,255,0.55)' }}>{events.length} {events.length === 1 ? 'show' : 'shows'}</div>

        {months.map((mo) => (
          <div key={`${mo.y}-${mo.m}`} style={{ display: 'flex', flexDirection: 'column', marginTop: 52 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 52, fontWeight: 800, letterSpacing: -2, color: '#fff' }}>{mo.name}</span>
              <span style={{ display: 'flex', padding: '4px 14px', borderRadius: 12, background: 'rgba(123,227,168,0.18)', color: '#A8F0C6', fontSize: 24, fontWeight: 800 }}>{mo.count}</span>
            </div>
            <div style={{ display: 'flex', gap: GAP, marginTop: 18 }}>
              {WEEKDAYS.map((d, i) => <span key={i} style={{ display: 'flex', justifyContent: 'center', width: CELL, fontSize: 22, color: i >= 5 ? 'rgba(168,240,198,0.75)' : 'rgba(255,255,255,0.35)' }}>{d}</span>)}
            </div>
            {mo.weeks.map((w, wi) => (
              <div key={wi} style={{ display: 'flex', gap: GAP, marginTop: GAP }}>
                {w.cells.map((cell, ci) => {
                  if (!cell) return <div key={ci} style={{ display: 'flex', width: CELL, height: w.full ? FULL_ROW : THIN_ROW }} />;
                  const ev = cell.events[0];
                  if (!ev) {
                    return (
                      <div key={ci} style={{ display: 'flex', justifyContent: 'center', alignItems: w.full ? 'flex-start' : 'center', paddingTop: w.full ? 12 : 0, width: CELL, height: w.full ? FULL_ROW : THIN_ROW, borderRadius: 16, background: w.full ? 'rgba(255,255,255,0.04)' : 'transparent', fontSize: 24, color: 'rgba(255,255,255,0.32)' }}>{cell.day}</div>
                    );
                  }
                  return (
                    <div key={ci} style={{ display: 'flex', flexDirection: 'column', width: CELL, height: FULL_ROW }}>
                      <div style={{ display: 'flex', position: 'relative', width: CELL, height: FLYER_H, borderRadius: 16, overflow: 'hidden', background: 'linear-gradient(135deg, #D2FBE3 0%, #5AD99A 68%, #2FB97E 100%)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {ev.image_url && <img src={small(ev.image_url)} alt="" width={CELL} height={FLYER_H} style={{ width: CELL, height: FLYER_H, objectFit: 'cover' }} />}
                        <div style={{ display: 'flex', position: 'absolute', top: 7, left: 7, padding: '2px 9px', borderRadius: 9, background: 'rgba(5,10,8,0.78)', color: '#fff', fontSize: 22, fontWeight: 800 }}>{cell.day}</div>
                        {cell.events.length > 1 && <div style={{ display: 'flex', position: 'absolute', right: 7, bottom: 7, padding: '2px 8px', borderRadius: 8, background: '#7BE3A8', color: '#03130B', fontSize: 20, fontWeight: 800 }}>+{cell.events.length - 1}</div>}
                      </div>
                      <div style={{ display: 'flex', marginTop: 8, fontSize: 19, fontWeight: 800, color: '#fff', lineHeight: 1.1, overflow: 'hidden', maxHeight: 44 }}>{shortName(ev.title)}</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ))}

        <div style={{ display: 'flex', flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '40px 0 56px' }}>
          <span style={{ display: 'flex', fontSize: 32, fontWeight: 800, letterSpacing: -1, color: '#fff' }}>TsaCoal</span>
          <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.45)', marginLeft: 8 }}>make yours at tsacoal.com</span>
        </div>
      </div>
    ),
    {
      width: W, height: H,
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' },
      ...(font ? { fonts: [{ name: 'Inter Tight', data: font, weight: 800 as const, style: 'normal' as const }] } : {}),
    },
  );
}
