'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { BTN } from '@/components/events/CardParts';
import type { ArtistPhoto } from '@/lib/artists/photos';
import { T, FONT, EASE } from '@/lib/thiscene';

const field: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)', color: T.white, fontFamily: FONT.sans, fontSize: 16, outline: 'none',
};

/** Admin only: upload a photo for an artist (press kit, or one you have permission to use) */
export default function ArtistPhotoSheet({ slug, name, current, onClose, onSaved }: {
  slug: string; name: string; current: ArtistPhoto | null; onClose: () => void; onSaved: (p: ArtistPhoto | null) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(current?.url ?? null);
  const [credit, setCredit] = useState(current?.source === 'upload' ? current.credit ?? '' : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [shown, setShown] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(raf); document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, []);

  function pick(f: File) {
    if (!f.type.startsWith('image/')) { setErr('Choose a photo.'); return; }
    if (f.size > 10 * 1024 * 1024) { setErr('That photo is over 10 MB.'); return; }
    setErr(''); setFile(f); setPreview(URL.createObjectURL(f));
  }

  async function save() {
    setBusy(true); setErr('');
    let url = current?.source === 'upload' ? current.url : null;
    if (file) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `artists/${slug}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('event-images').upload(path, file, { contentType: file.type, cacheControl: '31536000' });
      if (error) { setBusy(false); setErr('Could not upload that photo.'); return; }
      url = supabase.storage.from('event-images').getPublicUrl(path).data.publicUrl;
    }
    if (!url) { setBusy(false); setErr('Choose a photo first.'); return; }
    const row = { slug, photo_url: url, photo_credit: credit.trim() || null, photo_license: null, photo_source_url: null, photo_source: 'upload', updated_at: new Date().toISOString() };
    const { error } = await supabase.from('artist_profiles').upsert(row);
    setBusy(false);
    if (error) { setErr('Could not save. Are you signed in as the Akwaaba admin?'); return; }
    onSaved({ url, credit: row.photo_credit, license: null, sourceUrl: null, source: 'upload' });
  }

  /** Drop the uploaded photo; the free Wikimedia photo (if any) is looked up again on the next visit */
  async function useFree() {
    setBusy(true); setErr('');
    const { error } = await supabase.from('artist_profiles').upsert({ slug, photo_url: null, photo_credit: null, photo_license: null, photo_source_url: null, photo_source: null, checked_at: null, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) { setErr('Could not change it.'); return; }
    onSaved(null);
  }

  return createPortal(
    <div role="dialog" aria-modal aria-label={`Photo for ${name}`} style={{ position: 'fixed', inset: 0, zIndex: 330 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', opacity: shown ? 1 : 0, transition: 'opacity 280ms ease' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, maxWidth: 560, margin: '0 auto', maxHeight: '90svh', overflowY: 'auto',
        background: 'linear-gradient(180deg, #0B2619 0%, #05130C 100%)', borderRadius: '26px 26px 0 0', borderTop: `1px solid ${T.hairlineStrong}`,
        padding: '10px 20px calc(24px + env(safe-area-inset-bottom, 0px))', transform: shown ? 'none' : 'translateY(100%)', transition: `transform 420ms ${EASE.sheet}`,
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 22, fontWeight: 700, color: T.white }}>Photo for {name}</h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ width: 40, height: 40, borderRadius: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: T.white, cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <button type="button" onClick={() => fileRef.current?.click()} style={{ position: 'relative', display: 'block', width: '100%', aspectRatio: '4 / 3', padding: 0, borderRadius: 20, overflow: 'hidden', border: '1px dashed rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview && <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 22%', display: 'block' }} />}
          <span style={{ position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 999, background: 'rgba(3,10,6,0.7)', color: T.white, fontFamily: FONT.sans, fontSize: 14, fontWeight: 600 }}>
            <Camera size={16} /> {preview ? 'Choose another photo' : 'Choose a photo'}
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ''; }} />

        <label htmlFor="ap-credit" style={{ display: 'block', margin: '18px 0 8px', fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: T.text2 }}>Photo credit (optional)</label>
        <input id="ap-credit" value={credit} onChange={(e) => setCredit(e.target.value)} maxLength={80} placeholder="e.g. Press photo / Photographer’s name" style={field} />
        <p style={{ margin: '10px 0 0', fontFamily: FONT.sans, fontSize: 13, lineHeight: 1.5, color: T.text3 }}>
          Only use photos from the artist’s press kit or ones you have permission to use.
        </p>

        {err && <p role="alert" style={{ margin: '14px 0 0', fontFamily: FONT.sans, fontSize: 14, color: T.danger }}>{err}</p>}
        <button type="button" onClick={save} disabled={busy} style={{ ...BTN.primary, width: '100%', marginTop: 20, opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Save photo'}</button>
        {current?.source === 'upload' && (
          <button type="button" onClick={useFree} disabled={busy} style={{ display: 'block', margin: '14px auto 0', padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: T.text2 }}>
            Remove it and use the free Wikimedia photo
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
