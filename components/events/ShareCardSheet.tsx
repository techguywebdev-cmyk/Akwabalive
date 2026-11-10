'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Download, Link2, Share2, X } from 'lucide-react';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { T, FONT, GRAD } from '@/lib/thiscene';

type Kind = 'event' | 'artist';
const cardUrl = (kind: Kind, slug: string, u: string | null, size: 'post' | 'story') =>
  `${kind === 'artist' ? `/artists/${slug}` : `/events/${slug}`}/card?format=${size}${u ? `&u=${encodeURIComponent(u)}` : ''}`;

/** Cards fetched ahead of time, so the sheet opens with the picture ready and sharing is instant */
const blobs = new Map<string, Promise<Blob>>();
function warm(url: string): Promise<Blob> {
  let b = blobs.get(url);
  if (!b) {
    b = fetch(url).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.blob(); });
    b.catch(() => blobs.delete(url));
    blobs.set(url, b);
  }
  return b;
}

/** Make the post-size card in the background while someone looks at a show or artist */
export function useWarmShareCard(kind: Kind, slug: string, enabled = true) {
  const { profile, loading } = useAuth();
  const u = profile?.username ?? null;
  useEffect(() => {
    if (!enabled || loading) return;
    const t = setTimeout(() => { warm(cardUrl(kind, slug, u, 'post')).catch(() => {}); }, 1500);
    return () => clearTimeout(t);
  }, [kind, slug, u, enabled, loading]);
}

/**
 * Share a show as a designed card: story-size picture (with your face and "Leo's going" when you're signed in),
 * shared straight to WhatsApp/Instagram or saved, plus a link whose preview carries your name too.
 */
export default function ShareCardSheet({ slug, title, onClose, kind = 'event' }: { slug: string; title: string; onClose: () => void; kind?: 'event' | 'artist' }) {
  const base = kind === 'artist' ? `/artists/${slug}` : `/events/${slug}`;
  const { profile } = useAuth();
  const u = profile?.username ?? null;
  // Post size (4:5) shows whole on X, Instagram and WhatsApp; story size fills a phone screen
  const [size, setSize] = useState<'post' | 'story'>('post');
  const card = cardUrl(kind, slug, u, size);
  const [preview, setPreview] = useState<string | null>(null);
  const [link, setLink] = useState(base);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  // Show the ready-made picture straight away; also start the other size so switching is instant
  useEffect(() => {
    let live = true, obj: string | null = null;
    setLoaded(false); setPreview(null);
    warm(card).then((b) => { if (!live) return; obj = URL.createObjectURL(b); setPreview(obj); }).catch(() => { if (live) setPreview(card); });
    warm(cardUrl(kind, slug, u, size === 'post' ? 'story' : 'post')).catch(() => {});
    return () => { live = false; if (obj) URL.revokeObjectURL(obj); };
  }, [card, kind, slug, u, size]);
  useEffect(() => { setLink(`${window.location.origin}${base}${u ? `?by=${encodeURIComponent(u)}` : ''}`); }, [base, u]);
  useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const file = async () => {
    const blob = await warm(card);
    return new File([blob], `${slug}-${size}.png`, { type: 'image/png' });
  };

  const shareCard = async () => {
    setBusy(true);
    try {
      const f = await file();
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [f] })) await navigator.share({ files: [f], title, text: `${title} ${link}` });
      else if (navigator.share) await navigator.share({ title, url: link });
      else await save();
    } catch { /* cancelled */ } finally { setBusy(false); }
  };
  const save = async () => {
    const f = await file();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(f); a.download = f.name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* blocked */ }
  };

  const small: React.CSSProperties = { height: 44, padding: '0 18px', borderRadius: 16, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', color: T.white, fontFamily: FONT.sans, fontSize: 14.5, fontWeight: 600 };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={kind === 'artist' ? `Share ${title}` : 'Share this show'} onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(2,6,4,0.78)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, margin: '0 auto', padding: '18px 24px calc(22px + env(safe-area-inset-bottom, 0px))', boxSizing: 'border-box', borderRadius: '28px 28px 0 0', background: '#0C1210' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>{kind === 'artist' ? `Share ${title}` : 'Share this show'}</p>
          <button type="button" onClick={onClose} aria-label="Close" style={{ width: 38, height: 38, borderRadius: 13, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)', color: T.white }}><X size={18} /></button>
        </div>

        <div style={{ position: 'relative', width: size === 'story' ? 'min(56vw, 230px)' : 'min(76vw, 330px)', aspectRatio: size === 'story' ? '9 / 16' : '4 / 5', margin: '16px auto 0', borderRadius: 18, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
          {!loaded && <span className="ak-sk" style={{ position: 'absolute', inset: 0 }} />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview && <img src={preview} alt={`Share card for ${title}`} onLoad={() => setLoaded(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: loaded ? 1 : 0, transition: 'opacity 240ms ease' }} />}
        </div>
        <div role="tablist" aria-label="Picture size" style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
          {([['post', 'Post · X, Instagram'], ['story', 'Story']] as const).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={size === k} onClick={() => setSize(k)}
              style={{ height: 34, padding: '0 14px', borderRadius: 999, border: 'none', cursor: 'pointer', background: size === k ? 'rgba(123,227,168,0.16)' : 'rgba(255,255,255,0.06)', color: size === k ? T.mint : T.text2, fontFamily: FONT.sans, fontSize: 13, fontWeight: 700 }}>{label}</button>
          ))}
        </div>
        {u && <p style={{ margin: '12px 0 0', textAlign: 'center', fontFamily: FONT.sans, fontSize: 13, color: T.text3 }}>Your name’s on it, and on the link preview.</p>}

        <button type="button" onClick={shareCard} disabled={busy}
          style={{ display: 'flex', width: 'calc(100% - 32px)', maxWidth: 340, height: 50, margin: '16px auto 0', borderRadius: 999, border: 'none', cursor: 'pointer', alignItems: 'center', justifyContent: 'center', gap: 8, background: GRAD.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 15.5, fontWeight: 700, opacity: busy ? 0.7 : 1 }}>
          <Share2 size={17} /> {busy ? 'Getting it ready…' : 'Share to WhatsApp, Instagram…'}
        </button>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 10 }}>
          <button type="button" onClick={save} style={small}><Download size={16} /> Save image</button>
          <button type="button" onClick={copy} style={small}>{copied ? <><Check size={16} /> Copied</> : <><Link2 size={16} /> Copy link</>}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
