'use client';

import { useMemo, useState } from 'react';
import { Download, Lock, Share2 } from 'lucide-react';
import { sheetMonths, shortName, WEEKDAYS, type SheetEvent } from '@/lib/calendarSheet';
import { hiRes } from '@/lib/events/image';
import { T, FONT, GRAD, BTN } from '@/lib/thiscene';

const gradText: React.CSSProperties = { background: GRAD.text, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' };

/**
 * Their calendar as one designed sheet: every month with a show, the flyer and name on each date, the calendar's
 * name on top. The same sheet comes out as an image to share (story size) from /c/[slug]/sheet.
 */
export default function CalendarSheet({ events, title, owner, slug, isPublic, onPick }: {
  events: SheetEvent[]; title: string; owner: string; slug: string; isPublic: boolean; onPick?: (iso: string) => void;
}) {
  const months = useMemo(() => sheetMonths(events), [events]);
  const [busy, setBusy] = useState<'' | 'share' | 'save'>('');
  const [note, setNote] = useState('');
  const today = new Date().toISOString().slice(0, 10);

  const getImage = async () => {
    const r = await fetch(`/c/${slug}/sheet?v=${events.length}-${Date.now() >> 16}`);
    if (!r.ok) throw new Error('image');
    return new File([await r.blob()], `${slug}.png`, { type: 'image/png' });
  };
  const save = (f: File) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(f); a.download = f.name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  const share = async () => {
    setBusy('share'); setNote('');
    try {
      const f = await getImage();
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [f] })) await navigator.share({ files: [f], title, text: `${title}: my line-up on Akwaaba ${window.location.origin}/c/${slug}` });
      else { save(f); setNote('Saved to your downloads'); }
    } catch (e) { if ((e as Error)?.name !== 'AbortError') setNote('Couldn’t make the image. Try again.'); }
    setBusy('');
  };
  const download = async () => {
    setBusy('save'); setNote('');
    try { save(await getImage()); setNote('Saved to your downloads'); } catch { setNote('Couldn’t make the image. Try again.'); }
    setBusy('');
  };

  return (
    <div>
      {/* The sheet */}
      <div style={{ position: 'relative', borderRadius: 26, overflow: 'hidden', padding: '26px 18px 22px',
        background: 'radial-gradient(80% 30% at 20% 0%, rgba(70,220,150,0.26) 0%, rgba(70,220,150,0) 100%), radial-gradient(60% 25% at 90% 8%, rgba(40,190,200,0.14) 0%, rgba(40,190,200,0) 100%), linear-gradient(180deg, #0C1611 0%, #070B09 70%, #060807 100%)',
        boxShadow: '0 30px 70px -30px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
        <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.mintText }}>{owner}’s calendar</p>
        <p style={{ margin: '8px 0 0', fontFamily: FONT.display, fontSize: 'clamp(30px, 8.5vw, 44px)', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.045em', paddingBottom: '0.06em', ...gradText }}>{title}</p>
        <p style={{ margin: '6px 0 0', fontFamily: FONT.sans, fontSize: 13.5, color: T.text3 }}>{events.length} {events.length === 1 ? 'show' : 'shows'}</p>

        {!months.length && <p style={{ margin: '24px 0 4px', fontFamily: FONT.sans, fontSize: 14.5, color: T.text2 }}>Add shows and your sheet fills in.</p>}

        {months.map((mo) => (
          <section key={`${mo.y}-${mo.m}`} aria-label={`${mo.name} ${mo.y}`} style={{ marginTop: 28 }}>
            <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ fontFamily: FONT.display, fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: T.white }}>{mo.name}{mo.y !== new Date().getFullYear() ? ` ’${String(mo.y).slice(2)}` : ''}</span>
              <span style={{ height: 20, padding: '0 7px', borderRadius: 7, display: 'inline-flex', alignItems: 'center', background: 'rgba(123,227,168,0.16)', color: T.mintText, fontFamily: FONT.sans, fontSize: 11.5, fontWeight: 800 }}>{mo.count}</span>
            </p>
            <div aria-hidden style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 5, marginTop: 10 }}>
              {WEEKDAYS.map((d, i) => <span key={i} style={{ textAlign: 'center', fontFamily: FONT.sans, fontSize: 10.5, fontWeight: 700, color: i >= 5 ? 'rgba(168,240,198,0.7)' : 'rgba(255,255,255,0.3)' }}>{d}</span>)}
            </div>
            {mo.weeks.map((w, wi) => (
              <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 5, marginTop: 5 }}>
                {w.cells.map((c, ci) => {
                  if (!c) return <span key={ci} />;
                  const ev = c.events[0];
                  const past = c.iso < today;
                  if (!ev) {
                    return (
                      <span key={ci} style={{ display: 'flex', justifyContent: 'center', alignItems: w.full ? 'flex-start' : 'center', paddingTop: w.full ? 5 : 0, height: w.full ? undefined : 24, aspectRatio: w.full ? '3 / 4.6' : undefined, borderRadius: 9, background: w.full ? 'rgba(255,255,255,0.035)' : 'transparent', fontFamily: FONT.display, fontSize: 11, fontWeight: 600, color: c.iso === today ? T.mintText : 'rgba(255,255,255,0.3)' }}>{c.day}</span>
                    );
                  }
                  return (
                    <button key={ci} type="button" onClick={() => onPick?.(c.iso)} aria-label={`${c.day} ${mo.name}: ${c.events.map((e) => e.title).join(', ')}`}
                      style={{ padding: 0, border: 'none', background: 'none', cursor: onPick ? 'pointer' : 'default', textAlign: 'left', minWidth: 0, opacity: past ? 0.5 : 1 }}>
                      <span style={{ position: 'relative', display: 'block', aspectRatio: '4 / 5', borderRadius: 9, overflow: 'hidden', background: GRAD.mint, boxShadow: '0 6px 14px -6px rgba(0,0,0,0.8)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {ev.image_url && <img src={hiRes(ev.image_url, 200) ?? ev.image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                        <span style={{ position: 'absolute', top: 2, left: 2, padding: '1px 4px', borderRadius: 5, background: 'rgba(5,10,8,0.78)', color: T.white, fontFamily: FONT.display, fontSize: 9.5, fontWeight: 800 }}>{c.day}</span>
                        {c.events.length > 1 && <span style={{ position: 'absolute', right: 2, bottom: 2, padding: '0 4px', borderRadius: 5, background: T.mint, color: T.onMint, fontFamily: FONT.sans, fontSize: 9, fontWeight: 800 }}>+{c.events.length - 1}</span>}
                      </span>
                      <span style={{ display: 'block', marginTop: 4, fontFamily: FONT.sans, fontSize: 9.5, fontWeight: 700, lineHeight: 1.15, color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortName(ev.title)}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </section>
        ))}

        <p style={{ margin: '26px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: FONT.display, fontSize: 14, fontWeight: 800, color: T.white }}>
          <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden><rect x="1" y="1" width="22" height="22" rx="7" fill="#7BE3A8" /><path d="M12 7v11" fill="none" stroke="#03130B" strokeWidth="2.4" strokeLinecap="butt" /><path d="M6.5 7h11" fill="none" stroke="#03130B" strokeWidth="2.4" strokeLinecap="butt" /></svg>
          akwaaba
        </p>
      </div>

      {/* Share it */}
      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {isPublic ? (
          <>
            <button type="button" onClick={share} disabled={!!busy || !months.length} style={{ ...BTN.primary, height: 48, padding: '0 20px', borderRadius: 999, cursor: 'pointer', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8, opacity: busy || !months.length ? 0.6 : 1 }}>
              <Share2 size={17} />{busy === 'share' ? 'Making it…' : 'Share image'}
            </button>
            <button type="button" onClick={download} disabled={!!busy || !months.length} style={{ height: 48, padding: '0 16px', borderRadius: 15, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.07)', color: T.white, fontFamily: FONT.sans, fontSize: 14, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 7, opacity: busy || !months.length ? 0.6 : 1 }}>
              <Download size={16} />{busy === 'save' ? 'Saving…' : 'Save'}
            </button>
          </>
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: FONT.sans, fontSize: 13.5, color: T.text3 }}><Lock size={14} />Make the calendar public to share it as an image</span>
        )}
        {note && <span style={{ fontFamily: FONT.sans, fontSize: 13, color: T.mintText }}>{note}</span>}
      </div>
    </div>
  );
}
