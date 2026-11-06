'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Flame, Eye, Users, Car, Smartphone, Ticket, MapPin, Share2, ArrowRight } from 'lucide-react';
import type { GhanaEvent } from '@/lib/types';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import { hiRes } from '@/lib/events/image';
import { parseDay } from '@/lib/dates';
import { compact } from '@/lib/events/track';
import { cityLabel } from '@/lib/utils';
import { T, FONT, GROUND } from '@/lib/thiscene';

export type DecEvent = { event: GhanaEvent; seen: number; going: number; score: number };

const eyebrow: React.CSSProperties = { margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.mintText };
const h2: React.CSSProperties = { margin: '6px 0 0', fontFamily: FONT.display, fontSize: 'clamp(26px, 6.5vw, 36px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.02, color: T.white };
const priceOf = (e: GhanaEvent) => (e.priceUnknown ? 'Tickets' : e.price === 0 ? 'Free' : `From GH₵ ${e.price.toLocaleString()}`);
const img = (e: GhanaEvent, w = 700) => (e.image ? hiRes(e.image, w) ?? e.image : '');

/** All the days in the window, so the strip shows quiet days too */
function daysBetween(from: string, to: string) {
  const out: string[] = [];
  for (let d = new Date(`${from}T12:00:00Z`); d.toISOString().slice(0, 10) <= to; d = new Date(d.getTime() + 86400000)) out.push(d.toISOString().slice(0, 10));
  return out;
}

export default function DecemberClient({ list, from, to }: { list: DecEvent[]; from: string; to: string }) {
  // The big ones are nights out: concerts, festivals, parties (not expos, conferences or church programmes)
  const big = useMemo(() => [...list].filter((x) => !['business', 'faith', 'tech'].includes(x.event.category)).sort((a, b) => b.score - a.score).slice(0, 8), [list]);
  const days = useMemo(() => daysBetween(from, to), [from, to]);
  const byDay = useMemo(() => {
    const m = new Map<string, DecEvent[]>();
    for (const x of list) { const k = x.event.date; m.set(k, [...(m.get(k) ?? []), x]); }
    m.forEach((v) => v.sort((a, b) => b.score - a.score));
    return m;
  }, [list]);
  const [day, setDay] = useState<string | null>(null);
  const strip = useRef<HTMLDivElement>(null);

  // The chip for the day you're reading lights up as you scroll
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setDay((vis.target as HTMLElement).dataset.day ?? null);
    }, { rootMargin: '-140px 0px -60% 0px' });
    document.querySelectorAll('[data-day]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [list]);
  useEffect(() => {
    if (!day) return;
    strip.current?.querySelector(`[data-chip="${day}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [day]);

  const jump = (d: string) => {
    const el = document.getElementById(`day-${d}`);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 128, behavior: 'smooth' });
  };
  const share = async () => {
    const data = { title: 'Detty December in Accra', text: 'Every big show this December, day by day', url: `${location.origin}/december` };
    try { if (navigator.share) await navigator.share(data); else await navigator.clipboard.writeText(data.url); } catch { /* dismissed */ }
  };

  const fan = big.slice(0, 3).map((x) => img(x.event, 500));
  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed' }}>
      <Nav back="/" />

      {/* Hero: the three biggest flyers fanned out, running up behind the header */}
      <div aria-hidden style={{ position: 'relative', height: 'calc(min(64vw, 330px) * 1.25 + 30px + env(safe-area-inset-top, 0px))', overflow: 'hidden', maskImage: 'linear-gradient(180deg, #000 82%, transparent 100%)', WebkitMaskImage: 'linear-gradient(180deg, #000 82%, transparent 100%)' }}>
        {[{ l: '50%', r: 0, w: 64, z: 3, y: 0 }, { l: '14%', r: -9, w: 50, z: 2, y: 40 }, { l: '86%', r: 9, w: 50, z: 1, y: 40 }].map((sp, i) => fan[i] ? (
          <span key={i} style={{ position: 'absolute', top: `calc(${sp.y - 4}px + env(safe-area-inset-top, 0px))`, left: sp.l, width: `${sp.w}%`, maxWidth: sp.w === 64 ? 330 : 250, aspectRatio: '4 / 5', transform: `translateX(-50%) rotate(${sp.r}deg)`, zIndex: sp.z, borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 50px rgba(0,0,0,0.55)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fan[i]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </span>
        ) : null)}
      </div>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '0 20px 20px', position: 'relative', zIndex: 2 }}>
        <p style={eyebrow}>Accra · 15 Dec – 5 Jan</p>
        <h1 style={{ margin: '8px 0 0', fontFamily: FONT.display, fontSize: 'clamp(46px, 13vw, 76px)', fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 0.92, color: T.white }}>Detty December</h1>
        <p style={{ margin: '14px 0 0', fontFamily: FONT.sans, fontSize: 16.5, lineHeight: 1.5, color: T.text }}>
          {list.length} concerts, festivals and parties. The big ones first, then every day of the season.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button type="button" onClick={() => jump(days.find((d) => byDay.has(d)) ?? days[0])} style={{ height: 50, padding: '0 22px', borderRadius: 999, border: 'none', cursor: 'pointer', background: T.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 15, fontWeight: 700 }}>See every day</button>
          <button type="button" onClick={share} aria-label="Share this page" style={{ height: 50, padding: '0 18px', borderRadius: 999, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', border: `1px solid ${T.hairlineStrong}`, color: T.white, display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: FONT.display, fontSize: 15, fontWeight: 600 }}><Share2 size={17} /> Share</button>
        </div>

        {/* The big ones */}
        {big.length > 0 && (
          <section style={{ marginTop: 46 }}>
            <p style={eyebrow}><Flame size={14} /> The big ones</p>
            <h2 style={h2}>Don’t miss these</h2>
            <div className="no-scrollbar" style={{ display: 'flex', gap: 14, overflowX: 'auto', scrollSnapType: 'x mandatory', margin: '18px -20px 0', padding: '0 20px 6px' }}>
              {big.map((x, i) => {
                const d = parseDay(x.event.date);
                const stat = x.seen >= 30 ? <><Eye size={13} /> {compact(x.seen)} checked this out</> : x.going >= 10 ? <><Users size={13} /> {compact(x.going)} going</> : null;
                return (
                  <Link key={x.event.slug} href={`/events/${x.event.slug}`} style={{ flexShrink: 0, width: 'min(72vw, 300px)', scrollSnapAlign: 'start', textDecoration: 'none' }}>
                    <span style={{ position: 'relative', display: 'block', aspectRatio: '4 / 5', borderRadius: 20, overflow: 'hidden', background: '#111', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img(x.event)} alt="" loading={i < 2 ? 'eager' : 'lazy'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <span style={{ position: 'absolute', left: 10, top: 10, height: 26, padding: '0 10px', borderRadius: 13, display: 'inline-flex', alignItems: 'center', background: 'rgba(5,6,6,0.75)', color: T.white, fontFamily: FONT.display, fontSize: 12.5, fontWeight: 800 }}>{d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</span>
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

        {/* Day by day */}
        <section style={{ marginTop: 46 }}>
          <p style={eyebrow}>Day by day</p>
          <h2 style={h2}>Every night of the season</h2>
        </section>
      </main>

      <div style={{ position: 'sticky', top: 'calc(72px + env(safe-area-inset-top, 0px))', zIndex: 20, marginTop: 14, background: 'linear-gradient(180deg, #070908 80%, rgba(7,9,8,0))', padding: '8px 0 12px' }}>
        <div ref={strip} className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', maxWidth: 760, margin: '0 auto', padding: '0 20px' }}>
          {days.map((d) => {
            const n = byDay.get(d)?.length ?? 0;
            const dt = new Date(`${d}T12:00:00Z`);
            const on = day === d;
            return (
              <button key={d} type="button" data-chip={d} onClick={() => n && jump(d)} disabled={!n} aria-current={on}
                style={{ flexShrink: 0, width: 54, height: 66, borderRadius: 16, cursor: n ? 'pointer' : 'default', border: on ? 'none' : `1px solid ${n ? T.hairlineStrong : T.hairline}`, background: on ? T.mint : n ? '#0D1210' : 'transparent', color: on ? T.onMint : n ? T.white : 'rgba(255,255,255,0.28)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <span style={{ fontFamily: FONT.sans, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', opacity: 0.8 }}>{dt.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })}</span>
                <span style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{dt.getUTCDate()}</span>
                <span style={{ fontFamily: FONT.sans, fontSize: 10.5, fontWeight: 700, opacity: n ? 0.85 : 0 }}>{n} {n === 1 ? 'show' : 'shows'}</span>
              </button>
            );
          })}
        </div>
      </div>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '0 20px 20px' }}>
        {days.filter((d) => byDay.has(d)).map((d) => {
          const dt = new Date(`${d}T12:00:00Z`);
          const special = d === '2026-12-24' ? 'Christmas Eve' : d === '2026-12-25' ? 'Christmas Day' : d === '2026-12-26' ? 'Boxing Day' : d === '2026-12-31' ? 'New Year’s Eve' : d === '2027-01-01' ? 'New Year’s Day' : '';
          return (
            <section key={d} id={`day-${d}`} data-day={d} style={{ scrollMarginTop: 140, paddingTop: 18 }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: 10, fontFamily: FONT.display, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>
                {dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}
                {special && <span style={{ fontFamily: FONT.sans, fontSize: 13, fontWeight: 700, color: T.mintText }}>{special}</span>}
              </h3>
              <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
                {byDay.get(d)!.map((x, i, arr) => (
                  <li key={x.event.slug}>
                    <Link href={`/events/${x.event.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${T.hairline}`, textDecoration: 'none' }}>
                      <span style={{ width: 60, height: 75, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: '#111' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img(x.event, 240)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 700, color: x.event.hot || x.score >= 60 ? T.mintText : T.text3 }}>{[x.event.time && !/tba/i.test(x.event.time) ? x.event.time : '', x.event.hot || x.score >= 60 ? 'Hot' : ''].filter(Boolean).join(' · ') || 'Time TBA'}</span>
                        <span style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 700, lineHeight: 1.25, color: T.white, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{x.event.title}</span>
                        <span style={{ fontFamily: FONT.sans, fontSize: 13, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[x.event.venue, cityLabel(x.event.city)].filter(Boolean).join(' · ')}</span>
                      </span>
                      <span style={{ flexShrink: 0, fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 600, color: x.event.price === 0 && !x.event.priceUnknown ? T.mintText : T.text }}>{priceOf(x.event).replace('From ', '')}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {/* First December in Ghana */}
        <section style={{ marginTop: 56 }}>
          <p style={eyebrow}>First December in Ghana?</p>
          <h2 style={h2}>How to do it right</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 18 }}>
            {[
              { I: Ticket, t: 'Buy early', b: 'The big shows sell out, and prices go up close to the day. Buy from the official link on the event page; many shows also sell by dialling a short code.' },
              { I: Smartphone, t: 'Mobile money', b: 'MoMo is how Ghana pays. Cards work at hotels and big venues, but carry some cash for the gate, drinks and the ride home.' },
              { I: Car, t: 'Getting around', b: 'Bolt, Uber and Yango all work in Accra. Traffic is heavy in December, so leave early and plan your ride home before you go.' },
              { I: MapPin, t: 'Where it happens', b: 'Osu, East Legon, Labadi and the beaches along the coast, with the big festivals at stadiums and beach resorts. Check each event’s venue and map.' },
            ].map(({ I, t, b }) => (
              <div key={t} style={{ padding: 18, borderRadius: 20, background: T.surface, border: `1px solid ${T.hairline}` }}>
                <span style={{ width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(123,227,168,0.12)', color: T.mintText }}><I size={19} /></span>
                <p style={{ margin: '12px 0 0', fontFamily: FONT.display, fontSize: 16.5, fontWeight: 700, color: T.white }}>{t}</p>
                <p style={{ margin: '5px 0 0', fontFamily: FONT.sans, fontSize: 14.5, lineHeight: 1.55, color: T.text2 }}>{b}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 40, padding: '24px 22px', borderRadius: 24, background: 'radial-gradient(120% 120% at 0% 0%, rgba(123,227,168,0.16) 0%, rgba(123,227,168,0.03) 60%), #0D1210', border: '1px solid rgba(123,227,168,0.25)' }}>
          <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>Throwing something this December?</p>
          <p style={{ margin: '6px 0 0', fontFamily: FONT.sans, fontSize: 15, color: T.text }}>List it free and it shows up here.</p>
          <Link href="/organisers" style={{ marginTop: 16, height: 50, padding: '0 20px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 8, background: T.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>List your event <ArrowRight size={17} /></Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
