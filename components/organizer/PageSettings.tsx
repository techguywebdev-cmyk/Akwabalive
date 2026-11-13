'use client';

import { useMemo, useRef, useState, type CSSProperties } from 'react';
import { Check, ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { T, FONT } from '@/lib/thiscene';
import { PAGE_ACCENTS, GALLERY_MAX, FAQ_MAX, onAccent, type EventPage } from '@/lib/events/page';

const field: CSSProperties = {
  display: 'block', width: '100%', boxSizing: 'border-box', height: 50, padding: '0 16px', borderRadius: 16,
  background: 'rgba(255,255,255,0.06)', border: 'none', color: T.white, fontFamily: FONT.sans, fontSize: 15.5, outline: 'none',
};
const area: CSSProperties = { ...field, height: 'auto', padding: '12px 16px', lineHeight: 1.5, resize: 'vertical' };
const label: CSSProperties = { display: 'block', margin: '0 0 7px 4px', fontFamily: FONT.sans, fontSize: 13, fontWeight: 500, color: T.text2 };
const hint: CSSProperties = { display: 'block', margin: '6px 0 0 4px', fontFamily: FONT.sans, fontSize: 12.5, color: T.text3 };

/**
 * The organiser's page: everything that makes the event page work as their own website.
 * Short link, their colour, photos, how to get there and the questions people ask.
 */
export default function PageSettings({ page, onPage, code, onCode, slugHint }: {
  page: EventPage; onPage: (p: EventPage) => void; code: string; onCode: (c: string) => void; slugHint: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const pick = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [err, setErr] = useState('');
  const [custom, setCustom] = useState(!!page.accent && !PAGE_ACCENTS.includes(page.accent));
  const set = <K extends keyof EventPage>(k: K, v: EventPage[K]) => onPage({ ...page, [k]: v });
  const gallery = page.gallery ?? [];
  const faqs = page.faqs ?? [];

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setErr('');
    const room = GALLERY_MAX - gallery.length;
    const list = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, room);
    if (!list.length) { setErr(room ? 'Choose photos (JPG, PNG or WebP).' : `That’s the most (${GALLERY_MAX}) for now.`); return; }
    setUploading(list.length);
    const urls: string[] = [];
    for (const f of list) {
      if (f.size > 10 * 1024 * 1024) { setErr('Some photos were over 10 MB and were skipped.'); setUploading((n) => n - 1); continue; }
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `events/gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('event-images').upload(path, f, { cacheControl: '31536000', contentType: f.type });
      if (!error) urls.push(supabase.storage.from('event-images').getPublicUrl(path).data.publicUrl);
      setUploading((n) => n - 1);
    }
    set('gallery', [...gallery, ...urls]);
    if (pick.current) pick.current.value = '';
  }

  const swatch = (c: string | null, i: number) => {
    const on = (page.accent ?? null) === c && !(c === null && custom);
    return (
      <button key={c ?? 'auto'} type="button" onClick={() => { setCustom(false); set('accent', c); }} aria-pressed={on} aria-label={c ? `Colour ${i}` : 'From the flyer'}
        style={{ width: 40, height: 40, borderRadius: 20, flexShrink: 0, cursor: 'pointer', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: c ?? 'conic-gradient(#7BE3A8, #F5C451, #FF7A59, #B57BFF, #5AA9FF, #7BE3A8)', boxShadow: on ? `0 0 0 2px #030806, 0 0 0 4px ${c ?? T.white}` : 'inset 0 0 0 1px rgba(255,255,255,0.12)' }}>
        {on && <Check size={18} color={c ? onAccent(c) : '#06110B'} strokeWidth={3} />}
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Short link */}
      <label style={{ display: 'block' }}>
        <span style={label}>Your link</span>
        <span style={{ ...field, display: 'flex', alignItems: 'center', padding: 0, overflow: 'hidden' }}>
          <span style={{ padding: '0 2px 0 16px', fontFamily: FONT.sans, fontSize: 15.5, color: T.text3, whiteSpace: 'nowrap' }}>tsacoal.com/e/</span>
          <input value={code} onChange={(e) => onCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+/, '').slice(0, 40))} placeholder={slugHint} maxLength={40} autoCapitalize="none" autoCorrect="off" spellCheck={false}
            style={{ flex: 1, minWidth: 0, height: '100%', border: 'none', background: 'transparent', color: T.white, fontFamily: FONT.sans, fontSize: 15.5, outline: 'none', padding: '0 16px 0 0' }} />
        </span>
        <span style={hint}>The link you send people. Letters, numbers and dashes, like <b style={{ color: T.text2 }}>bhimfest</b>.</span>
      </label>

      {/* Colour */}
      <div>
        <span style={label}>Page colour</span>
        <div className="no-scrollbar" style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '4px 4px 6px' }}>
          {swatch(null, 0)}
          {PAGE_ACCENTS.map((c, i) => swatch(c, i + 1))}
          <label aria-label="Your own colour" style={{ position: 'relative', width: 40, height: 40, borderRadius: 20, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: custom && page.accent ? page.accent : 'rgba(255,255,255,0.06)', boxShadow: custom ? `0 0 0 2px #030806, 0 0 0 4px ${page.accent ?? T.white}` : 'inset 0 0 0 1px rgba(255,255,255,0.12)' }}>
            {!custom && <Plus size={18} color={T.text2} />}
            <input type="color" value={page.accent ?? '#7BE3A8'} onChange={(e) => { setCustom(true); set('accent', e.target.value.toUpperCase()); }} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
          </label>
        </div>
        <span style={hint}>Buttons and headings on your page. The first one takes it from your flyer.</span>
      </div>

      {/* Gallery */}
      <div>
        <span style={label}>Photos <span style={{ color: T.text3 }}>({gallery.length}/{GALLERY_MAX})</span></span>
        <input ref={pick} type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {gallery.map((u, i) => (
            <span key={u} style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 12, overflow: 'hidden', background: '#0B1510' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button type="button" aria-label="Remove photo" onClick={() => set('gallery', gallery.filter((_, j) => j !== i))}
                style={{ position: 'absolute', top: 4, right: 4, width: 26, height: 26, borderRadius: 13, border: 'none', background: 'rgba(0,0,0,0.65)', color: T.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={14} /></button>
            </span>
          ))}
          {gallery.length < GALLERY_MAX && (
            <button type="button" onClick={() => pick.current?.click()} disabled={uploading > 0}
              style={{ aspectRatio: '1 / 1', borderRadius: 12, border: '1.5px dashed rgba(255,255,255,0.18)', background: 'transparent', color: T.text2, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: FONT.sans, fontSize: 12 }}>
              {uploading > 0 ? <Loader2 size={20} className="spin" /> : <ImagePlus size={20} />}{uploading > 0 ? `${uploading} left` : 'Add'}
            </button>
          )}
        </div>
        <span style={hint}>{err || 'Crowd shots and stage photos from past editions or the venue. The first one shows biggest.'}</span>
      </div>

      {/* Getting there */}
      <label style={{ display: 'block' }}>
        <span style={label}>How to get there <span style={{ color: T.text3 }}>(optional)</span></span>
        <textarea value={page.directions ?? ''} onChange={(e) => set('directions', e.target.value)} rows={3} maxLength={600} placeholder="e.g. Use the East Legon gate opposite the Shell station. Ubers can drop you at the main entrance." style={area} />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label style={{ display: 'block' }}>
          <span style={label}>Gates open</span>
          <input value={page.doors ?? ''} onChange={(e) => set('doors', e.target.value)} maxLength={60} placeholder="e.g. 6 PM" style={field} />
        </label>
        <label style={{ display: 'block' }}>
          <span style={label}>Parking</span>
          <input value={page.parking ?? ''} onChange={(e) => set('parking', e.target.value)} maxLength={300} placeholder="e.g. Free parking on site" style={field} />
        </label>
      </div>
      <label style={{ display: 'block' }}>
        <span style={label}>Refunds <span style={{ color: T.text3 }}>(optional)</span></span>
        <input value={page.refunds ?? ''} onChange={(e) => set('refunds', e.target.value)} maxLength={400} placeholder="e.g. No refunds, but you can transfer your ticket" style={field} />
      </label>

      {/* Questions */}
      <div>
        <span style={label}>Questions people ask <span style={{ color: T.text3 }}>(optional)</span></span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {faqs.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input value={f.q} onChange={(e) => set('faqs', faqs.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} maxLength={160} placeholder="Question, e.g. Can I bring food?" style={{ ...field, height: 46, fontWeight: 600 }} />
                <textarea value={f.a} onChange={(e) => set('faqs', faqs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} rows={2} maxLength={800} placeholder="Answer" style={area} />
              </div>
              <button type="button" aria-label="Remove question" onClick={() => set('faqs', faqs.filter((_, j) => j !== i))}
                style={{ width: 40, height: 40, marginTop: 3, borderRadius: 20, border: 'none', background: 'rgba(255,255,255,0.06)', color: T.text2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}><Trash2 size={16} /></button>
            </div>
          ))}
          {faqs.length < FAQ_MAX && (
            <button type="button" onClick={() => set('faqs', [...faqs, { q: '', a: '' }])}
              style={{ height: 46, borderRadius: 16, border: '1.5px dashed rgba(255,255,255,0.18)', background: 'transparent', color: T.white, fontFamily: FONT.sans, fontSize: 14.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Plus size={17} /> Add a question
            </button>
          )}
        </div>
        <span style={hint}>Gates, parking and refunds above are added for you.</span>
      </div>
    </div>
  );
}
