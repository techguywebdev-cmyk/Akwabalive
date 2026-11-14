'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { AtSign, Check, ChevronLeft, ChevronRight, Copy, Globe, MapPin, MessageCircle, Navigation, Pencil, ParkingSquare, Plus, X } from 'lucide-react';
import { T, FONT } from '@/lib/thiscene';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { eventCounts, compact } from '@/lib/events/track';
import { hiRes } from '@/lib/events/image';
import { cityLabel } from '@/lib/utils';
import { parseDay, shortDay } from '@/lib/dates';
import { setMinutes, niceSetTime, type EventSet } from '@/lib/events/page';
import type { GhanaEvent } from '@/lib/types';
import type { EventFaq, EventPage } from '@/lib/events/page';

export type MiniShow = { slug: string; title: string; date: string; image: string | null; venue: string | null; city: string | null };
export type OrganiserInfo = {
  id: string; username: string; name: string; avatar: string | null; bio: string | null;
  instagram: string | null; whatsapp: string | null; website: string | null;
  upcoming: MiniShow[]; past: MiniShow[]; hosted: number;
};

/** The section heading used across the page, in the page's colour */
export function Eyebrow({ children, color }: { children: React.ReactNode; color: string }) {
  return <h2 style={{ margin: '0 0 10px', fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color }}>{children}</h2>;
}

const handle = (v: string) => v.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/.*$/, '');
const waNumber = (v: string) => { const d = v.replace(/\D/g, ''); return d.startsWith('0') ? `233${d.slice(1)}` : d; };
const site = (v: string) => (/^https?:\/\//.test(v) ? v : `https://${v}`);
const ghost: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 42, padding: '0 16px', borderRadius: 999, border: 'none', background: 'rgba(255,255,255,0.08)', color: T.white, fontFamily: FONT.sans, fontSize: 14, fontWeight: 700, textDecoration: 'none', cursor: 'pointer', whiteSpace: 'nowrap' };

/* ── The organiser ─────────────────────────────────────────────── */

/** Who's putting it on: their name, story, how to reach them, and what else they've got coming */
export function OrganiserBlock({ org, accent, onAccent }: { org: OrganiserInfo; accent: string; onAccent: string }) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const mine = user?.id === org.id;

  useEffect(() => {
    if (!user || mine) return;
    createClient().from('follows').select('following_id').eq('follower_id', user.id).eq('following_id', org.id).maybeSingle()
      .then(({ data }) => setFollowing(!!data));
  }, [user, org.id, mine]);

  async function follow() {
    if (!user) { window.location.href = `/auth?next=${encodeURIComponent(window.location.pathname)}`; return; }
    setBusy(true);
    const db = createClient();
    const on = following;
    setFollowing(!on);
    const { error } = on
      ? await db.from('follows').delete().eq('follower_id', user.id).eq('following_id', org.id)
      : await db.from('follows').insert({ follower_id: user.id, following_id: org.id });
    if (error) setFollowing(on);
    setBusy(false);
  }

  return (
    <section style={{ marginTop: 40 }}>
      <Eyebrow color={accent}>Presented by</Eyebrow>
      <div style={{ position: 'relative', borderRadius: 24, padding: 20, overflow: 'hidden', background: `linear-gradient(160deg, ${accent}24 0%, rgba(255,255,255,0.04) 55%)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href={`/organizer/${org.username}`} style={{ width: 60, height: 60, borderRadius: 18, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1B2420', color: T.white, fontFamily: FONT.display, fontSize: 24, fontWeight: 800, textDecoration: 'none', boxShadow: `0 0 0 1px rgba(255,255,255,0.1)` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {org.avatar ? <img src={org.avatar} alt={org.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : org.name[0]?.toUpperCase()}
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Link href={`/organizer/${org.username}`} style={{ display: 'block', fontFamily: FONT.display, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: T.white, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org.name}</Link>
            <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 13, color: T.text2 }}>
              {org.hosted} {org.hosted === 1 ? 'event' : 'events'} on TsaCoal{org.upcoming.length ? ` · ${org.upcoming.length} coming up` : ''}
            </span>
          </div>
          {!mine && (
            <button type="button" onClick={follow} disabled={busy} aria-pressed={following}
              style={{ ...ghost, height: 38, padding: '0 14px', ...(following ? {} : { background: accent, color: onAccent }) }}>
              {following ? <><Check size={15} /> Following</> : <><Plus size={15} /> Follow</>}
            </button>
          )}
        </div>
        {org.bio && <p style={{ margin: '14px 0 0', fontFamily: FONT.sans, fontSize: 14.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.78)', whiteSpace: 'pre-line' }}>{org.bio}</p>}
        {(org.whatsapp || org.instagram || org.website) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            {org.whatsapp && <a href={`https://wa.me/${waNumber(org.whatsapp)}`} target="_blank" rel="noopener noreferrer" style={ghost}><MessageCircle size={16} /> WhatsApp</a>}
            {org.instagram && <a href={`https://instagram.com/${handle(org.instagram)}`} target="_blank" rel="noopener noreferrer" style={ghost}><AtSign size={16} /> {handle(org.instagram)}</a>}
            {org.website && <a href={site(org.website)} target="_blank" rel="noopener noreferrer" style={ghost}><Globe size={16} /> Website</a>}
          </div>
        )}
      </div>

      {org.upcoming.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>More from {org.name}</span>
            <Link href={`/organizer/${org.username}`} style={{ fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: accent, textDecoration: 'none' }}>See all</Link>
          </div>
          <ShowRail shows={org.upcoming} />
        </div>
      )}
    </section>
  );
}

/** A row of the organiser's other shows: flyer, date, name */
function ShowRail({ shows, went }: { shows: MiniShow[]; went?: Record<string, number> }) {
  return (
    <div className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', margin: '10px -20px 0', padding: '2px 20px 4px' }}>
      {shows.map((s) => {
        const d = parseDay(s.date);
        const n = went?.[s.slug] ?? 0;
        return (
          <Link key={s.slug} href={`/events/${s.slug}`} style={{ width: 136, flexShrink: 0, textDecoration: 'none', color: T.white }}>
            <span style={{ position: 'relative', display: 'block', aspectRatio: '4 / 5', borderRadius: 14, overflow: 'hidden', background: '#0B1510', boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {s.image && <img src={hiRes(s.image, 400) ?? s.image} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
            </span>
            <span style={{ marginTop: 8, fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 700, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as CSSProperties}>{s.title}</span>
            <span style={{ display: 'block', marginTop: 3, fontFamily: FONT.sans, fontSize: 12, color: T.text3 }}>
              {d ? `${shortDay(d)}${d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ''}` : ''}{n >= 10 ? ` · ${compact(n)} went` : ''}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/* ── Gallery and past editions ─────────────────────────────────── */

/** Photos the organiser added, then their earlier shows (with how many went, once that's worth saying) */
export function GallerySection({ photos, past, accent, title }: { photos: string[]; past: MiniShow[]; accent: string; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const [went, setWent] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!past.length) return;
    let live = true;
    eventCounts(past.map((s) => s.slug)).then((c) => { if (live) setWent(Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v.going]))); }).catch(() => {});
    return () => { live = false; };
  }, [past]);
  if (!photos.length && !past.length) return null;

  const tile = (src: string, i: number, style: CSSProperties) => (
    <button key={src} type="button" onClick={() => setOpen(i)} aria-label={`Open photo ${i + 1}`}
      style={{ position: 'relative', padding: 0, border: 'none', cursor: 'zoom-in', borderRadius: 16, overflow: 'hidden', background: '#0B1510', ...style }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={hiRes(src, 900) ?? src} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      {i === 4 && photos.length > 5 && (
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', fontFamily: FONT.display, fontSize: 22, fontWeight: 800, color: T.white }}>+{photos.length - 5}</span>
      )}
    </button>
  );

  return (
    <section style={{ marginTop: 40 }}>
      {photos.length > 0 && (
        <>
          <Eyebrow color={accent}>Gallery</Eyebrow>
          {/* One big photo, then a neat grid; the fifth tile opens the rest */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {photos.slice(0, 5).map((src, i) => tile(src, i, i === 0
              ? { gridColumn: photos.length === 1 ? '1 / -1' : 'span 4', aspectRatio: photos.length === 1 ? '4 / 3' : '16 / 10' }
              : { gridColumn: photos.length === 2 ? '1 / -1' : photos.length === 3 ? 'span 2' : 'span 1', aspectRatio: photos.length === 2 ? '16 / 10' : '1 / 1' }))}
          </div>
        </>
      )}
      {past.length > 0 && (
        <div style={{ marginTop: photos.length ? 28 : 0 }}>
          <Eyebrow color={accent}>Past editions</Eyebrow>
          <ShowRail shows={past} went={went} />
        </div>
      )}
      {open != null && <Lightbox photos={photos} start={open} title={title} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Lightbox({ photos, start, title, onClose }: { photos: string[]; start: number; title: string; onClose: () => void }) {
  const [i, setI] = useState(start);
  const go = (d: number) => setI((x) => (x + d + photos.length) % photos.length);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
    window.addEventListener('keydown', key);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', key); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  let x0: number | null = null;
  const nav: CSSProperties = { position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: 22, border: 'none', background: 'rgba(255,255,255,0.1)', color: T.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
  return (
    <div role="dialog" aria-modal="true" aria-label={`${title} photos`} onClick={onClose}
      onTouchStart={(e) => { x0 = e.touches[0].clientX; }} onTouchEnd={(e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); x0 = null; }}
      style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(2,5,4,0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={hiRes(photos[i], 1600) ?? photos[i]} alt="" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '100%', maxHeight: '86svh', objectFit: 'contain' }} />
      <button type="button" aria-label="Close" onClick={onClose} style={{ ...nav, top: 'calc(28px + env(safe-area-inset-top, 0px))', right: 16, transform: 'none' }}><X size={20} /></button>
      {photos.length > 1 && <>
        <button type="button" aria-label="Previous" onClick={(e) => { e.stopPropagation(); go(-1); }} style={{ ...nav, left: 12 }}><ChevronLeft size={22} /></button>
        <button type="button" aria-label="Next" onClick={(e) => { e.stopPropagation(); go(1); }} style={{ ...nav, right: 12 }}><ChevronRight size={22} /></button>
        <span style={{ position: 'absolute', bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))', left: 0, right: 0, textAlign: 'center', fontFamily: FONT.sans, fontSize: 13, color: T.text2 }}>{i + 1} / {photos.length}</span>
      </>}
    </div>
  );
}

/* ── Getting there ─────────────────────────────────────────────── */

/** The venue on a map, how to get there and where to park */
export function VenueSection({ event, page, accent }: { event: GhanaEvent; page: EventPage; accent: string }) {
  const [copied, setCopied] = useState(false);
  const place = [event.venue, event.area, cityLabel(event.city), 'Ghana'].filter(Boolean).join(', ');
  const q = event.lat && event.lng ? `${event.lat},${event.lng}` : place;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
  const copy = () => { navigator.clipboard?.writeText(place).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {}); };
  return (
    <section style={{ marginTop: 40 }}>
      <Eyebrow color={accent}>Getting there</Eyebrow>
      <div style={{ borderRadius: 24, overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
        <div style={{ position: 'relative', aspectRatio: '16 / 9', background: '#0B1510' }}>
          {/* Google's map, darkened to sit in the page */}
          <iframe title={`Map of ${event.venue}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=15&output=embed`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, filter: 'invert(0.92) hue-rotate(180deg) saturate(0.55) brightness(0.92) contrast(0.95)' }} />
          <span aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 -40px 40px -20px rgba(6,10,8,0.6)' }} />
        </div>
        <div style={{ padding: '16px 18px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <MapPin size={18} color={accent} style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 17, fontWeight: 800, letterSpacing: '-0.015em', color: T.white }}>{event.venue}</span>
              <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 13.5, color: T.text2 }}>{[event.area, cityLabel(event.city)].filter(Boolean).join(', ')}</span>
            </span>
          </div>
          {page.directions && <p style={{ margin: '14px 0 0', fontFamily: FONT.sans, fontSize: 14.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.8)', whiteSpace: 'pre-line' }}>{page.directions}</p>}
          {page.parking && (
            <p style={{ margin: '12px 0 0', display: 'flex', gap: 10, fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.55, color: T.text2 }}>
              <ParkingSquare size={17} color={T.text3} style={{ flexShrink: 0, marginTop: 1 }} /> {page.parking}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" style={{ ...ghost, flex: 1, background: `${accent}22`, color: T.white }}><Navigation size={16} color={accent} /> Directions</a>
            <button type="button" onClick={copy} style={{ ...ghost, flex: 1 }}>{copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy address</>}</button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Questions ─────────────────────────────────────────────────── */

export function FaqSection({ faqs, accent }: { faqs: EventFaq[]; accent: string }) {
  const [open, setOpen] = useState<number | null>(0);
  if (!faqs.length) return null;
  return (
    <section style={{ marginTop: 40 }}>
      <Eyebrow color={accent}>Good to know</Eyebrow>
      <div style={{ borderRadius: 24, overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
        {faqs.map((f, i) => {
          const on = open === i;
          return (
            <div key={f.q} style={{ borderTop: i ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <button type="button" onClick={() => setOpen(on ? null : i)} aria-expanded={on}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', color: T.white, fontFamily: FONT.sans, fontSize: 15, fontWeight: 700 }}>
                <span style={{ flex: 1 }}>{f.q}</span>
                <Plus size={18} color={on ? accent : T.text3} style={{ flexShrink: 0, transform: on ? 'rotate(45deg)' : 'none', transition: 'transform 200ms ease' }} />
              </button>
              {on && <p style={{ margin: 0, padding: '0 18px 16px', fontFamily: FONT.sans, fontSize: 14.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.75)', whiteSpace: 'pre-line' }}>{f.a}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── For the organiser, on their own page ──────────────────────── */

/** Only the organiser sees this: their page's link to send around, and a way to edit it */
export function OwnerBar({ event, organiserId, accent, onAccent }: { event: GhanaEvent; organiserId: string; accent: string; onAccent: string }) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  if (!user || user.id !== organiserId) return null;
  const link = `tsacoal.com/${event.shortCode ? `e/${event.shortCode}` : `events/${event.slug}`}`;
  const copy = () => { navigator.clipboard?.writeText(`https://${link}`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {}); };
  return (
    <div style={{ marginTop: 18, padding: '12px 12px 12px 16px', borderRadius: 18, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', boxShadow: `inset 0 0 0 1px ${accent}33` }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 12, color: T.text3 }}>Your page · send this link</span>
        <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 14.5, fontWeight: 700, color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link}</span>
      </span>
      <button type="button" onClick={copy} aria-label="Copy link" style={{ ...ghost, height: 38, padding: '0 14px', background: accent, color: onAccent }}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copied' : 'Copy'}</button>
      {event.dbId && <Link href={`/organizer/events/${event.dbId}`} aria-label="Edit page" style={{ ...ghost, width: 38, height: 38, padding: 0 }}><Pencil size={15} /></Link>}
    </div>
  );
}


/* ── Set times: who's on when, with "On now" and "Up next" while it's happening ── */

export function SetTimes({ sets, date, ink, heading, slugFor }: {
  sets: EventSet[]; date: string; ink: string; heading: CSSProperties; slugFor: (name: string) => string | null;
}) {
  // The clock only runs on the day itself, after the page has loaded (so the server and phone agree)
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setNow(today === date.slice(0, 10) ? d.getHours() * 60 + d.getMinutes() : null);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [date]);
  const mins = sets.map((s) => setMinutes(s.time));
  // On now: the latest set that has started (sets run about an hour unless the next one starts sooner)
  let live = -1;
  if (now != null) mins.forEach((m, i) => { if (m != null && m <= now && now < (mins[i + 1] ?? m + 75)) live = i; });
  const next = now == null ? -1 : mins.findIndex((m) => m != null && m > now);

  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={heading}>Set times</h2>
      <ol style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sets.map((s, i) => {
          const slug = slugFor(s.name);
          const on = i === live, up = i === next && live !== next;
          const done = now != null && live >= 0 ? i < live : now != null && next > 0 ? i < next : false;
          const name = <span style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>{s.name}</span>;
          return (
            <li key={`${s.name}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 16, opacity: done ? 0.45 : 1,
              background: on ? `color-mix(in srgb, ${ink} 16%, transparent)` : 'rgba(255,255,255,0.05)', boxShadow: on ? `inset 0 0 0 1.5px ${ink}` : 'none' }}>
              <span style={{ width: 74, flexShrink: 0, fontFamily: FONT.sans, fontSize: 14, fontWeight: 700, color: ink }}>{niceSetTime(s.time)}</span>
              <span style={{ flex: 1, minWidth: 0 }}>{slug ? <Link href={`/artists/${slug}`} style={{ textDecoration: 'none' }}>{name}</Link> : name}</span>
              {on && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: ink }}><span className="ak-pulse" style={{ width: 7, height: 7, borderRadius: 4, background: ink }} />ON NOW</span>}
              {up && <span style={{ fontFamily: FONT.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: T.text2 }}>UP NEXT</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
