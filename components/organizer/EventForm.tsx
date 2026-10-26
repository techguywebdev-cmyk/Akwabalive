'use client';

import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ImagePlus, Link2, Plus, Trash2, X, Ticket, ExternalLink, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { majorArtists } from '@/lib/data/artists';
import { lineupPayload, type LineupValue } from '@/components/organizer/LineupPicker';
import { Icon, CATEGORY_ICONS } from '@/components/ui/Icon';
import { card } from '@/components/organizer/ui';
import { T, FONT } from '@/lib/thiscene';

/* ── Options ─────────────────────────────────────────────────────────── */
export const CATEGORIES = [
  ['concert', 'Concert'], ['festival', 'Festival'], ['nightlife', 'Nightlife'], ['culture', 'Culture'], ['food', 'Food & drink'],
  ['art', 'Art'], ['fashion', 'Fashion'], ['sports', 'Sports'], ['tech', 'Tech'], ['wellness', 'Wellness'],
] as const;
export const CITIES = [['accra', 'Accra'], ['kumasi', 'Kumasi'], ['cape-coast', 'Cape Coast'], ['takoradi', 'Takoradi'], ['tamale', 'Tamale'], ['ho', 'Ho']] as const;
const REGIONS: Record<string, string> = { accra: 'Greater Accra', kumasi: 'Ashanti', 'cape-coast': 'Central', takoradi: 'Western', tamale: 'Northern', ho: 'Volta' };
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ── Values ──────────────────────────────────────────────────────────── */
export type TierDraft = { id?: string; name: string; price: string; quantity: string; description: string; sold: number };
export type EventDraft = {
  id?: string;
  status: string;
  title: string; description: string; category: string;
  city: string; venue: string; area: string;
  date: string; start: string; end: string; // HH:MM (24h) in the inputs
  image: string;
  listing: 'hosted' | 'listed'; ticketUrl: string; ticketSource: string;
  lineup: LineupValue;
  tiers: TierDraft[];
};

export const emptyDraft = (): EventDraft => ({
  status: 'draft', title: '', description: '', category: '', city: 'accra', venue: '', area: '',
  date: '', start: '20:00', end: '', image: '', listing: 'hosted', ticketUrl: '', ticketSource: '',
  lineup: { enabled: false, artistSlugs: [], extraNames: '' },
  tiers: [{ name: 'Regular', price: '', quantity: '200', description: '', sold: 0 }],
});

/** "20:00" → "8:00 PM" */
export function to12h(hhmm: string) {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return hhmm;
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`;
}
/** "8:00 PM" / "20:00" → "20:00" */
export function to24h(t: string | null | undefined) {
  if (!t) return '';
  const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*([ap]m)?/i);
  if (!m) return '';
  let h = Number(m[1]) % 12;
  if (!m[3]) h = Number(m[1]);
  else if (/pm/i.test(m[3])) h += 12;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}
const dayLabel = (iso: string) => { const d = new Date(`${iso}T00:00:00`); return Number.isNaN(d.getTime()) ? iso : `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const hostOf = (u: string) => { try { return new URL(u.trim()).hostname.replace(/^www\./, ''); } catch { return null; } };
const slugify = (t: string) => `${t.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60)}-${Math.random().toString(36).slice(2, 7)}`;

/* ── Bits ────────────────────────────────────────────────────────────── */
const field: CSSProperties = {
  width: '100%', boxSizing: 'border-box', height: 52, padding: '0 16px', borderRadius: 16, outline: 'none',
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: T.white,
  fontFamily: FONT.sans, fontSize: 16, colorScheme: 'dark',
};
const labelCss: CSSProperties = { display: 'block', margin: '0 0 7px 4px', fontFamily: FONT.sans, fontSize: 13, fontWeight: 500, color: T.text2 };

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>{title}</h2>
        {note && <p style={{ margin: '4px 0 0', fontFamily: FONT.sans, fontSize: 13.5, lineHeight: 1.45, color: T.text2 }}>{note}</p>}
      </div>
      {children}
    </section>
  );
}
function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label style={{ display: 'block', minWidth: 0 }}>
      <span style={labelCss}>{label}</span>
      {children}
      {hint && <span style={{ display: 'block', margin: '6px 0 0 4px', fontFamily: FONT.sans, fontSize: 12.5, color: T.text3 }}>{hint}</span>}
    </label>
  );
}
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} style={{ flexShrink: 0, height: 40, padding: '0 14px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, background: on ? T.white : 'rgba(255,255,255,0.06)', color: on ? T.onMint : T.white, border: on ? '1px solid transparent' : '1px solid rgba(255,255,255,0.12)' }}>
      {children}
    </button>
  );
}

/* ── Flyer ───────────────────────────────────────────────────────────── */
function FlyerField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [byLink, setByLink] = useState(false);

  async function upload(file: File) {
    if (!file.type.startsWith('image/')) { setErr('Choose an image (JPG, PNG or WebP).'); return; }
    if (file.size > 10 * 1024 * 1024) { setErr('That image is over 10 MB. Try a smaller one.'); return; }
    setErr(''); setBusy(true);
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `events/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from('event-images').upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onChange(supabase.storage.from('event-images').getPublicUrl(path).data.publicUrl);
  }

  return (
    <div>
      {value ? (
        <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: '#000' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Event flyer" style={{ display: 'block', width: '100%', height: 'auto', maxHeight: 560, objectFit: 'contain' }} />
          <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => input.current?.click()} style={{ height: 38, padding: '0 14px', borderRadius: 19, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.6)', color: T.white, fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Change</button>
            <button type="button" aria-label="Remove flyer" onClick={() => onChange('')} style={{ width: 38, height: 38, borderRadius: 19, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.6)', color: T.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={18} /></button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => input.current?.click()} disabled={busy} style={{ width: '100%', minHeight: 220, borderRadius: 18, border: '1.5px dashed rgba(123,227,168,0.45)', background: 'rgba(123,227,168,0.05)', color: T.white, cursor: busy ? 'wait' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 }}>
          {busy ? <Loader2 size={30} className="animate-spin" color={T.mint} /> : <ImagePlus size={32} color={T.mint} />}
          <span style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: 700 }}>{busy ? 'Uploading…' : 'Add your flyer'}</span>
          <span style={{ fontFamily: FONT.sans, fontSize: 13.5, color: T.text2 }}>From your phone’s photos · JPG, PNG or WebP, up to 10 MB</span>
        </button>
      )}
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
      {err && <p role="alert" style={{ margin: '8px 0 0', fontFamily: FONT.sans, fontSize: 13.5, color: T.danger }}>{err}</p>}
      <button type="button" onClick={() => setByLink((v) => !v)} style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 500, color: T.mintText }}>
        <Link2 size={15} /> {byLink ? 'Hide link field' : 'Or paste an image link'}
      </button>
      {byLink && <input type="url" inputMode="url" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…/flyer.jpg" style={{ ...field, marginTop: 8 }} />}
    </div>
  );
}

/* ── Form ────────────────────────────────────────────────────────────── */
export default function EventForm({ initial, userId, mode }: { initial: EventDraft; userId: string; mode: 'create' | 'edit' }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [d, setD] = useState<EventDraft>(initial);
  const [busy, setBusy] = useState<'' | 'draft' | 'published'>('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const removed = useRef<string[]>([]);

  const set = <K extends keyof EventDraft>(k: K, v: EventDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  const setTier = (i: number, patch: Partial<TierDraft>) => setD((x) => ({ ...x, tiers: x.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) }));
  const addTier = () => setD((x) => ({ ...x, tiers: [...x.tiers, { name: x.tiers.length ? 'VIP' : 'Regular', price: '', quantity: '50', description: '', sold: 0 }] }));
  const removeTier = (i: number) => {
    const t = d.tiers[i];
    if (t.sold > 0) { setError(`“${t.name}” has ${t.sold} sold, so it can’t be removed. Set its quantity to what’s sold to stop sales.`); return; }
    if (t.id) removed.current.push(t.id);
    setD((x) => ({ ...x, tiers: x.tiers.filter((_, j) => j !== i) }));
  };
  const toggleArtist = (slug: string) => setD((x) => {
    const has = x.lineup.artistSlugs.includes(slug);
    return { ...x, lineup: { ...x.lineup, enabled: true, artistSlugs: has ? x.lineup.artistSlugs.filter((s) => s !== slug) : [...x.lineup.artistSlugs, slug] } };
  });

  function problems(publish: boolean): string[] {
    const p: string[] = [];
    if (!d.title.trim()) p.push('a title');
    if (publish) {
      if (!d.date) p.push('the date');
      if (!d.venue.trim()) p.push('the venue');
      if (!d.category) p.push('a category');
      if (d.listing === 'listed' && !/^https?:\/\//.test(d.ticketUrl.trim())) p.push('the ticket link');
      if (d.listing === 'hosted') {
        const real = d.tiers.filter((t) => t.name.trim());
        if (!real.length) p.push('at least one ticket type');
        if (real.some((t) => t.price === '' || Number.isNaN(Number(t.price)))) p.push('a price for every ticket type (0 for free)');
      }
    }
    return p;
  }

  async function save(target: 'draft' | 'published') {
    setError(''); setSaved('');
    const missing = problems(target === 'published');
    if (missing.length) { setError(`Add ${missing.join(', ')} to ${target === 'published' ? 'publish' : 'save'}.`); return; }
    setBusy(target);
    try {
      const bill = lineupPayload(d.lineup);
      const row = {
        title: d.title.trim(), description: d.description.trim() || null, category: d.category || 'concert',
        city: d.city, region: REGIONS[d.city] ?? d.city, venue: d.venue.trim() || 'Venue to be announced', area: d.area.trim() || null,
        date: d.date || null, date_label: d.date ? dayLabel(d.date) : null, time: d.start ? to12h(d.start) : 'Time TBA', end_time: d.end ? to12h(d.end) : null,
        image_url: d.image.trim() || null, status: target,
        listing_type: d.listing, ticket_url: d.listing === 'listed' ? d.ticketUrl.trim() : null, ticket_source: d.listing === 'listed' ? (d.ticketSource.trim() || hostOf(d.ticketUrl)) : null,
        artist_slugs: bill.artist_slugs, lineup: bill.lineup,
      };

      let id = d.id;
      if (!id) {
        const { data, error: e } = await supabase.from('events').insert({ ...row, organizer_id: userId, slug: slugify(d.title) }).select('id').single();
        if (e) throw e;
        id = data.id as string;
      } else {
        const { error: e } = await supabase.from('events').update({ ...row, updated_at: new Date().toISOString() }).eq('id', id).eq('organizer_id', userId);
        if (e) throw e;
      }

      // Ticket types: update existing ones in place (keeps tickets linked), add new, remove deleted unsold ones
      for (const t of d.tiers.filter((x) => x.name.trim())) {
        const tier = { name: t.name.trim(), description: t.description.trim() || null, price: Number(t.price) || 0, quantity: Math.max(t.sold, parseInt(t.quantity, 10) || 0) };
        const { error: e } = t.id
          ? await supabase.from('ticket_tiers').update(tier).eq('id', t.id)
          : await supabase.from('ticket_tiers').insert({ ...tier, event_id: id, sold: 0 });
        if (e) throw e;
      }
      if (removed.current.length) {
        const { error: e } = await supabase.from('ticket_tiers').delete().in('id', removed.current).eq('sold', 0);
        if (e) throw e;
        removed.current = [];
      }

      if (mode === 'create') { router.push(`/organizer/events/${id}/manage`); return; }
      set('status', target);
      setSaved(target === 'published' ? 'Saved and live' : 'Saved');
      setTimeout(() => setSaved(''), 2500);
      // reload tier ids for newly added ones
      const { data: fresh } = await supabase.from('ticket_tiers').select('id, name, price, quantity, sold, description').eq('event_id', id);
      if (fresh) set('tiers', fresh.sort((a: any, b: any) => a.price - b.price).map((t: any) => ({ id: t.id, name: t.name, price: String(t.price), quantity: String(t.quantity), description: t.description ?? '', sold: t.sold ?? 0 })));
    } catch (e: any) {
      setError(e?.message || 'Could not save. Please try again.');
    } finally {
      setBusy('');
    }
  }

  const live = d.status === 'published';

  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: 'calc(88px + env(safe-area-inset-top, 0px)) 20px calc(130px + env(safe-area-inset-bottom, 0px))' }}>
      <Link href={d.id ? `/organizer/events/${d.id}/manage` : '/organizer/dashboard'} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT.sans, fontSize: 14, color: T.text2, textDecoration: 'none' }}><ArrowLeft size={16} /> {d.id ? 'Back to event' : 'Dashboard'}</Link>
      <h1 style={{ margin: '12px 0 20px', fontFamily: FONT.display, fontSize: 'clamp(30px, 7vw, 40px)', fontWeight: 800, letterSpacing: '-0.035em', color: T.white }}>{mode === 'create' ? 'Create event' : 'Edit event'}</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Section title="Flyer" note="Shown full width on the feed. Portrait flyers (4:5) look best.">
          <FlyerField value={d.image} onChange={(v) => set('image', v)} />
        </Section>

        <Section title="About the event">
          <Field label="Event name"><input value={d.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Afrowave Thursdays" maxLength={120} style={field} /></Field>
          <div>
            <span style={labelCss}>Category</span>
            <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -18px', padding: '0 18px' }}>
              {CATEGORIES.map(([v, l]) => <Chip key={v} on={d.category === v} onClick={() => set('category', v)}><Icon name={CATEGORY_ICONS[v] ?? 'sparkle'} size={16} />{l}</Chip>)}
            </div>
          </div>
          <Field label="Description" hint="What to expect, dress code, age limit, who’s performing.">
            <textarea value={d.description} onChange={(e) => set('description', e.target.value)} rows={4} placeholder="Tell people why they should come." style={{ ...field, height: 'auto', padding: '14px 16px', lineHeight: 1.5, resize: 'vertical' }} />
          </Field>
        </Section>

        <Section title="When">
          <Field label="Date"><input type="date" value={d.date} onChange={(e) => set('date', e.target.value)} style={field} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Starts"><input type="time" value={d.start} onChange={(e) => set('start', e.target.value)} style={field} /></Field>
            <Field label="Ends (optional)"><input type="time" value={d.end} onChange={(e) => set('end', e.target.value)} style={field} /></Field>
          </div>
        </Section>

        <Section title="Where">
          <div>
            <span style={labelCss}>City</span>
            <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -18px', padding: '0 18px' }}>
              {CITIES.map(([v, l]) => <Chip key={v} on={d.city === v} onClick={() => set('city', v)}>{l}</Chip>)}
            </div>
          </div>
          <Field label="Venue"><input value={d.venue} onChange={(e) => set('venue', e.target.value)} placeholder="e.g. Afrikana Beach House" style={field} /></Field>
          <Field label="Area (optional)" hint="Helps people nearby find it, e.g. Osu, East Legon, Tema."><input value={d.area} onChange={(e) => set('area', e.target.value)} placeholder="e.g. Osu" style={field} /></Field>
        </Section>

        <Section title="Line-up" note="Optional. Fans following these artists get the event on their artist page.">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {majorArtists.slice(0, 18).map((a) => <Chip key={a.slug} on={d.lineup.artistSlugs.includes(a.slug)} onClick={() => toggleArtist(a.slug)}>{a.name}</Chip>)}
          </div>
          <Field label="Other performers" hint="Separate names with commas."><input value={d.lineup.extraNames} onChange={(e) => set('lineup', { ...d.lineup, enabled: true, extraNames: e.target.value })} placeholder="DJ Vyrusky, Kweku Smoke" style={field} /></Field>
        </Section>

        <Section title="Tickets">
          <div role="radiogroup" aria-label="How tickets are sold" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {([['hosted', 'Sell on Akwaaba', 'MoMo & card, QR tickets, door scanning'], ['listed', 'Sold elsewhere', 'Link to another ticket site']] as const).map(([v, t, n]) => {
              const on = d.listing === v;
              return (
                <button key={v} type="button" role="radio" aria-checked={on} onClick={() => set('listing', v)} style={{ textAlign: 'left', padding: 14, borderRadius: 18, cursor: 'pointer', background: on ? 'rgba(123,227,168,0.12)' : 'rgba(255,255,255,0.04)', border: on ? `1.5px solid ${T.mint}` : '1px solid rgba(255,255,255,0.1)', color: T.white, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {v === 'hosted' ? <Ticket size={20} color={on ? T.mint : T.text2} /> : <ExternalLink size={20} color={on ? T.mint : T.text2} />}
                  <span style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 700 }}>{t}</span>
                  <span style={{ fontFamily: FONT.sans, fontSize: 12.5, lineHeight: 1.4, color: T.text2 }}>{n}</span>
                </button>
              );
            })}
          </div>

          {d.listing === 'listed' && (
            <>
              <Field label="Ticket link"><input type="url" inputMode="url" value={d.ticketUrl} onChange={(e) => set('ticketUrl', e.target.value)} placeholder="https://egotickets.com/events/…" style={field} /></Field>
              <Field label="Ticket site name (optional)"><input value={d.ticketSource} onChange={(e) => set('ticketSource', e.target.value)} placeholder="e.g. Egotickets" style={field} /></Field>
            </>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {d.listing === 'listed' && <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 13.5, color: T.text2 }}>Prices (optional): shown on the card so people know what to expect.</p>}
            {d.tiers.map((t, i) => (
              <div key={t.id ?? `new-${i}`} style={{ padding: 14, borderRadius: 18, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, minWidth: 0 }}><Field label="Ticket name"><input value={t.name} onChange={(e) => setTier(i, { name: e.target.value })} placeholder="Regular, VIP, Table for 6…" style={field} /></Field></div>
                  <button type="button" onClick={() => removeTier(i)} aria-label={`Remove ${t.name || 'ticket type'}`} style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: T.text2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Trash2 size={18} /></button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Price (GH₵)" hint={t.price === '0' ? 'Free: people reserve a spot' : undefined}><input inputMode="decimal" value={t.price} onChange={(e) => setTier(i, { price: e.target.value.replace(/[^0-9.]/g, '') })} placeholder="0 for free" style={field} /></Field>
                  {d.listing === 'hosted' && <Field label="How many" hint={t.sold ? `${t.sold} sold so far` : undefined}><input inputMode="numeric" value={t.quantity} onChange={(e) => setTier(i, { quantity: e.target.value.replace(/\D/g, '') })} placeholder="100" style={field} /></Field>}
                </div>
                <Field label="What’s included (optional)"><input value={t.description} onChange={(e) => setTier(i, { description: e.target.value })} placeholder="e.g. Front section, one free drink" style={field} /></Field>
              </div>
            ))}
            <button type="button" onClick={addTier} style={{ height: 50, borderRadius: 16, border: '1.5px dashed rgba(255,255,255,0.18)', background: 'transparent', color: T.white, fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Plus size={18} /> Add ticket type</button>
          </div>
        </Section>
      </div>

      {/* Sticky save bar */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 150, padding: '14px 16px calc(14px + env(safe-area-inset-bottom, 0px))', background: 'linear-gradient(180deg, rgba(3,8,6,0) 0%, rgba(3,8,6,0.94) 30%, #030806 100%)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {(error || saved) && <p role={error ? 'alert' : 'status'} style={{ margin: '0 0 10px', padding: '10px 14px', borderRadius: 14, background: error ? 'rgba(255,138,138,0.12)' : 'rgba(123,227,168,0.12)', color: error ? T.danger : T.mintText, fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.4 }}>{error || saved}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            {(!live || mode === 'create') && (
              <button type="button" disabled={!!busy} onClick={() => save('draft')} style={{ flex: 1, height: 54, borderRadius: 999, cursor: 'pointer', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: T.white, fontFamily: FONT.display, fontSize: 15.5, fontWeight: 700 }}>{busy === 'draft' ? 'Saving…' : 'Save draft'}</button>
            )}
            <button type="button" disabled={!!busy} onClick={() => save('published')} style={{ flex: 1.4, height: 54, borderRadius: 999, cursor: 'pointer', background: T.mint, border: 'none', color: T.onMint, fontFamily: FONT.display, fontSize: 15.5, fontWeight: 700, boxShadow: '0 8px 24px rgba(123,227,168,0.22)' }}>{busy === 'published' ? 'Saving…' : live ? 'Save changes' : 'Publish'}</button>
          </div>
        </div>
      </div>
    </main>
  );
}
