'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { T, FONT } from '@/lib/thiscene';

export interface StreamTier { id?: string; name: string; description: string; price: string; replayDays: string; sold: number }
export interface StreamValue { enabled: boolean; tiers: StreamTier[]; youtubeUrl: string }

export const emptyStream = (): StreamValue => ({
  enabled: false,
  youtubeUrl: '',
  tiers: [
    { name: 'Live stream', description: 'Watch live in HD on one device', price: '40', replayDays: '', sold: 0 },
    { name: 'Stream + replay', description: 'Watch live, then rewatch for 7 days', price: '60', replayDays: '7', sold: 0 },
  ],
});

/** Rows for ticket_tiers. Stream tiers aren't limited by venue size, so quantity is very large. */
export function streamTierRows(eventId: string, v: StreamValue) {
  if (!v.enabled) return [];
  return v.tiers.filter((t) => t.name.trim()).map((t) => ({
    ...(t.id ? { id: t.id } : {}),
    event_id: eventId,
    name: t.name.trim(),
    description: t.description.trim(),
    price: parseFloat(t.price) || 0,
    quantity: 100000,
    sold: t.sold,
    kind: 'stream',
    replay_days: t.replayDays ? parseInt(t.replayDays, 10) : null,
  }));
}

const label = { display: 'block', marginBottom: 6, fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.7)' } as const;
const input = { width: '100%', height: 46, padding: '0 14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: T.white, fontFamily: FONT.sans, fontSize: 14.5, outline: 'none' } as const;

/**
 * Organiser form section: sell livestream tickets (own tiers, price, replay days)
 * and/or link a free YouTube stream.
 */
export default function StreamSettings({ value, onChange }: { value: StreamValue; onChange: (v: StreamValue) => void }) {
  const set = (patch: Partial<StreamValue>) => onChange({ ...value, ...patch });
  const setTier = (i: number, patch: Partial<StreamTier>) => set({ tiers: value.tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) });

  return (
    <section style={{ borderRadius: 20, padding: 20, background: 'radial-gradient(100% 80% at 0% 0%, rgba(255,77,94,0.1) 0%, rgba(255,77,94,0) 60%), rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT.display, fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', color: T.white }}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: 4, background: '#FF4D5E' }} /> Livestream
          </h3>
          <p style={{ margin: '6px 0 0', fontFamily: FONT.sans, fontSize: 13.5, lineHeight: 1.5, color: T.text2 }}>
            Sell tickets to watch online, for people who can’t make it. You set the tiers and prices.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={value.enabled}
          aria-label="Stream this event"
          onClick={() => set({ enabled: !value.enabled })}
          style={{ width: 52, height: 30, borderRadius: 15, padding: 3, border: 'none', cursor: 'pointer', flexShrink: 0, background: value.enabled ? T.mint : 'rgba(255,255,255,0.14)', transition: 'background 200ms ease' }}
        >
          <span style={{ display: 'block', width: 24, height: 24, borderRadius: 12, background: '#fff', transform: value.enabled ? 'translateX(22px)' : 'none', transition: 'transform 200ms ease' }} />
        </button>
      </div>

      {value.enabled && (
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {value.tiers.map((t, i) => (
            <div key={i} style={{ padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>Stream tier {i + 1}</span>
                {t.sold > 0
                  ? <span style={{ fontFamily: FONT.sans, fontSize: 12, color: T.mintText }}>{t.sold} sold</span>
                  : value.tiers.length > 1 && (
                    <button type="button" onClick={() => set({ tiers: value.tiers.filter((_, idx) => idx !== i) })} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontFamily: FONT.sans, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="trash" size={14} /> Remove
                    </button>
                  )}
              </div>
              <label><span style={label}>Name</span><input style={input} value={t.name} onChange={(e) => setTier(i, { name: e.target.value })} placeholder="e.g. Live stream, VIP stream" /></label>
              <label><span style={label}>What’s included</span><input style={input} value={t.description} onChange={(e) => setTier(i, { description: e.target.value })} placeholder="e.g. Backstage camera, chat badge" /></label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                <label><span style={label}>Price (GH₵)</span><input style={input} type="number" min="0" value={t.price} onChange={(e) => setTier(i, { price: e.target.value })} /></label>
                <label>
                  <span style={label}>Replay</span>
                  <select style={{ ...input, appearance: 'none' }} value={t.replayDays} onChange={(e) => setTier(i, { replayDays: e.target.value })}>
                    <option value="">Live only</option>
                    <option value="1">1 day</option>
                    <option value="3">3 days</option>
                    <option value="7">7 days</option>
                    <option value="30">30 days</option>
                  </select>
                </label>
              </div>
            </div>
          ))}
          {value.tiers.length < 4 && (
            <button type="button" onClick={() => set({ tiers: [...value.tiers, { name: '', description: '', price: '', replayDays: '', sold: 0 }] })} style={{ height: 46, borderRadius: 999, border: '1px dashed rgba(255,255,255,0.2)', background: 'none', color: 'rgba(255,255,255,0.75)', fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon name="plus" size={16} /> Add a stream tier
            </button>
          )}
          <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 12.5, lineHeight: 1.5, color: 'rgba(255,255,255,0.5)' }}>
            After you save, you’ll get a stream key to paste into OBS, a hardware encoder or a streaming app.
          </p>
        </div>
      )}

      <label style={{ display: 'block', marginTop: 18 }}>
        <span style={label}>Free stream on YouTube (optional)</span>
        <input style={input} type="url" value={value.youtubeUrl} onChange={(e) => set({ youtubeUrl: e.target.value })} placeholder="https://youtube.com/live/…" />
        <span style={{ display: 'block', marginTop: 6, fontFamily: FONT.sans, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
          Shown free on the event page. YouTube doesn’t allow charging for its streams, so use stream tiers above for paid viewing.
        </span>
      </label>
    </section>
  );
}

/** Organiser panel on the edit page: the stream key and a live indicator. */
export function StreamKeyPanel({ eventId }: { eventId: string }) {
  const [info, setInfo] = useState<{ rtmpsUrl: string; streamKey: string; srtUrl?: string | null; live: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState('');

  async function load() {
    setBusy(true); setErr('');
    const { data } = await createClient().auth.getSession();
    const res = await fetch('/api/stream/setup', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token ?? ''}` }, body: JSON.stringify({ eventId }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(j.message || 'Couldn’t load the stream details.'); return; }
    setInfo(j);
  }
  const copy = async (k: string, v: string) => { try { await navigator.clipboard.writeText(v); setCopied(k); setTimeout(() => setCopied(''), 1500); } catch { /* ignore */ } };

  const row = (k: string, title: string, v: string, secret = false) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderTop: `1px solid ${T.hairline}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{title}</p>
        <p style={{ margin: '3px 0 0', fontFamily: 'ui-monospace, monospace', fontSize: 13, color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{secret && !show ? '••••••••••••••••' : v}</p>
      </div>
      {secret && <button type="button" onClick={() => setShow((s) => !s)} style={{ background: 'none', border: 'none', color: T.mintText, fontFamily: FONT.sans, fontSize: 13, cursor: 'pointer' }}>{show ? 'Hide' : 'Show'}</button>}
      <button type="button" onClick={() => copy(k, v)} style={{ height: 34, padding: '0 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.14)', background: 'none', color: T.white, fontFamily: FONT.sans, fontSize: 13, cursor: 'pointer' }}>{copied === k ? 'Copied' : 'Copy'}</button>
    </div>
  );

  return (
    <section style={{ borderRadius: 20, padding: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h3 style={{ margin: 0, fontFamily: FONT.display, fontSize: 19, fontWeight: 700, color: T.white }}>Go live</h3>
        {info && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 10px', borderRadius: 999, background: info.live ? '#FF4D5E' : 'rgba(255,255,255,0.08)', color: '#fff', fontFamily: FONT.sans, fontSize: 12, fontWeight: 700 }}>
            {info.live ? 'LIVE' : 'Not receiving video'}
          </span>
        )}
      </div>
      {!info ? (
        <>
          <p style={{ margin: '8px 0 14px', fontFamily: FONT.sans, fontSize: 13.5, lineHeight: 1.5, color: T.text2 }}>Get the server address and stream key to paste into OBS or your streaming app. Viewers with a stream ticket see it the moment you start.</p>
          <button type="button" onClick={load} disabled={busy} style={{ height: 46, padding: '0 20px', borderRadius: 999, border: 'none', background: T.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            {busy ? 'Setting up…' : 'Show stream key'}
          </button>
        </>
      ) : (
        <div style={{ marginTop: 12 }}>
          {row('url', 'Server (RTMPS)', info.rtmpsUrl)}
          {row('key', 'Stream key — keep it private', info.streamKey, true)}
          {info.srtUrl && row('srt', 'SRT (optional, better on weak connections)', info.srtUrl, true)}
          <button type="button" onClick={load} style={{ marginTop: 10, background: 'none', border: 'none', padding: 0, color: T.mintText, fontFamily: FONT.sans, fontSize: 13, cursor: 'pointer' }}>Refresh status</button>
        </div>
      )}
      {err && <p role="alert" style={{ margin: '10px 0 0', fontFamily: FONT.sans, fontSize: 13, color: T.danger }}>{err}</p>}
    </section>
  );
}
