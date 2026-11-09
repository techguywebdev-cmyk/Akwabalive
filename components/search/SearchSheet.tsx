'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Briefcase, Check, Church, Cpu, Flame, HeartPulse, Landmark, Mic2, Moon, Plus, Search, Shirt, Smile, Sparkles, Tent, UtensilsCrossed, Waves, X,
  type LucideIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { hiRes } from '@/lib/events/image';
import { listTitle } from '@/lib/titles';
import { parseDay, shortDay } from '@/lib/dates';
import { T, FONT, GRAD } from '@/lib/thiscene';

export type FoundEvent = { slug: string; title: string; date: string; time: string | null; venue: string | null; city: string | null; area?: string | null; image_url: string | null };
const SELECT = 'slug, title, date, time, venue, city, area, image_url';

/** Kinds of night out: by our category, or by words in the title/description where we have no category (pool parties, kids) */
type Vibe = { key: string; label: string; icon: LucideIcon; cats?: string[]; re?: string; desc?: string };
const VIBES: Vibe[] = [
  { key: 'concert', label: 'Concerts', icon: Mic2, cats: ['concert'] },
  { key: 'festival', label: 'Festivals', icon: Tent, cats: ['festival'] },
  { key: 'nightlife', label: 'Nightlife', icon: Moon, cats: ['nightlife'] },
  { key: 'pool', label: 'Pool & beach', icon: Waves, re: 'pool|splash|swim|beach party|beach rave|boat' },
  { key: 'church', label: 'Church & worship', icon: Church, cats: ['faith'], re: 'church|worship|praise|gospel|crusade|prayer' },
  { key: 'kids', label: 'Kids & family', icon: Smile, re: 'kids|children|family|fun ?fair|toddler', desc: 'for kids|for children|family friendly|family-friendly|kids zone|kids corner|bring the kids' },
  { key: 'food', label: 'Food & drink', icon: UtensilsCrossed, cats: ['food'], re: 'food|brunch|bbq|grill|wine|cocktail' },
  { key: 'culture', label: 'Culture & art', icon: Landmark, cats: ['culture', 'art'] },
  { key: 'tech', label: 'Tech', icon: Cpu, cats: ['tech'], re: 'tech|hackathon|developer|startup' },
  { key: 'business', label: 'Business', icon: Briefcase, cats: ['business'] },
  { key: 'fashion', label: 'Fashion', icon: Shirt, cats: ['fashion'] },
  { key: 'wellness', label: 'Fitness & wellness', icon: HeartPulse, cats: ['wellness', 'sports'], re: 'fitness|yoga|marathon|5k|wellness' },
];

type When = { key: string; label: string };
const WHENS: When[] = [
  { key: 'any', label: 'Any time' },
  { key: 'weekend', label: 'This weekend' },
  { key: 'week', label: 'Next 7 days' },
  { key: 'december', label: 'December' },
  { key: 'xmas', label: 'Christmas week' },
];

const iso = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' });
function range(key: string): [string, string] | null {
  const now = new Date();
  const today = iso(now);
  const add = (n: number) => iso(new Date(now.getTime() + n * 86400000));
  const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  switch (key) {
    case 'weekend': { const dow = now.getDay(); const toFri = dow === 0 ? -2 : dow === 6 ? -1 : 5 - dow; return [dow === 0 || dow >= 5 ? today : add(toFri), add(dow === 0 ? 0 : 7 - dow)]; }
    case 'week': return [today, add(7)];
    case 'december': return [`${y}-12-01`, `${y}-12-31`];
    case 'xmas': return [`${y}-12-20`, `${y + 1}-01-01`];
    default: return null;
  }
}
const clean = (s: string) => s.replace(/[%,()*"]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Find shows, right where you are. Search by name, venue, city or artist, or browse: pick a kind of night
 * (pool party, church, kids, tech…) and a time. With nothing picked, the big nights and this weekend.
 * Browse mode opens the event; add mode (a calendar) puts +/✓ on each show instead.
 */
export default function SearchSheet({ onClose, title = 'Search shows', isIn, onToggle, day }: {
  /** Open on one night (YYYY-MM-DD): what's on then, or nearby nights when nothing is */
  day?: string;
  onClose: () => void;
  title?: string;
  isIn?: (slug: string) => boolean;
  onToggle?: (e: FoundEvent) => void;
}) {
  const db = useMemo(() => createClient(), []);
  const [q, setQ] = useState('');
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [when, setWhen] = useState(day ? 'day' : 'any');
  const [nearby, setNearby] = useState(false);
  const [hot, setHot] = useState<FoundEvent[]>([]);
  const [weekend, setWeekend] = useState<FoundEvent[]>([]);
  const [found, setFound] = useState<FoundEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const today = iso(new Date());
  const adding = !!onToggle;
  const browsing = !clean(q) && !vibe && when === 'any';

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Header search starts typing; picking shows for a calendar starts browsing (no keyboard over the chips)
    if (!onToggle) setTimeout(() => input.current?.focus(), 60);
    return () => { document.body.style.overflow = prev; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The starting picks: big nights, and what's on this weekend
  useEffect(() => {
    const base = () => db.from('events').select(SELECT).eq('status', 'published');
    const [a, b] = range('weekend')!;
    base().eq('is_hot', true).gte('date', today).order('date').limit(12).then(({ data }) => setHot((data ?? []) as FoundEvent[]));
    base().gte('date', a).lte('date', b).order('is_hot', { ascending: false }).order('date').limit(12).then(({ data }) => setWeekend((data ?? []) as FoundEvent[]));
  }, [db, today]);

  // Search and filters
  useEffect(() => {
    const term = clean(q);
    if (browsing || (term && term.length < 2 && !vibe && when === 'any')) { setFound(null); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      let qb = db.from('events').select(SELECT).eq('status', 'published');
      const r = when === 'day' && day ? [day, day] as [string, string] : range(when);
      qb = r ? qb.gte('date', r[0] < today ? today : r[0]).lte('date', r[1]) : qb.gte('date', today);
      if (vibe) {
        const parts = [...(vibe.cats ?? []).map((c) => `category.eq.${c}`), ...(vibe.re ? [`title.imatch."${vibe.re}"`] : []), ...(vibe.desc ? [`description.imatch."${vibe.desc}"`] : [])];
        qb = parts.length === 1 && vibe.cats?.length === 1 ? qb.eq('category', vibe.cats[0]) : qb.or(parts.join(','));
      } else if (term) {
        const like = `%${term}%`;
        qb = qb.or(`title.ilike.${like},venue.ilike.${like},city.ilike.${like},area.ilike.${like}`);
      }
      const { data } = await qb.order('date').limit(vibe && term ? 120 : 60);
      let list = (data ?? []) as FoundEvent[];
      // Typing inside a kind of night narrows it here
      if (vibe && term) {
        const w = term.toLowerCase();
        list = list.filter((e) => [e.title, e.venue, e.city, e.area].some((x) => x?.toLowerCase().includes(w)));
      }
      // Nothing listed that night: show the nights around it
      if (!list.length && when === 'day' && day && !term && !vibe) {
        const t0 = Date.parse(`${day}T12:00:00Z`);
        const d = (n: number) => new Date(t0 + n * 86400000).toISOString().slice(0, 10);
        const { data: near } = await db.from('events').select(SELECT).eq('status', 'published').gte('date', d(-3) < today ? today : d(-3)).lte('date', d(3)).order('date').limit(30);
        list = (near ?? []) as FoundEvent[];
        setNearby(true);
      } else setNearby(false);
      setFound(list);
      setLoading(false);
    }, term ? 220 : 0);
    return () => clearTimeout(t);
  }, [q, vibe, when, db, today, browsing, day]);

  const chip = (on: boolean): React.CSSProperties => ({
    flexShrink: 0, height: 38, padding: '0 14px', borderRadius: 12, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7,
    background: on ? 'rgba(123,227,168,0.18)' : 'rgba(255,255,255,0.06)', color: on ? T.mintText : T.text, fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap',
    transition: 'background 150ms ease, color 150ms ease',
  });
  const label: React.CSSProperties = { margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.mintText };
  const flyer = (e: FoundEvent, w: number) => (e.image_url ? hiRes(e.image_url, w) ?? e.image_url : null);

  const addBtn = (e: FoundEvent, size = 38) => {
    const on = isIn?.(e.slug) ?? false;
    return (
      <button type="button" onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); onToggle!(e); }} aria-pressed={on} aria-label={on ? `Remove ${e.title}` : `Add ${e.title}`}
        style={{ width: size, height: size, borderRadius: size * 0.32, border: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? GRAD.mint : 'rgba(255,255,255,0.1)', color: on ? T.onMint : T.white, boxShadow: on ? 'none' : '0 4px 14px rgba(0,0,0,0.35)', transition: 'background 160ms ease' }}>
        {on ? <Check size={size * 0.47} strokeWidth={3} /> : <Plus size={size * 0.47} />}
      </button>
    );
  };

  const row = (e: FoundEvent) => {
    const d = parseDay(e.date);
    return (
      <li key={e.slug} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href={`/events/${e.slug}`} onClick={adding ? (ev) => { ev.preventDefault(); onToggle!(e); } : onClose}
          style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 14, padding: '7px 0', textDecoration: 'none' }}>
          {flyer(e, 160)
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={flyer(e, 160)!} alt="" width={46} height={58} style={{ width: 46, height: 58, borderRadius: 11, objectFit: 'cover', flexShrink: 0 }} />
            : <span style={{ width: 46, height: 58, borderRadius: 11, flexShrink: 0, background: GRAD.card }} />}
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{listTitle(e.title)}</span>
            <span style={{ display: 'block', marginTop: 3, fontFamily: FONT.sans, fontSize: 13, color: T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ color: T.mintText, fontWeight: 700 }}>{d ? shortDay(d) : ''}</span>{e.venue ? ` · ${e.venue}` : ''}
            </span>
          </span>
        </Link>
        {adding && addBtn(e)}
      </li>
    );
  };

  /** Big flyer cards for the starting picks */
  const card = (e: FoundEvent) => {
    const d = parseDay(e.date);
    return (
      <Link key={e.slug} href={`/events/${e.slug}`} onClick={adding ? (ev) => { ev.preventDefault(); onToggle!(e); } : onClose}
        style={{ flexShrink: 0, width: 128, textDecoration: 'none' }}>
        <span style={{ position: 'relative', display: 'block', width: 128, height: 160, borderRadius: 16, overflow: 'hidden', background: GRAD.card, boxShadow: '0 12px 28px -12px rgba(0,0,0,0.8)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {flyer(e, 300) && <img src={flyer(e, 300)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
          {adding && <span style={{ position: 'absolute', right: 7, bottom: 7 }}>{addBtn(e, 32)}</span>}
        </span>
        <span style={{ display: 'block', marginTop: 8, fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 700, color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{listTitle(e.title)}</span>
        <span style={{ display: 'block', marginTop: 1, fontFamily: FONT.sans, fontSize: 12.5, color: T.mintText, fontWeight: 600 }}>{d ? shortDay(d) : ''}</span>
      </Link>
    );
  };

  const heading = found
    ? nearby ? `Nothing on ${shortDay(parseDay(day!)!)}, here’s what’s near` : [vibe?.label, when === 'day' && day ? shortDay(parseDay(day)!) : when !== 'any' ? WHENS.find((w) => w.key === when)?.label : null].filter(Boolean).join(' · ') || 'Results'
    : '';

  const sheet = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 450, display: 'flex', flexDirection: 'column' }}>
      <button type="button" aria-label="Close" onClick={onClose} style={{ position: 'absolute', inset: 0, border: 'none', background: 'rgba(0,0,0,0.55)', cursor: 'pointer' }} />
      <section role="dialog" aria-label={title} style={{
        position: 'relative', width: '100%', maxWidth: 640, margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(180deg, rgba(14,28,21,0.985) 0%, rgba(7,12,9,0.995) 100%)', animation: 'ssIn 240ms cubic-bezier(0.22,1,0.36,1)',
      }}>
        <style>{'@keyframes ssIn{from{opacity:0;transform:translateY(-14px)}to{opacity:1;transform:none}}'}</style>

        {/* Search, then kinds of night and when */}
        <div style={{ padding: 'calc(14px + env(safe-area-inset-top, 0px)) 0 10px' }}>
          <div style={{ padding: '0 16px' }}>
            {adding && <p style={{ margin: '0 0 10px 4px', fontFamily: FONT.display, fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>{title}</p>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ flex: 1, position: 'relative', display: 'block' }}>
                <Search size={18} style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none' }} />
                <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} type="search" enterKeyHint="search" placeholder={vibe ? `Search ${vibe.label.toLowerCase()}` : 'Shows, artists, venues, cities'} aria-label="Search shows"
                  style={{ width: '100%', boxSizing: 'border-box', height: 50, padding: '0 40px 0 44px', borderRadius: 15, border: 'none', outline: 'none', background: 'rgba(255,255,255,0.08)', color: T.white, fontFamily: FONT.sans, fontSize: 16 }} />
                {q && <button type="button" onClick={() => { setQ(''); input.current?.focus(); }} aria-label="Clear" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30, borderRadius: 9, border: 'none', background: 'rgba(255,255,255,0.08)', color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>}
              </label>
              <button type="button" onClick={onClose} style={{ height: 50, padding: '0 6px', border: 'none', background: 'none', color: T.white, fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>{adding ? 'Done' : 'Cancel'}</button>
            </div>
          </div>
          <div className="no-scrollbar" role="radiogroup" aria-label="Kind of night" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 16px 0' }}>
            {VIBES.map((v) => {
              const I = v.icon; const on = vibe?.key === v.key;
              return <button key={v.key} type="button" role="radio" aria-checked={on} onClick={() => setVibe(on ? null : v)} style={chip(on)}><I size={15} />{v.label}</button>;
            })}
          </div>
          <div className="no-scrollbar" role="radiogroup" aria-label="When" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '8px 16px 0' }}>
            {day && (
              <button type="button" role="radio" aria-checked={when === 'day'} onClick={() => setWhen('day')}
                style={{ ...chip(when === 'day'), height: 32, padding: '0 12px', fontSize: 13, background: when === 'day' ? 'rgba(123,227,168,0.14)' : 'transparent' }}>{shortDay(parseDay(day)!)}</button>
            )}
            {WHENS.map((w) => (
              <button key={w.key} type="button" role="radio" aria-checked={when === w.key} onClick={() => setWhen(w.key)}
                style={{ ...chip(when === w.key), height: 32, padding: '0 12px', fontSize: 13, background: when === w.key ? 'rgba(123,227,168,0.14)' : 'transparent' }}>{w.label}</button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px calc(30px + env(safe-area-inset-bottom, 0px))' }}>
          {found ? (
            <>
              <p style={{ ...label, margin: '6px 0 6px' }}>{loading ? 'Looking…' : `${heading} · ${found.length} ${found.length === 1 ? 'show' : 'shows'}`}</p>
              {!loading && !found.length && (
                <p style={{ margin: '14px 0 0', fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.5, color: T.text2 }}>
                  Nothing coming up for that yet. Try another time{vibe ? ' or kind of night' : ', an artist, a venue or a city'}.
                </p>
              )}
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 2, opacity: loading ? 0.6 : 1, transition: 'opacity 150ms ease' }}>{found.map(row)}</ul>
            </>
          ) : (
            <>
              {hot.length > 0 && (
                <section>
                  <p style={label}><Flame size={13} />The big nights</p>
                  <div className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', margin: '12px -20px 0', padding: '0 20px 4px' }}>{hot.map(card)}</div>
                </section>
              )}
              {weekend.length > 0 && (
                <section style={{ marginTop: 28 }}>
                  <p style={label}><Sparkles size={13} />This weekend</p>
                  <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 2 }}>{weekend.map(row)}</ul>
                </section>
              )}
              <p style={{ margin: '26px 0 0', fontFamily: FONT.sans, fontSize: 13.5, lineHeight: 1.5, color: T.text3 }}>Not sure what you’re after? Pick a kind of night up top: pool parties, church, kids, tech and more.</p>
            </>
          )}
        </div>
      </section>
    </div>
  );
  return typeof document !== 'undefined' ? createPortal(sheet, document.body) : null;
}
