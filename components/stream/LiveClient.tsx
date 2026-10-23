'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type Hls from 'hls.js';
import type { GhanaEvent } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { Icon } from '@/components/ui/Icon';
import { BrandGlyph } from '@/components/brand/Wordmark';
import { TicketsSheet } from '@/components/events/EventActions';
import PaystackCheckout from '@/components/payment/PaystackCheckout';
import { BTN } from '@/components/events/CardParts';
import type { CheckoutTier } from '@/lib/events/tiers';
import { extractYoutubeId } from '@/lib/events/rank';
import { splitEventTitle } from '@/lib/events/title';
import { T, FONT } from '@/lib/thiscene';

type Phase =
  | { kind: 'loading' }
  | { kind: 'sign_in' }
  | { kind: 'no_ticket' }
  | { kind: 'not_started' }
  | { kind: 'ended' }
  | { kind: 'other_device' }
  | { kind: 'kicked' }
  | { kind: 'error'; message: string }
  | { kind: 'playing'; state: 'live' | 'replay'; hls: string; expiresAt: number; tier: string; replayUntil: string | null };

interface Msg { id: number; username: string | null; tier_name: string | null; body: string; created_at: string }

function sessionId() {
  try {
    const k = 'akw_stream_session';
    const v = localStorage.getItem(k);
    if (v) return v;
    const n = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(k, n);
    return n;
  } catch { return Math.random().toString(36).slice(2); }
}

/** Ticket-gated live player: Cloudflare Stream over HLS, live chat, data saver, one device at a time. */
export default function LiveClient({ event }: { event: GhanaEvent }) {
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [saver, setSaver] = useState(false);
  const [muted, setMuted] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [chatErr, setChatErr] = useState('');
  const [tickets, setTickets] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutTier[] | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const sid = useRef('');
  const { title } = splitEventTitle(event.title);
  const youtube = event.youtubeLiveUrl ? extractYoutubeId(event.youtubeLiveUrl) : null;

  const token = useCallback(async () => (await supabase.auth.getSession()).data.session?.access_token ?? null, [supabase]);

  const request = useCallback(async (takeover = false) => {
    const t = await token();
    if (!t) { setPhase({ kind: 'sign_in' }); return; }
    try {
      const res = await fetch('/api/stream/watch', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${t}` }, body: JSON.stringify({ slug: event.slug, sessionId: sid.current, takeover }) });
      const j = await res.json().catch(() => ({}));
      if (res.status === 401) return setPhase({ kind: 'sign_in' });
      if (res.status === 402) return setPhase({ kind: 'no_ticket' });
      if (res.status === 409) return setPhase({ kind: 'other_device' });
      if (!res.ok) return setPhase({ kind: 'error', message: j.message || 'Something went wrong.' });
      if (j.state === 'live' || j.state === 'replay') return setPhase({ kind: 'playing', state: j.state, hls: j.hls, expiresAt: j.expiresAt, tier: j.tier, replayUntil: j.replayUntil });
      setPhase({ kind: j.state === 'ended' ? 'ended' : 'not_started' });
    } catch {
      setPhase({ kind: 'error', message: 'Check your connection and try again.' });
    }
  }, [event.slug, token]);

  // Start
  useEffect(() => {
    sid.current = sessionId();
    if (youtube && !event.streamEnabled) return;
    if (authLoading) return;
    if (!user) { setPhase({ kind: 'sign_in' }); return; }
    request();
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Waiting for the show: check again every 20 s
  useEffect(() => {
    if (phase.kind !== 'not_started') return;
    const t = setInterval(() => request(), 20_000);
    return () => clearInterval(t);
  }, [phase.kind, request]);

  // Play (hls.js where needed; Safari plays HLS natively)
  const playing = phase.kind === 'playing' ? phase : null;
  useEffect(() => {
    const el = video.current;
    if (!playing || !el) return;
    let cancelled = false;
    (async () => {
      if (el.canPlayType('application/vnd.apple.mpegurl') && !saver) {
        el.src = playing.hls;
      } else {
        const { default: HlsLib } = await import('hls.js');
        if (cancelled) return;
        if (!HlsLib.isSupported()) { el.src = playing.hls; return; }
        hlsRef.current?.destroy();
        const hls = new HlsLib({ capLevelToPlayerSize: true, lowLatencyMode: true });
        hls.loadSource(playing.hls);
        hls.attachMedia(el);
        hls.on(HlsLib.Events.MANIFEST_PARSED, () => {
          if (saver) {
            // Data saver: cap at the lowest level of 360p or below
            const idx = hls.levels.reduce((best, l, i) => (l.height <= 360 && (best < 0 || l.height > hls.levels[best].height) ? i : best), -1);
            hls.autoLevelCapping = idx >= 0 ? idx : 0;
          }
        });
        hlsRef.current = hls;
      }
      el.play().catch(() => { /* autoplay blocked until a tap */ });
    })();
    return () => { cancelled = true; };
  }, [playing?.hls, saver]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => hlsRef.current?.destroy(), []);

  // Keep the device lock; refresh the link before it expires
  useEffect(() => {
    if (!playing) return;
    const beat = setInterval(async () => {
      const t = await token();
      const r = await fetch('/api/stream/heartbeat', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${t}` }, body: JSON.stringify({ slug: event.slug, sessionId: sid.current }) }).then((x) => x.json()).catch(() => ({}));
      if (r?.kicked) { hlsRef.current?.destroy(); video.current?.pause(); setPhase({ kind: 'kicked' }); }
    }, 30_000);
    const refresh = setTimeout(() => request(), Math.max(60_000, playing.expiresAt - Date.now() - 5 * 60_000));
    return () => { clearInterval(beat); clearTimeout(refresh); };
  }, [playing?.hls]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live chat (Supabase Realtime)
  useEffect(() => {
    let live = true;
    supabase.from('stream_messages').select('id, username, tier_name, body, created_at').eq('event_slug', event.slug).order('created_at', { ascending: false }).limit(40)
      .then(({ data }) => { if (live && data) setMessages((data as Msg[]).reverse()); });
    const ch = supabase
      .channel(`chat:${event.slug}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stream_messages', filter: `event_slug=eq.${event.slug}` }, (p: any) => {
        setMessages((m) => [...m.slice(-60), p.new as Msg]);
      })
      .subscribe();
    return () => { live = false; supabase.removeChannel(ch); };
  }, [event.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send() {
    const body = draft.trim();
    if (!body) return;
    setChatErr('');
    const t = await token();
    if (!t) { window.location.href = '/auth'; return; }
    const r = await fetch('/api/stream/chat', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${t}` }, body: JSON.stringify({ slug: event.slug, body }) });
    if (r.ok) setDraft('');
    else setChatErr((await r.json().catch(() => ({}))).message || 'Couldn’t send.');
  }

  const glassBtn = { height: 36, padding: '0 12px', borderRadius: 18, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.14)', color: T.white, fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' } as const;

  /* ── Screens before playback ── */
  const Screen = ({ heading, text, children }: { heading: string; text: string; children?: React.ReactNode }) => (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 28px', gap: 10, background: 'radial-gradient(80% 50% at 50% 30%, rgba(15,61,42,0.7) 0%, rgba(3,8,6,0) 70%)' }}>
      <BrandGlyph size={40} />
      <h2 style={{ margin: '12px 0 0', fontFamily: FONT.display, fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: T.white }}>{heading}</h2>
      <p style={{ margin: 0, maxWidth: 360, fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.55, color: T.text2 }}>{text}</p>
      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }}>{children}</div>
    </div>
  );

  let overlay: React.ReactNode = null;
  if (youtube && !event.streamEnabled) {
    overlay = null; // free YouTube stream renders below
  } else if (phase.kind === 'loading') {
    overlay = <Screen heading="Getting your stream…" text="One moment." />;
  } else if (phase.kind === 'sign_in') {
    overlay = <Screen heading="Sign in to watch" text="Your stream ticket is linked to your account."><Link href={`/auth?next=/events/${event.slug}/live`} style={BTN.primary}>Sign in</Link></Screen>;
  } else if (phase.kind === 'no_ticket') {
    overlay = <Screen heading="Watch it live" text="Get a stream ticket to watch the whole show in HD, wherever you are."><button type="button" onClick={() => setTickets(true)} style={BTN.primary}>See stream tickets</button></Screen>;
  } else if (phase.kind === 'not_started') {
    overlay = <Screen heading="You’re in. The stream starts soon" text={`It goes live here when the show starts — ${[event.dateLabel, event.time].filter(Boolean).join(' · ')}. Keep this page open; it will start by itself.`} />;
  } else if (phase.kind === 'ended') {
    overlay = <Screen heading="This stream has ended" text="Your ticket didn’t include a replay, or the replay window has closed."><Link href={`/events/${event.slug}`} style={BTN.secondary}>Back to the event</Link></Screen>;
  } else if (phase.kind === 'other_device') {
    overlay = <Screen heading="Playing on another device" text="A stream ticket works on one device at a time."><button type="button" onClick={() => request(true)} style={BTN.primary}>Watch here instead</button></Screen>;
  } else if (phase.kind === 'kicked') {
    overlay = <Screen heading="Moved to another device" text="Your ticket started playing somewhere else."><button type="button" onClick={() => request(true)} style={BTN.primary}>Watch here again</button></Screen>;
  } else if (phase.kind === 'error') {
    overlay = <Screen heading="Couldn’t start the stream" text={phase.message}><button type="button" onClick={() => request()} style={BTN.primary}>Try again</button></Screen>;
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', color: T.white, overflow: 'hidden' }}>
      {/* Video */}
      {youtube && !event.streamEnabled ? (
        <iframe
          title={`${event.title} live stream`}
          src={`https://www.youtube.com/embed/${youtube}?autoplay=1&playsinline=1&rel=0`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          style={{ position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', width: '100%', aspectRatio: '16 / 9', border: 'none' }}
        />
      ) : (
        <video
          ref={video}
          playsInline
          muted={muted}
          controls={false}
          onClick={() => setMuted(false)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#000', display: playing ? 'block' : 'none' }}
        />
      )}
      {playing && <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 55%, rgba(3,8,6,0.85) 100%)' }} />}
      {overlay}

      {/* Top bar */}
      <header style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 'calc(14px + env(safe-area-inset-top, 0px)) 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href={`/events/${event.slug}`} aria-label="Back to the event" style={{ width: 44, height: 44, borderRadius: 22, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', color: T.white }}>
          <Icon name="arrowLeft" size={22} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          {playing && (
            <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 8px', borderRadius: 6, background: playing.state === 'live' ? '#FF4D5E' : 'rgba(255,255,255,0.18)', fontFamily: FONT.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em' }}>
              {playing.state === 'live' ? 'LIVE' : 'REPLAY'}
            </span>
          )}
          <p style={{ margin: '4px 0 0', fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</p>
        </div>
        {playing && (
          <>
            <button type="button" onClick={() => setSaver((s) => !s)} aria-pressed={saver} title="Data saver caps the picture at 360p" style={{ ...glassBtn, ...(saver ? { background: 'rgba(123,227,168,0.18)', border: '1px solid rgba(123,227,168,0.5)', color: T.mintText } : {}) }}>
              {saver ? 'Data saver' : 'Auto HD'}
            </button>
            <button type="button" aria-label="Full screen" onClick={() => video.current?.requestFullscreen?.()} style={{ ...glassBtn, width: 36, padding: 0, justifyContent: 'center' }}>
              <Icon name="feed" size={17} />
            </button>
          </>
        )}
      </header>

      {playing && muted && (
        <button type="button" onClick={() => { setMuted(false); video.current?.play(); }} style={{ ...glassBtn, position: 'absolute', top: 'calc(74px + env(safe-area-inset-top, 0px))', left: 16, height: 40, fontSize: 13.5 }}>
          <Icon name="speakerOff" size={17} /> Tap for sound
        </button>
      )}

      {/* Chat */}
      {(playing || (youtube && !event.streamEnabled)) && (
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {chatOpen && (
            <div aria-live="polite" style={{ maxHeight: '30vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 8, WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 30%)', maskImage: 'linear-gradient(to bottom, transparent 0%, #000 30%)' }}>
              {messages.slice(-12).map((m) => (
                <p key={m.id} style={{ margin: 0, fontFamily: FONT.sans, fontSize: 13.5, lineHeight: 1.4, textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
                  <span style={{ fontWeight: 700, color: T.mintText }}>{m.username ?? 'guest'}</span>{' '}
                  {m.tier_name && /vip|organiser/i.test(m.tier_name) && <span style={{ padding: '1px 6px', borderRadius: 4, background: 'rgba(255,210,122,0.2)', color: '#FFD27A', fontSize: 10.5, fontWeight: 700, marginRight: 4 }}>{/organiser/i.test(m.tier_name) ? 'HOST' : 'VIP'}</span>}
                  {m.body}
                </p>
              ))}
            </div>
          )}
          {playing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT.sans, fontSize: 12.5, color: 'rgba(255,255,255,0.65)' }}>
              <span style={{ height: 24, padding: '0 10px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', background: 'rgba(123,227,168,0.16)', color: T.mintText, fontWeight: 600 }}>{playing.tier}</span>
              {playing.replayUntil ? `Replay until ${new Date(playing.replayUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'Live only'}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ flex: 1, display: 'flex', alignItems: 'center', height: 50, padding: '0 8px 0 16px', borderRadius: 25, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}>
              <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Message</span>
              <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={280} placeholder="Say something…" style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: T.white, fontFamily: FONT.sans, fontSize: 15 }} />
              <button type="submit" aria-label="Send" style={{ width: 36, height: 36, borderRadius: 18, border: 'none', background: T.mint, color: T.onMint, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Icon name="arrowRight" size={17} strokeWidth={2.2} />
              </button>
            </label>
            <button type="button" onClick={() => setChatOpen((o) => !o)} aria-pressed={chatOpen} aria-label={chatOpen ? 'Hide chat' : 'Show chat'} style={{ ...glassBtn, width: 50, height: 50, borderRadius: 25, padding: 0, justifyContent: 'center' }}>
              <Icon name="chat" size={20} />
            </button>
          </form>
          {chatErr && <p role="alert" style={{ margin: 0, fontFamily: FONT.sans, fontSize: 12.5, color: T.danger }}>{chatErr}</p>}
        </div>
      )}

      {tickets && (
        <TicketsSheet
          event={event}
          accent={T.mint}
          initialMode="stream"
          onClose={() => setTickets(false)}
          onBuy={(tiers) => { setTickets(false); setCheckout(tiers); }}
        />
      )}
      {checkout && (
        <PaystackCheckout
          event={event}
          tiers={checkout}
          onClose={() => setCheckout(null)}
          onSuccess={() => { setCheckout(null); setPhase({ kind: 'loading' }); request(); }}
        />
      )}
    </div>
  );
}
