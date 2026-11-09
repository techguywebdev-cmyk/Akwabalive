'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Check, Flame, Plus, Search, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { hiRes } from '@/lib/events/image';
import { listTitle } from '@/lib/titles';
import { parseDay, shortDay } from '@/lib/dates';
import { T, FONT, GRAD } from '@/lib/thiscene';

export type FoundEvent = { slug: string; title: string; date: string; time: string | null; venue: string | null; city: string | null; image_url: string | null };
const SELECT = 'slug, title, date, time, venue, city, image_url';

/**
 * Search, right where you are: type and upcoming shows appear (by name, venue, city or artist). With nothing
 * typed, the big nights. Browse mode opens the event; add mode (a calendar) puts a +/✓ on each row instead.
 */
export default function SearchSheet({ onClose, title = 'Search shows', isIn, onToggle }: {
  onClose: () => void;
  title?: string;
  /** Add mode: whether a show is already in, and adding/removing it */
  isIn?: (slug: string) => boolean;
  onToggle?: (e: FoundEvent) => void;
}) {
  const db = useMemo(() => createClient(), []);
  const [q, setQ] = useState('');
  const [hot, setHot] = useState<FoundEvent[]>([]);
  const [found, setFound] = useState<FoundEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().slice(0, 10);
  const adding = !!onToggle;

  // The page behind stays put
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => input.current?.focus(), 60);
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    db.from('events').select(SELECT).eq('status', 'published').eq('is_hot', true).gte('date', today).order('date').limit(12)
      .then(({ data }) => setHot((data ?? []) as FoundEvent[]));
  }, [db, today]);

  useEffect(() => {
    const term = q.trim().replace(/[%,()*]/g, ' ').replace(/\s+/g, ' ').trim();
    if (term.length < 2) { setFound(null); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const like = `%${term}%`;
      const { data } = await db.from('events').select(SELECT).eq('status', 'published').gte('date', today)
        .or(`title.ilike.${like},venue.ilike.${like},city.ilike.${like},area.ilike.${like}`)
        .order('date').limit(40);
      setFound((data ?? []) as FoundEvent[]);
      setLoading(false);
    }, 220);
    return () => clearTimeout(t);
  }, [q, db, today]);

  const list = found ?? hot;

  const row = (e: FoundEvent) => {
    const d = parseDay(e.date);
    const on = isIn?.(e.slug) ?? false;
    const body = (
      <>
        {e.image_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={hiRes(e.image_url, 160) ?? e.image_url} alt="" width={46} height={58} style={{ width: 46, height: 58, borderRadius: 11, objectFit: 'cover', flexShrink: 0 }} />
          : <span style={{ width: 46, height: 58, borderRadius: 11, flexShrink: 0, background: GRAD.card }} />}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{listTitle(e.title)}</span>
          <span style={{ display: 'block', marginTop: 3, fontFamily: FONT.sans, fontSize: 13, color: T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: T.mintText, fontWeight: 700 }}>{d ? shortDay(d) : ''}</span>{e.venue ? ` · ${e.venue}` : ''}
          </span>
        </span>
      </>
    );
    return (
      <li key={e.slug} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href={`/events/${e.slug}`} onClick={adding ? (ev) => { ev.preventDefault(); onToggle!(e); } : onClose}
          style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 14, padding: '7px 0', textDecoration: 'none' }}>
          {body}
        </Link>
        {adding && (
          <button type="button" onClick={() => onToggle!(e)} aria-pressed={on} aria-label={on ? `Remove ${e.title}` : `Add ${e.title}`}
            style={{ width: 38, height: 38, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? GRAD.mint : 'rgba(255,255,255,0.08)', color: on ? T.onMint : T.white, transition: 'background 160ms ease' }}>
            {on ? <Check size={18} strokeWidth={3} /> : <Plus size={18} />}
          </button>
        )}
      </li>
    );
  };

  const sheet = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 450, display: 'flex', flexDirection: 'column' }}>
      <button type="button" aria-label="Close" onClick={onClose} style={{ position: 'absolute', inset: 0, border: 'none', background: 'rgba(0,0,0,0.55)', cursor: 'pointer' }} />
      <section role="dialog" aria-label={title} style={{
        position: 'relative', width: '100%', maxWidth: 640, margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(180deg, rgba(14,28,21,0.985) 0%, rgba(7,12,9,0.995) 100%)', animation: 'ssIn 240ms cubic-bezier(0.22,1,0.36,1)',
      }}>
        <style>{'@keyframes ssIn{from{opacity:0;transform:translateY(-14px)}to{opacity:1;transform:none}}'}</style>
        <div style={{ padding: 'calc(14px + env(safe-area-inset-top, 0px)) 16px 10px' }}>
          {adding && <p style={{ margin: '0 0 10px 4px', fontFamily: FONT.display, fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>{title}</p>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ flex: 1, position: 'relative', display: 'block' }}>
              <Search size={18} style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none' }} />
              <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} type="search" enterKeyHint="search" placeholder="Shows, artists, venues, cities" aria-label="Search shows"
                style={{ width: '100%', boxSizing: 'border-box', height: 50, padding: '0 40px 0 44px', borderRadius: 15, border: 'none', outline: 'none', background: 'rgba(255,255,255,0.08)', color: T.white, fontFamily: FONT.sans, fontSize: 16 }} />
              {q && <button type="button" onClick={() => { setQ(''); input.current?.focus(); }} aria-label="Clear" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30, borderRadius: 9, border: 'none', background: 'rgba(255,255,255,0.08)', color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>}
            </label>
            <button type="button" onClick={onClose} style={{ height: 50, padding: '0 6px', border: 'none', background: 'none', color: T.white, fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>{adding ? 'Done' : 'Cancel'}</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 20px calc(30px + env(safe-area-inset-bottom, 0px))' }}>
          <p style={{ margin: '6px 0 6px', display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.mintText }}>
            {found ? (loading ? 'Searching…' : `${found.length} ${found.length === 1 ? 'show' : 'shows'}`) : <><Flame size={13} />The big nights</>}
          </p>
          {found && !loading && !found.length && <p style={{ margin: '14px 0 0', fontFamily: FONT.sans, fontSize: 15, color: T.text2 }}>Nothing coming up for “{q.trim()}”. Try an artist, a venue or a city.</p>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 2, opacity: loading ? 0.6 : 1, transition: 'opacity 150ms ease' }}>{list.map(row)}</ul>
        </div>
      </section>
    </div>
  );
  return typeof document !== 'undefined' ? createPortal(sheet, document.body) : null;
}
