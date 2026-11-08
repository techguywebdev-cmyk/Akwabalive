'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { BTN } from '@/components/events/CardParts';
import { T, FONT, EASE, GRAD } from '@/lib/thiscene';

const capBtn = (on: boolean): React.CSSProperties => ({
  position: 'relative', width: 46, height: 44, padding: 0, border: 'none', cursor: 'pointer',
  background: on ? 'rgba(123,227,168,0.14)' : 'transparent', color: on ? T.mintText : T.text,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
});

/** Search | filter icons in one capsule (same as the events feed) */
export function ToolsCapsule({ searchOn, filtersOn, onSearch, onFilter }: { searchOn: boolean; filtersOn: boolean; onSearch: () => void; onFilter: () => void }) {
  return (
    <div role="group" aria-label="Search and filter" style={{ display: 'flex', alignItems: 'center', height: 44, borderRadius: 15, overflow: 'hidden', background: 'rgba(8,10,9,0.5)', border: 'none', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
      <button type="button" aria-label="Search" aria-pressed={searchOn} onClick={onSearch} style={capBtn(searchOn)}><Icon name="search" size={21} strokeWidth={1.9} /></button>
      <span aria-hidden style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.14)' }} />
      <button type="button" aria-label={filtersOn ? 'Filters (on)' : 'Filters'} onClick={onFilter} style={capBtn(filtersOn)}>
        <Icon name="sliders" size={21} strokeWidth={1.9} />
        {filtersOn && <span aria-hidden style={{ position: 'absolute', top: 9, right: 10, width: 7, height: 7, borderRadius: 2, background: T.mint, boxShadow: '0 0 0 2px rgba(8,10,9,0.9)' }} />}
      </button>
    </div>
  );
}

/** Search field that drops down under the header */
export function SearchDrop({ open, value, onChange, onClose, placeholder }: { open: boolean; value: string; onChange: (v: string) => void; onClose: () => void; placeholder: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) setTimeout(() => ref.current?.focus(), 60); }, [open]);
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', zIndex: 195, top: 'calc(74px + env(safe-area-inset-top, 0px))', left: 16, right: 16, maxWidth: 720, margin: '0 auto' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, height: 50, padding: '0 8px 0 16px', borderRadius: 25, background: 'rgba(12,15,13,0.9)', border: 'none', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', color: T.text2, boxShadow: '0 12px 30px rgba(0,0,0,0.4)' }}>
        <Icon name="search" size={19} />
        <input ref={ref} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} type="text" enterKeyHint="search"
          style={{ flex: 1, minWidth: 0, height: '100%', border: 'none', outline: 'none', background: 'transparent', color: T.white, fontFamily: FONT.sans, fontSize: 16 }} />
        <button type="button" onClick={() => { onChange(''); onClose(); }} aria-label="Close search" style={{ width: 36, height: 36, borderRadius: 18, border: 'none', background: 'rgba(255,255,255,0.08)', color: T.white, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={17} /></button>
      </label>
    </div>
  );
}

export type ChoiceGroup<V extends string> = { label: string; value: V; options: { value: V; label: string }[]; onChange: (v: V) => void };

/** Bottom sheet of choice chips (filters and sort) */
export function ChoiceSheet({ title, groups, onClose, onReset, resultLabel }: {
  title: string; groups: ChoiceGroup<any>[]; onClose: () => void; onReset: () => void; resultLabel: string;
}) {
  const [shown, setShown] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(raf); document.body.style.overflow = old; window.removeEventListener('keydown', onKey); };
  }, []);
  return createPortal(
    <div role="dialog" aria-modal aria-label={title} style={{ position: 'fixed', inset: 0, zIndex: 330 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', opacity: shown ? 1 : 0, transition: 'opacity 280ms ease' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, maxWidth: 560, margin: '0 auto', maxHeight: '88svh', overflowY: 'auto',
        background: 'linear-gradient(180deg, #121614 0%, #0A0C0B 100%)', borderRadius: '26px 26px 0 0', borderTop: `1px solid ${T.hairlineStrong}`,
        padding: '10px 20px calc(22px + env(safe-area-inset-bottom, 0px))', transform: shown ? 'none' : 'translateY(100%)', transition: `transform 420ms ${EASE.sheet}`,
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 22, fontWeight: 800, color: T.white }}>{title}</h2>
          <button type="button" onClick={onReset} style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: T.mintText }}>Reset</button>
        </div>
        {groups.map((g) => (
          <div key={g.label} style={{ marginTop: 20 }}>
            <p style={{ margin: '0 0 10px', fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: T.text3 }}>{g.label}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {g.options.map((o) => {
                const on = g.value === o.value;
                return (
                  <button key={o.value} type="button" aria-pressed={on} onClick={() => g.onChange(o.value)} style={{
                    height: 40, padding: '0 16px', borderRadius: 999, cursor: 'pointer', fontFamily: FONT.sans, fontSize: 14, fontWeight: 600,
                    ...(on ? { background: GRAD.mint, color: T.onMint, border: 'none'} : { background: 'rgba(255,255,255,0.06)', color: T.text, border: 'none' }),
                  }}>{o.label}</button>
                );
              })}
            </div>
          </div>
        ))}
        <button type="button" onClick={onClose} style={{ ...BTN.primary, width: '100%', marginTop: 26 }}>{resultLabel}</button>
      </div>
    </div>,
    document.body,
  );
}
