import Link from 'next/link';
import { ticketDial } from '@/lib/events/dial';
import { hiRes } from '@/lib/events/image';
import type { GuideLook } from '@/lib/guideLooks';
import { T, FONT } from '@/lib/thiscene';
import type { GhanaEvent } from '@/lib/types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const short = (iso: string) => { const d = new Date(`${iso}T12:00:00Z`); return `${DAYS[d.getUTCDay()].slice(0, 3)} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`; };
const known = (v?: string | null) => (v && !/\b(tba|tbc|to be announced)\b/i.test(v) ? v : null);
const city = (c?: string | null) => (c ? c.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') : '');

/** One show on a guide page */
export function Row({ e, accent }: { e: GhanaEvent; accent: string }) {
  const dial = ticketDial(e);
  const price = e.priceUnknown ? null : e.price === 0 ? 'Free' : `From GH₵${e.price.toLocaleString()}`;
  const d = new Date(`${e.date}T12:00:00Z`);
  return (
    <li style={{ listStyle: 'none' }}>
      <Link href={`/events/${e.slug}`} className="ak-tile" style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 10, borderRadius: 22, background: 'rgba(255,255,255,0.04)', textDecoration: 'none' }}>
        {/* The flyer, whole, on its own blur */}
        <span style={{ position: 'relative', flexShrink: 0, width: 92, height: 115, borderRadius: 14, overflow: 'hidden', background: '#0B1510' }}>
          {e.image && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hiRes(e.image, 300) ?? e.image} alt="" aria-hidden loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(10px) brightness(0.6)', transform: 'scale(1.2)' }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hiRes(e.image, 300) ?? e.image} alt={`${e.title} flyer`} loading="lazy" width={92} height={115} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
            </>
          )}
        </span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 11.5, fontWeight: 800, letterSpacing: '0.12em', color: accent }}>{short(e.date).toUpperCase()}{known(e.time) ? ` · ${e.time}` : ''}</span>
          <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: 3, fontFamily: FONT.display, fontSize: 17.5, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.18, color: T.white }}>{e.title}</span>
          <span style={{ display: 'block', marginTop: 3, fontFamily: FONT.sans, fontSize: 13.5, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[known(e.venue), city(e.city)].filter(Boolean).join(', ')}</span>
          {(dial || price) && <span style={{ display: 'block', marginTop: 3, fontFamily: FONT.sans, fontSize: 12.5, color: T.text3 }}>{[price, dial ? `Dial ${dial}` : null].filter(Boolean).join(' · ')}</span>}
        </span>
        <span aria-hidden style={{ flexShrink: 0, width: 46, textAlign: 'center', paddingRight: 4 }}>
          <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, color: T.white }}>{d.getUTCDate()}</span>
          <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.display, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.14em', color: T.text3 }}>{MONTHS[d.getUTCMonth()].slice(0, 3).toUpperCase()}</span>
        </span>
      </Link>
    </li>
  );
}

/** The header's texture: a little of the place in the light behind the heading */
function Motif({ look }: { look: GuideLook }) {
  const { accent, glow, motif } = look;
  if (motif === 'waves') return (
    <svg aria-hidden viewBox="0 0 800 220" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: '46%', opacity: 0.55 }}>
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M0 ${60 + i * 42} C 120 ${20 + i * 42}, 240 ${100 + i * 42}, 400 ${60 + i * 42} S 680 ${20 + i * 42}, 800 ${60 + i * 42}`} fill="none" stroke={i % 2 ? glow : accent} strokeWidth={2} strokeOpacity={0.5 - i * 0.09} />
      ))}
    </svg>
  );
  if (motif === 'sun') return <span aria-hidden style={{ position: 'absolute', top: '-28%', right: '-18%', width: '78%', aspectRatio: '1 / 1', borderRadius: '50%', background: `radial-gradient(circle, ${glow}55 0%, ${accent}26 38%, rgba(0,0,0,0) 68%)` }} />;
  if (motif === 'weave') return <span aria-hidden style={{ position: 'absolute', inset: 0, opacity: 0.5, background: `repeating-linear-gradient(135deg, ${accent}30 0 10px, rgba(0,0,0,0) 10px 26px, ${glow}26 26px 32px, rgba(0,0,0,0) 32px 54px)`, WebkitMaskImage: 'linear-gradient(250deg, #000 0%, rgba(0,0,0,0) 62%)', maskImage: 'linear-gradient(250deg, #000 0%, rgba(0,0,0,0) 62%)' }} />;
  return (
    <span aria-hidden style={{ position: 'absolute', inset: 0, background: `radial-gradient(10% 14% at 82% 18%, ${accent}66 0%, rgba(0,0,0,0) 100%), radial-gradient(7% 10% at 64% 34%, ${glow}55 0%, rgba(0,0,0,0) 100%), radial-gradient(12% 16% at 94% 52%, ${glow}40 0%, rgba(0,0,0,0) 100%), radial-gradient(6% 9% at 74% 62%, ${accent}55 0%, rgba(0,0,0,0) 100%)` }} />
  );
}

/** The top of a guide: the place's colour and texture, its name and line, and its shows' flyers fanned out */
export function Hero({ h1, look, range, count, nextUp, flyers }: { h1: string; look: GuideLook; range: string | null; count: number; nextUp: string | null; flyers: { src: string; title: string }[] }) {
  const tilt = [-7, 3, 9];
  return (
    <header style={{ position: 'relative', marginTop: 14, borderRadius: 30, overflow: 'hidden', isolation: 'isolate', background: `radial-gradient(110% 80% at 100% 0%, ${look.accent}3D 0%, rgba(0,0,0,0) 62%), radial-gradient(90% 70% at 0% 100%, ${look.glow}2E 0%, rgba(0,0,0,0) 66%), linear-gradient(160deg, #0F1D19 0%, #070B09 100%)`, boxShadow: `inset 0 0 0 1px ${look.accent}26` }}>
      {look.photo && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={look.photo} alt="" aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -2 }} />
          <span aria-hidden style={{ position: 'absolute', inset: 0, zIndex: -1, background: 'linear-gradient(180deg, rgba(6,10,8,0.35) 0%, rgba(6,10,8,0.72) 55%, rgba(6,10,8,0.94) 100%)' }} />
        </>
      )}
      {!look.photo && <Motif look={look} />}
      <div style={{ position: 'relative', padding: 'clamp(22px, 5vw, 36px)' }}>
        <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 11.5, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: look.accent }}>{look.eyebrow}</p>
        <h1 style={{ margin: '10px 0 0', fontFamily: FONT.display, fontSize: 'clamp(38px, 10vw, 64px)', fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 0.98, color: T.white, textWrap: 'balance', maxWidth: 560 }}>{h1}</h1>
        {look.tagline && <p style={{ margin: '12px 0 0', fontFamily: FONT.sans, fontSize: 'clamp(15.5px, 2.4vw, 18px)', lineHeight: 1.45, color: 'rgba(255,255,255,0.78)', maxWidth: 420 }}>{look.tagline}</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          {range && <span style={{ padding: '7px 12px', borderRadius: 999, background: look.accent, fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 800, color: '#06110B' }}>{range}</span>}
          <span style={{ padding: '7px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.1)', fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 700, color: T.white }}>{count ? `${count} ${count === 1 ? 'show' : 'shows'} listed` : 'New shows added daily'}</span>
          {nextUp && <span style={{ padding: '7px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.1)', fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 700, color: T.white }}>Next: {nextUp}</span>}
        </div>
      </div>
      {/* The shows themselves, fanned along the bottom edge */}
      {flyers.length > 0 && (
        <div aria-hidden style={{ position: 'relative', display: 'flex', justifyContent: 'center', gap: 'clamp(10px, 3vw, 22px)', padding: '6px 20px 0', marginBottom: 'clamp(-70px, -12vw, -44px)' }}>
          {flyers.map((f, i) => (
            <span key={f.src} style={{ position: 'relative', flex: '0 1 clamp(96px, 27vw, 190px)', aspectRatio: '4 / 5', borderRadius: 16, overflow: 'hidden', background: '#0B1510', transform: `rotate(${tilt[i % 3]}deg) translateY(${i === 1 ? -12 : 0}px)`, boxShadow: '0 0 0 1px rgba(255,255,255,0.14), 0 22px 44px rgba(0,0,0,0.6)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hiRes(f.src, 500) ?? f.src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
            </span>
          ))}
        </div>
      )}
      {look.photoCredit && <p style={{ position: 'absolute', right: 12, bottom: 8, margin: 0, fontFamily: FONT.sans, fontSize: 10.5, color: 'rgba(255,255,255,0.5)' }}>{look.photoCredit}</p>}
    </header>
  );
}

