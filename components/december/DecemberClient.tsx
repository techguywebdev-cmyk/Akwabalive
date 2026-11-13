'use client';

import { calmTitle } from '@/lib/titles';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Flame, Eye, Users, Car, Smartphone, Ticket, MapPin, Share2, ArrowRight, CalendarDays, ChevronRight } from 'lucide-react';
import type { GhanaEvent } from '@/lib/types';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import FlyerWall from '@/components/ui/FlyerWall';
import { hiRes } from '@/lib/events/image';
import { parseDay } from '@/lib/dates';
import { compact } from '@/lib/events/track';
import { cityLabel } from '@/lib/utils';
import { T, FONT, GROUND, GRAD, BTN } from '@/lib/thiscene';
import { useArtistPhotos } from '@/hooks/useArtistPhotos';
import type { Tentpole } from '@/lib/data/tentpoles';

export type DecEvent = { event: GhanaEvent; seen: number; going: number; score: number };
export type DecPole = Omit<Tentpole, 'match' | 'source'> & { event: { slug: string; image: string | null; venue: string | null; going: number } | null };
export type DecExpected = { title: string; artist?: string; when: string };

const gradText: React.CSSProperties = { background: GRAD.text, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent' };
const MONTH = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' });
const untilLabel = (n: number) => (n <= 0 ? 'Today' : n === 1 ? 'Tomorrow' : `In ${n} days`);

const eyebrow: React.CSSProperties = { margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.mintText };
const h2: React.CSSProperties = { margin: '6px 0 0', fontFamily: FONT.display, fontSize: 'clamp(26px, 6.5vw, 36px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.02, color: T.white };
const priceOf = (e: GhanaEvent) => (e.priceUnknown ? 'Tickets' : e.price === 0 ? 'Free' : `From GH₵ ${e.price.toLocaleString()}`);
const img = (e: GhanaEvent, w = 700) => (e.image ? hiRes(e.image, w) ?? e.image : '');

export default function DecemberClient({ list, poles, expected, from, to }: { list: DecEvent[]; poles: DecPole[]; expected: DecExpected[]; from: string; to: string }) {
  // Today on the client only, so the static page and the browser agree on first paint
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => { setToday(new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' })); }, []);
  const dated = poles.filter((p) => !today || (p.end ?? p.date) >= today);
  const next = today ? dated[0] ?? null : null;
  const photos = useArtistPhotos(useMemo(() => [...poles.map((p) => p.artist), ...expected.map((x) => x.artist)].filter(Boolean) as string[], [poles, expected]));
  const daysTo = (d: string) => (today ? Math.round((Date.parse(`${d}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000) : 0);
  // The big ones are nights out: concerts, festivals, parties (not expos, conferences or church programmes)
  const big = useMemo(() => [...list].filter((x) => !['business', 'faith', 'tech'].includes(x.event.category)).sort((a, b) => b.score - a.score).slice(0, 8), [list]);

  const share = async () => {
    const data = { title: 'Detty December in Accra', text: 'Every big show this December, day by day', url: `${location.origin}/december` };
    try { if (navigator.share) await navigator.share(data); else await navigator.clipboard.writeText(data.url); } catch { /* dismissed */ }
  };

  const wall = [...big, ...list].map((x) => img(x.event, 360)).filter(Boolean).filter((u, i, a) => a.indexOf(u) === i).slice(0, 10);
  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed', overflowX: 'clip' }}>
      <Nav back="/" />

      {/* Hero: a wall of the season's big-night flyers behind the title, fading into the page */}
      <div style={{ position: 'relative', height: 'calc(min(60vw, 290px) + 70px + env(safe-area-inset-top, 0px))' }}>
        <FlyerWall images={wall} height="calc(100% + 190px)" />
      </div>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '0 20px 20px', position: 'relative', zIndex: 2 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 30, padding: '0 13px', borderRadius: 999, background: 'linear-gradient(90deg, rgba(123,227,168,0.22), rgba(123,227,168,0.06))', fontFamily: FONT.display, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.mintText }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: T.mint, boxShadow: `0 0 10px ${T.mint}` }} />
          Accra · Nov – Jan
        </span>
        <h1 style={{ margin: '14px 0 0', fontFamily: FONT.display, fontSize: 'clamp(50px, 14vw, 84px)', fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 0.9, ...gradText }}>Detty<br />December</h1>
        <p style={{ margin: '16px 0 0', maxWidth: 520, fontFamily: FONT.sans, fontSize: 16.5, lineHeight: 1.5, color: T.text }}>
          The shows everyone plans their season around, then every night from 15 December to 5 January.
        </p>
        {next && (
          <Link href={next.event ? `/events/${next.event.slug}` : '#big-nights'} style={{ marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>
            <span style={{ height: 24, padding: '0 9px', borderRadius: 7, display: 'inline-flex', alignItems: 'center', background: 'rgba(123,227,168,0.14)', color: T.mintText, fontFamily: FONT.display, fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{untilLabel(daysTo(next.date))}</span>
            <span><b style={{ color: T.white, fontWeight: 700 }}>{next.title}</b>{next.venue ? ` · ${next.venue}` : ''}</span>
          </Link>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button type="button" onClick={() => document.getElementById('big-nights')?.scrollIntoView({ behavior: 'smooth' })} style={{ ...BTN.primary, height: 52, padding: '0 24px', borderRadius: 999, cursor: 'pointer', fontSize: 15.5, display: 'inline-flex', alignItems: 'center', gap: 8 }}><CalendarDays size={18} /> The big nights</button>
          <button type="button" onClick={share} aria-label="Share this page" style={{ ...BTN.ghost, height: 52, padding: '0 20px', borderRadius: 999, cursor: 'pointer', fontSize: 15.5, display: 'inline-flex', alignItems: 'center', gap: 8 }}><Share2 size={17} /> Share</button>
        </div>

        {/* The big nights: our picks, full-bleed like the feed — flyer when it's listed, else the artist */}
        <section id="big-nights" style={{ marginTop: 50, scrollMarginTop: 90 }}>
          <p style={eyebrow}><Flame size={14} /> The big nights</p>
          <h2 style={h2}>The ones worth planning around</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
            {dated.map((p, i) => {
              const newMonth = i === 0 || MONTH(dated[i - 1].date) !== MONTH(p.date);
              const art = p.event?.image ? hiRes(p.event.image, 700) ?? p.event.image : p.artist ? photos[p.artist] : null;
              const d = new Date(`${p.date}T12:00:00Z`);
              const when = `${d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })} ${d.getUTCDate()}${p.end ? `–${new Date(`${p.end}T12:00:00Z`).getUTCDate()}` : ''} ${d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })}`;
              const meta = [p.event?.venue ?? p.venue, p.event && p.event.going >= 10 ? `${compact(p.event.going)} going` : !p.event && p.tickets ? `Dial ${p.tickets}` : ''].filter(Boolean).join(' · ');
              const tile = (
                <span style={{ position: 'relative', display: 'block', minHeight: 132, borderRadius: 22, overflow: 'hidden', background: `${GRAD.card}, #0B100D` }}>
                  {art && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={art} alt="" loading={i < 3 ? 'eager' : 'lazy'} style={{ position: 'absolute', right: 0, top: 0, width: '62%', height: '100%', objectFit: 'cover', objectPosition: 'center 25%', display: 'block' }} />
                      <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #0A0F0C 0%, #0A0F0C 36%, rgba(10,15,12,0.82) 52%, rgba(10,15,12,0.25) 78%, rgba(10,15,12,0.05) 100%)' }} />
                    </>
                  )}
                  <span style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 132, padding: '16px 18px', maxWidth: art ? '72%' : '100%' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT.display, fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.mintText }}>
                      {when}
                      {next === p && <span style={{ height: 18, padding: '0 6px', borderRadius: 5, display: 'inline-flex', alignItems: 'center', background: GRAD.mint, color: T.onMint, fontSize: 10, letterSpacing: '0.06em' }}>Next</span>}
                    </span>
                    <span style={{ marginTop: 5, fontFamily: FONT.display, fontSize: 23, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, color: T.white, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.title}</span>
                    {p.blurb && <span style={{ marginTop: 5, fontFamily: FONT.sans, fontSize: 13.5, lineHeight: 1.35, color: T.text, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.blurb}</span>}
                    {meta && <span style={{ marginTop: 6, fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 600, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta}</span>}
                  </span>
                  {p.event && <span style={{ position: 'absolute', right: 12, bottom: 12, width: 34, height: 34, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,10,8,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', color: T.white }}><ChevronRight size={18} /></span>}
                </span>
              );
              return (
                <div key={`${p.title}-${p.date}`}>
                  {newMonth && <p style={{ margin: i ? '16px 2px 8px' : '0 2px 8px', fontFamily: FONT.display, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>{MONTH(p.date)}</p>}
                  {p.event ? <Link href={`/events/${p.event.slug}`} style={{ textDecoration: 'none', display: 'block' }}>{tile}</Link> : tile}
                </div>
              );
            })}
          </div>

          {expected.length > 0 && (
            <div style={{ marginTop: 26 }}>
              <p style={{ margin: '0 2px', fontFamily: FONT.display, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>Expected, not confirmed</p>
              <p style={{ margin: '4px 2px 0', fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.45, color: T.text2 }}>December regulars whose organisers haven’t announced 2026 dates yet. They join the list above the day they do.</p>
              <div className="no-scrollbar" style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '14px -20px 0', padding: '0 20px 4px' }}>
                {expected.map((x) => {
                  const ph = x.artist ? photos[x.artist] : null;
                  return (
                    <span key={x.title} style={{ position: 'relative', flexShrink: 0, width: 132, height: 168, borderRadius: 18, overflow: 'hidden', background: `${GRAD.card}, #0B100D` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {ph && <img src={ph} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%', filter: 'grayscale(0.35) brightness(0.8)' }} />}
                      <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,12,10,0) 30%, rgba(8,12,10,0.92) 82%)' }} />
                      <span style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
                        <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, color: T.white }}>{x.title}</span>
                        <span style={{ display: 'block', marginTop: 3, fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, color: T.text2 }}>{x.when}</span>
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* The big ones */}
        {big.length > 0 && (
          <section style={{ marginTop: 46 }}>
            <p style={eyebrow}><Ticket size={14} /> On sale now</p>
            <h2 style={h2}>Get your tickets</h2>
            <div className="no-scrollbar" style={{ display: 'flex', gap: 14, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollPaddingInline: 20, margin: '18px -20px 0', padding: '0 20px 6px' }}>
              {big.map((x, i) => {
                const d = parseDay(x.event.date);
                const stat = x.seen >= 30 ? <><Eye size={13} /> {compact(x.seen)} checked this out</> : x.going >= 10 ? <><Users size={13} /> {compact(x.going)} going</> : null;
                return (
                  <Link key={x.event.slug} href={`/events/${x.event.slug}`} style={{ flexShrink: 0, width: 'min(72vw, 300px)', scrollSnapAlign: 'start', textDecoration: 'none' }}>
                    <span style={{ position: 'relative', display: 'block', aspectRatio: '4 / 5', borderRadius: 20, overflow: 'hidden', background: '#111', boxShadow: '0 20px 40px -20px rgba(0,0,0,0.8)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img(x.event)} alt="" loading={i < 2 ? 'eager' : 'lazy'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <span style={{ position: 'absolute', left: 10, top: 10, height: 26, padding: '0 10px', borderRadius: 13, display: 'inline-flex', alignItems: 'center', background: 'rgba(5,10,8,0.62)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: 'none', color: T.white, fontFamily: FONT.display, fontSize: 12.5, fontWeight: 800 }}>{d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</span>
                    </span>
                    <span style={{ display: 'block', marginTop: 10, fontFamily: FONT.display, fontSize: 17, fontWeight: 700, letterSpacing: '-0.015em', color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.event.title}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, fontFamily: FONT.sans, fontSize: 13.5, fontWeight: stat ? 600 : 400, color: stat ? T.mintText : T.text2, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {stat ?? [x.event.venue, cityLabel(x.event.city)].filter(Boolean).join(' · ')}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}


        {/* Make your own: the calendars feature */}
        <section style={{ marginTop: 56 }}>
          <p style={eyebrow}>Your own line-up</p>
          <h2 style={h2}>Make your Detty December calendar</h2>
          <p style={{ margin: '10px 0 0', maxWidth: 520, fontFamily: FONT.sans, fontSize: 15.5, lineHeight: 1.55, color: T.text2 }}>Pick your nights, share the link with the squad, and see whose line-up gets the most love.</p>
          <Link href="/calendars" style={{ marginTop: 18, height: 48, padding: '0 20px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', textDecoration: 'none', background: GRAD.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 15, fontWeight: 700 }}>Start yours</Link>
        </section>

        {/* First December in Ghana */}
        <section style={{ marginTop: 56 }}>
          <p style={eyebrow}>First December in Ghana?</p>
          <h2 style={h2}>How to do it right</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 26, marginTop: 22 }}>
            {[
              { I: Ticket, t: 'Buy early', b: 'The big shows sell out, and prices go up close to the day. Buy from the official link on the event page; many shows also sell by dialling a short code.' },
              { I: Smartphone, t: 'Mobile money', b: 'MoMo is how Ghana pays. Cards work at hotels and big venues, but carry some cash for the gate, drinks and the ride home.' },
              { I: Car, t: 'Getting around', b: 'Bolt, Uber and Yango all work in Accra. Traffic is heavy in December, so leave early and plan your ride home before you go.' },
              { I: MapPin, t: 'Where it happens', b: 'Osu, East Legon, Labadi and the beaches along the coast, with the big festivals at stadiums and beach resorts. Check each event’s venue and map.' },
            ].map(({ I, t, b }) => (
              <div key={t}><div style={{ height: '100%', padding: '4px 0' }}>
                <span style={{ display: 'flex', color: T.mintText }}><I size={24} strokeWidth={1.8} /></span>
                <p style={{ margin: '12px 0 0', fontFamily: FONT.display, fontSize: 16.5, fontWeight: 700, color: T.white }}>{t}</p>
                <p style={{ margin: '5px 0 0', fontFamily: FONT.sans, fontSize: 14.5, lineHeight: 1.55, color: T.text2 }}>{b}</p>
              </div></div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 48 }}><div style={{ padding: '8px 0 0' }}>
          <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>Throwing something this December?</p>
          <p style={{ margin: '6px 0 0', fontFamily: FONT.sans, fontSize: 15, color: T.text }}>List it free and it shows up here.</p>
          <Link href="/organisers" style={{ ...BTN.primary, marginTop: 18, height: 50, padding: '0 22px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15, textDecoration: 'none' }}>List your event <ArrowRight size={17} /></Link>
        </div></section>
      </main>
      <Footer />
    </div>
  );
}
