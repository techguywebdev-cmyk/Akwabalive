import Link from 'next/link';
import type { CSSProperties } from 'react';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import { Icon, CATEGORY_ICONS } from '@/components/ui/Icon';
import { events as staticEvents } from '@/lib/data/events';
import { fetchPublishedEvents, supabaseToGhanaEvent } from '@/lib/supabase/events';
import { matchesWhen } from '@/lib/utils';
import { rankScore } from '@/lib/events/rank';
import { T, FONT, ACCENTS, alpha } from '@/lib/thiscene';
import type { GhanaEvent } from '@/lib/types';
import { parseDay, shortDay } from '@/lib/dates';

export const dynamic = 'force-dynamic';

/** Same category colours the events pages use (lib/events/accent.ts) */
const CAT_ACCENT: Record<string, string> = {
  concert: ACCENTS.rose, festival: ACCENTS.gold, nightlife: ACCENTS.violet, culture: ACCENTS.emerald,
  food: ACCENTS.ember, sports: ACCENTS.sky, tech: ACCENTS.teal, art: ACCENTS.indigo,
  fashion: ACCENTS.rose, wellness: ACCENTS.lime,
};
const accentOf = (e: GhanaEvent) => CAT_ACCENT[e.category] ?? ACCENTS.gold;

const VIBES: { value: string; label: string }[] = [
  { value: 'concert', label: 'Concerts' },
  { value: 'festival', label: 'Festivals' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'food', label: 'Food' },
  { value: 'culture', label: 'Culture' },
  { value: 'sports', label: 'Sports' },
  { value: 'art', label: 'Art' },
  { value: 'tech', label: 'Tech' },
];

const MOMENTS = [
  { src: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&q=80&auto=format&fit=crop', label: 'Festival nights' },
  { src: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&q=80&auto=format&fit=crop', label: 'Street art & music' },
  { src: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80&auto=format&fit=crop', label: 'Live sets' },
];

/** "Sat 14 Dec" */
function shortDate(e: GhanaEvent) {
  const d = parseDay(e.date);
  return d ? shortDay(d) : e.dateLabel || '';
}
const price = (e: GhanaEvent) => (e.price === 0 ? 'Free' : `GH₵ ${e.price.toLocaleString()}`);
const city = (e: GhanaEvent) => (e.city ? e.city.charAt(0).toUpperCase() + e.city.slice(1).replace(/-/g, ' ') : '');

const eyebrow: CSSProperties = { fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' };
const h2: CSSProperties = { margin: 0, fontFamily: FONT.display, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: T.white };

function SectionHead({ title, sub, href, label = 'See all' }: { title: string; sub?: string; href?: string; label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
      <div>
        <h2 style={h2}>{title}</h2>
        {sub && <p style={{ margin: '6px 0 0', fontFamily: FONT.sans, fontSize: 13, color: T.text2 }}>{sub}</p>}
      </div>
      {href && <Link href={href} style={{ fontFamily: FONT.sans, fontSize: 13, fontWeight: 500, color: T.mintText, textDecoration: 'none', whiteSpace: 'nowrap' }}>{label}</Link>}
    </div>
  );
}

export default async function HomePage() {
  const db = (await fetchPublishedEvents()).map(supabaseToGhanaEvent);
  const seen = new Set<string>();
  const all = [...db, ...staticEvents].filter((e) => (seen.has(e.slug) ? false : (seen.add(e.slug), true)));

  const byDate = (a: GhanaEvent, b: GhanaEvent) => (a.date || '').localeCompare(b.date || '');
  const upcoming = all.filter((e) => matchesWhen(e, 'upcoming')).sort(byDate);
  const live = upcoming.length > 0;
  // Nothing upcoming yet: show the most recent events instead of an empty page.
  const pool = live ? upcoming : [...all].sort((a, b) => byDate(b, a));

  const hero = [...pool].sort((a, b) => rankScore(b) - rankScore(a))[0];
  const comingUp = pool.filter((e) => e.slug !== hero?.slug).slice(0, 10);
  const popular = [...pool].sort((a, b) => (b.attending ?? 0) - (a.attending ?? 0) || rankScore(b) - rankScore(a)).slice(0, 5);

  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden' }}>
      <Nav active="Discover" />

      {/* Full-height flyer: the featured event fills the first screen, the header floats over it */}
      {hero && (
        <section aria-label={hero.title} style={{ position: 'relative', height: '100svh', minHeight: 560, maxHeight: 1000, overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hero.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(3,8,6,0.55) 0%, rgba(3,8,6,0) 16%, rgba(3,8,6,0) 42%, rgba(4,16,10,0.88) 72%, #030806 100%)' }} />
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(90% 40% at 0% 100%, rgba(18,72,48,0.5) 0%, rgba(18,72,48,0) 70%)' }} />
          <div style={{ position: 'absolute', left: 20, right: 20, bottom: 'calc(112px + env(safe-area-inset-bottom, 0px))', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, ...eyebrow }}>
              <span style={{ color: T.mint }}>{live ? 'Featured' : 'Recently'}</span>
              <span aria-hidden style={{ width: 3, height: 3, borderRadius: 2, background: accentOf(hero), opacity: 0.6 }} />
              <span style={{ color: accentOf(hero) }}>{hero.category}</span>
              <span aria-hidden style={{ width: 3, height: 3, borderRadius: 2, background: accentOf(hero), opacity: 0.6 }} />
              <span style={{ color: accentOf(hero) }}>{shortDate(hero)}</span>
            </div>
            <h1 style={{ margin: 0, fontFamily: FONT.display, fontSize: 'clamp(40px, 10vw, 76px)', fontWeight: 800, lineHeight: 0.95, letterSpacing: '-0.035em', color: T.white, textShadow: `0 0 42px ${alpha(accentOf(hero), 0.45)}, 0 2px 18px rgba(0,0,0,0.5)` }}>
              {hero.title}
            </h1>
            <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 15, color: 'rgba(255,255,255,0.7)' }}>
              {[hero.venue, city(hero)].filter((v, i, arr) => v && !(i === 1 && arr[0]?.includes(v))).join(', ')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Link href={`/events/${hero.slug}${live ? '?tickets=1' : ''}`} style={{ height: 48, padding: '0 22px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: T.white, background: alpha(accentOf(hero), 0.2), border: `1px solid ${alpha(accentOf(hero), 0.6)}`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', fontFamily: FONT.display, fontSize: 15, fontWeight: 700 }}>
                {live ? <>Get tickets <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>{price(hero)}</span></> : 'View event'}
              </Link>
              <Link href="/events" style={{ height: 48, padding: '0 20px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: T.text, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', fontFamily: FONT.sans, fontSize: 15, fontWeight: 600 }}>
                All events
              </Link>
            </div>
          </div>
        </section>
      )}

      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '8px 0 0' }}>
        {comingUp.length > 0 && (
          <section style={{ marginTop: 12 }}>
            <div style={{ padding: '0 20px' }}>
              <SectionHead title={live ? 'Coming up' : 'Recent events'} href="/events?view=list" />
            </div>
            <div className="no-scrollbar" style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '0 20px', scrollSnapType: 'x mandatory', scrollPaddingLeft: 20 }}>
              {comingUp.map((e) => (
                <Link key={e.slug} href={`/events/${e.slug}`} style={{ flex: '0 0 160px', display: 'flex', flexDirection: 'column', gap: 10, textDecoration: 'none', color: T.text, scrollSnapAlign: 'start' }}>
                  <span style={{ width: 160, height: 200, borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={e.image} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ ...eyebrow, fontSize: 11, letterSpacing: '0.12em', color: accentOf(e) }}>{shortDate(e)}</span>
                    <span style={{ fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, lineHeight: 1.25, color: T.white, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{e.title}</span>
                    <span style={{ fontFamily: FONT.sans, fontSize: 13, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{city(e)} · {price(e)}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {popular.length > 0 && (
          <section style={{ marginTop: 48, padding: '0 20px' }}>
            <SectionHead title="Most popular" sub={live ? 'What people are going to' : 'The ones people went to'} />
            <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {popular.map((e, i) => (
                <li key={e.slug} style={{ borderBottom: i === popular.length - 1 ? 'none' : `1px solid ${T.hairline}` }}>
                  <Link href={`/events/${e.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0', textDecoration: 'none', color: T.text }}>
                    <span style={{ width: 24, fontFamily: FONT.display, fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>{String(i + 1).padStart(2, '0')}</span>
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
                      <span style={{ fontFamily: FONT.sans, fontSize: 13, color: T.text2 }}>
                        {shortDate(e)}{e.attending ? ` · ${e.attending.toLocaleString()} going` : ` · ${city(e)}`}
                      </span>
                    </span>
                    <Icon name="open" size={18} color="rgba(255,255,255,0.4)" />
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section style={{ marginTop: 44, padding: '0 20px' }}>
          <SectionHead title="Browse by vibe" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', gap: '20px 8px', maxWidth: 720 }}>
            {VIBES.map((v) => (
              <Link key={v.value} href={`/events?category=${v.value}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'rgba(255,255,255,0.8)', fontFamily: FONT.sans, fontSize: 12, fontWeight: 500 }}>
                <span style={{ width: 56, height: 56, borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', color: T.text }}>
                  <Icon name={CATEGORY_ICONS[v.value]} size={24} />
                </span>
                {v.label}
              </Link>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 48, padding: '0 20px' }}>
          <SectionHead title="Moments" sub="Relive shows through the crowd's videos" href="/moments" label="Watch" />
          <div className="no-scrollbar" style={{ display: 'flex', gap: 14, overflowX: 'auto' }}>
            {MOMENTS.map((m) => (
              <Link key={m.label} href="/moments" style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', gap: 10, textDecoration: 'none', color: T.white }}>
                <span style={{ position: 'relative', width: 220, height: 140, borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.src} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <span style={{ position: 'absolute', right: 10, bottom: 10, width: 36, height: 36, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(3,10,6,0.5)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                    <Icon name="play" size={15} color="#fff" filled />
                  </span>
                </span>
                <span style={{ fontFamily: FONT.sans, fontSize: 14, fontWeight: 600 }}>{m.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 56, padding: '28px 20px 0', borderTop: `1px solid ${T.hairline}`, marginLeft: 20, marginRight: 20, paddingLeft: 0, paddingRight: 0 }}>
          <p style={{ ...eyebrow, color: T.mint, margin: '0 0 10px' }}>For organizers</p>
          <h2 style={{ ...h2, fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05 }}>Sell tickets in minutes</h2>
          <p style={{ margin: '12px 0 20px', maxWidth: 520, fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.6, color: T.text2 }}>
            Set your ticket types, share one link, and get paid by MoMo, Telecel Cash, AirtelTigo or card through Paystack.
          </p>
          <Link href="/organizer/events/new" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 48, padding: '0 22px', borderRadius: 999, background: T.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            List an event <Icon name="arrowRight" size={17} />
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
