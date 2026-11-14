'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Download, Link2, Share2, X } from 'lucide-react';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { T, FONT, GRAD } from '@/lib/thiscene';
import { artistShareText, momentShareText } from '@/lib/shareText';
import { eventColours, toHex } from '@/lib/events/accent';

type Kind = 'event' | 'artist' | 'moment';
/** Bump when the card design changes, so phones and the CDN fetch the new card instead of a cached one */
const CARD_V = '12';
/** Event cards come in three designs. One is picked at random per show each time the site is opened, so the
 *  card made ahead of time and the one in the share sheet match, and feeds don't fill with a single look. */
const designs = new Map<string, number>();
function design(slug: string): number {
  let d = designs.get(slug);
  if (!d) { d = 1 + Math.floor(Math.random() * 3); designs.set(slug, d); }
  return d;
}
/** The flyer's main colour per show (hex without #), for the date on the full-bleed design. '' when unknown. */
const tints = new Map<string, Promise<string>>();
const tintNow = new Map<string, string>();
function tintOf(slug: string, image?: string | null): Promise<string> {
  let p = tints.get(slug);
  if (!p) {
    const timeout = new Promise<string>((r) => setTimeout(() => r(''), 2500));
    const found = image ? eventColours(image).then((c) => (c.accent ? toHex(c.accent).slice(1) : '')).catch(() => '') : Promise.resolve('');
    p = Promise.race([found, timeout]).then((h) => { tintNow.set(slug, h); return h; });
    tints.set(slug, p);
  }
  return p;
}
/** For a moment, slug is the clip id and extra carries the next edition (&next=slug) */
const cardUrl = (kind: Kind, slug: string, u: string | null, size: 'post' | 'story', extra = '') =>
  kind === 'moment'
    ? `/moments/card?id=${encodeURIComponent(slug)}&format=${size}${u ? `&u=${encodeURIComponent(u)}` : ''}${extra}&v=${CARD_V}`
    : `${kind === 'artist' ? `/artists/${slug}` : `/events/${slug}`}/card?format=${size}${u ? `&u=${encodeURIComponent(u)}` : ''}&t=${design(slug)}${design(slug) === 2 && tintNow.get(slug) ? `&c=${tintNow.get(slug)}` : ''}&v=${CARD_V}`;
const pageOf = (kind: Kind, slug: string) => kind === 'moment' ? `/moments?id=${encodeURIComponent(slug)}` : kind === 'artist' ? `/artists/${slug}` : `/events/${slug}`;

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
export function useWarmShareCard(kind: Kind, slug: string, enabled = true, extra = '', image?: string | null) {
  const { profile, loading } = useAuth();
  const u = profile?.username ?? null;
  useEffect(() => {
    if (!enabled || loading) return;
    let live = true;
    const t = setTimeout(() => {
      (kind !== 'moment' ? tintOf(slug, image) : Promise.resolve('')).then(() => { if (live) warm(cardUrl(kind, slug, u, 'post', extra)).catch(() => {}); });
    }, 400);
    return () => { live = false; clearTimeout(t); };
  }, [kind, slug, u, enabled, loading, extra, image]);
}

/**
 * Share a show as a designed card: story-size picture (with your face and "Leo's going" when you're signed in),
 * shared straight to WhatsApp/Instagram or saved, plus a link whose preview carries your name too.
 */
export default function ShareCardSheet({ slug, title, onClose, kind = 'event', intro, image, extra = '', text }: { slug: string; title: string; onClose: () => void; kind?: Kind; intro?: string; image?: string | null; extra?: string; text?: string }) {
  const base = pageOf(kind, slug);
  const { profile } = useAuth();
  const u = profile?.username ?? null;
  // Post size (4:5) shows whole on X, Instagram and WhatsApp; story size fills a phone screen
  const [size, setSize] = useState<'post' | 'story'>('post');
  // Wait for the flyer colour (quick, and cached) so the picture matches the one made ahead of time
  const [tinted, setTinted] = useState(kind === 'moment' || tintNow.has(slug));
  useEffect(() => { if (kind !== 'moment') tintOf(slug, image).then(() => setTinted(true)); }, [kind, slug, image]);
  const card = tinted ? cardUrl(kind, slug, u, size, extra) : '';
  const [preview, setPreview] = useState<string | null>(null);
  const [link, setLink] = useState(base);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  // The words that travel with the picture and the link (what, when, where, tickets)
  const words = text ?? (kind === 'artist' ? artistShareText(title) : kind === 'moment' ? momentShareText(title) : `${title}\nWho’s coming? 👇`);
  const message = `${words}\n${link}`;
  // Show the ready-made picture straight away; also start the other size so switching is instant
  useEffect(() => {
    let live = true, obj: string | null = null;
    setLoaded(false); setPreview(null);
    if (!card) return;
    warm(card).then((b) => { if (!live) return; obj = URL.createObjectURL(b); setPreview(obj); }).catch(() => { if (live) setPreview(card); });
    warm(cardUrl(kind, slug, u, size === 'post' ? 'story' : 'post', extra)).catch(() => {});
    return () => { live = false; if (obj) URL.revokeObjectURL(obj); };
  }, [card, kind, slug, u, size, extra]);
  useEffect(() => { setLink(`${window.location.origin}${base}${u ? `${base.includes('?') ? '&' : '?'}by=${encodeURIComponent(u)}` : ''}`); }, [base, u]);
  useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const file = async () => {
    if (!card) await tintOf(slug, image);
    const blob = await warm(card || cardUrl(kind, slug, u, size, extra));
    return new File([blob], `${kind === 'moment' ? 'tsacoal-moment' : slug}-${size}.png`, { type: 'image/png' });
  };

  const shareCard = async () => {
    setBusy(true);
    try {
      const f = await file();
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      // Picture + message + link in one go (WhatsApp and Instagram keep the text as the caption)
      if (nav.canShare?.({ files: [f], text: message })) await navigator.share({ files: [f], title, text: message });
      else if (navigator.share) await navigator.share({ title, text: words, url: link });
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
    try { await navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* blocked */ }
  };

  const small: React.CSSProperties = { height: 44, padding: '0 18px', borderRadius: 16, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', color: T.white, fontFamily: FONT.sans, fontSize: 14.5, fontWeight: 600 };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={kind === 'artist' ? `Share ${title}` : 'Share this show'} onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(2,6,4,0.78)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, maxHeight: '94svh', overflowY: 'auto', overscrollBehavior: 'contain', margin: '0 auto', padding: '18px 24px calc(22px + env(safe-area-inset-bottom, 0px))', boxSizing: 'border-box', borderRadius: '28px 28px 0 0', background: '#0C1210' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>{intro ?? (kind === 'artist' ? `Share ${title}` : 'Share this show')}</p>
          <button type="button" onClick={onClose} aria-label="Close" style={{ width: 38, height: 38, borderRadius: 13, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)', color: T.white }}><X size={18} /></button>
        </div>

        <div style={{ position: 'relative', width: size === 'story' ? 'min(46vw, 190px)' : 'min(62vw, 270px)', aspectRatio: size === 'story' ? '9 / 16' : '4 / 5', margin: '16px auto 0', borderRadius: 18, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
          {/* While the card is being made: the flyer itself, softly, with a clear "making it" note, never an empty box */}
          {!loaded && (
            <span style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 18 }}>
              {image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(14px) brightness(0.55) saturate(1.2)', transform: 'scale(1.12)' }} />
              )}
              <span className="ak-sk" style={{ position: 'absolute', inset: 0, opacity: 0.55 }} />
              <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10, height: 36, padding: '0 16px', borderRadius: 999, background: 'rgba(5,10,7,0.72)', color: T.white, fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 700 }}>
                <span className="ak-pulse" style={{ width: 8, height: 8, borderRadius: 3, background: T.mint }} /> Making your card…
              </span>
            </span>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview && <img src={preview} alt={`Share card for ${title}`} onLoad={() => setLoaded(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: loaded ? 1 : 0, transition: 'opacity 240ms ease' }} />}
        </div>
        <div role="tablist" aria-label="Picture size" style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
          {([['post', 'Post · X, Instagram'], ['story', 'Story']] as const).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={size === k} onClick={() => setSize(k)}
              style={{ height: 34, padding: '0 14px', borderRadius: 999, border: 'none', cursor: 'pointer', background: size === k ? 'rgba(123,227,168,0.16)' : 'rgba(255,255,255,0.06)', color: size === k ? T.mint : T.text2, fontFamily: FONT.sans, fontSize: 13, fontWeight: 700 }}>{label}</button>
          ))}
        </div>
        {/* The message that goes with it, so people see exactly what's being sent */}
        <p style={{ margin: '14px auto 0', maxWidth: 360, padding: '12px 14px', borderRadius: 16, background: 'linear-gradient(120deg, rgba(123,227,168,0.08), rgba(255,255,255,0.03) 60%)', fontFamily: FONT.sans, fontSize: 13, lineHeight: 1.45, color: T.text2, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
          {words}{'\n'}<span style={{ color: T.mintText }}>{link.replace(/^https?:\/\//, '')}</span>
        </p>
        {u && <p style={{ margin: '8px 0 0', textAlign: 'center', fontFamily: FONT.sans, fontSize: 12.5, color: T.text3 }}>Your name’s on the picture and the link preview.</p>}

        <button type="button" onClick={shareCard} disabled={busy}
          style={{ display: 'flex', width: 'calc(100% - 32px)', maxWidth: 340, height: 50, margin: '16px auto 0', borderRadius: 999, border: 'none', cursor: 'pointer', alignItems: 'center', justifyContent: 'center', gap: 8, background: GRAD.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 15.5, fontWeight: 700, opacity: busy ? 0.7 : 1 }}>
          <Share2 size={17} /> {busy ? 'Getting it ready…' : 'Share to WhatsApp, Instagram…'}
        </button>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 10 }}>
          <button type="button" onClick={save} style={small}><Download size={16} /> Save image</button>
          <button type="button" onClick={copy} style={small}>{copied ? <><Check size={16} /> Copied</> : <><Link2 size={16} /> Copy message</>}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
