'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Plus, Trash2, Upload, Video, X } from 'lucide-react';
import { progressLabel, uploadClip, uploadsOn, checkFile, withTrim, MAX_SECONDS, type Trim, type Frame } from '@/lib/videoUpload';
import TrimSheet from '@/components/media/TrimSheet';
import TrimmedVideo from '@/components/media/TrimmedVideo';
import Nav from '@/components/layout/Nav';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { BTN } from '@/components/events/CardParts';
import { card } from '@/components/organizer/ui';
import { parseDay, shortDay } from '@/lib/dates';
import { T, FONT, GROUND } from '@/lib/thiscene';

type PastEvent = { id: string; title: string; date: string; slug: string };
type Mine = { id: string; title: string; event_name: string; year: number | null; youtube_id: string; source: string | null; thumbnail_url?: string | null };

const field: React.CSSProperties = {
  display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 8, height: 48, padding: '0 14px', borderRadius: 14,
  background: 'rgba(255,255,255,0.06)', border: 'none', color: T.white, fontFamily: FONT.sans, fontSize: 15, outline: 'none',
};
const label: React.CSSProperties = { display: 'block', marginTop: 18, fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: T.text2 };
const thumb = (m: Mine) => (m.source === 'x' ? null : m.source === 'upload' ? m.thumbnail_url ?? null : `https://i.ytimg.com/vi/${m.youtube_id}/mqdefault.jpg`);

/**
 * Organisers post moments from their shows: a YouTube or X link, tied to one of their past events
 * (so it carries the date, venue, rating and the next edition's tickets) or another show they put on.
 */
export default function PostMomentPage() {
  const { user, loading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [events, setEvents] = useState<PastEvent[]>([]);
  const [mine, setMine] = useState<Mine[]>([]);
  const [eventId, setEventId] = useState<string>('other');
  const [form, setForm] = useState({ url: '', event_name: '', year: String(new Date().getFullYear()), title: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string; id?: string } | null>(null);
  // An uploaded clip, for when there's no YouTube or X link
  const [clip, setClip] = useState<{ name: string; size?: number; progress: number; videoUrl?: string; posterUrl?: string | null; preview?: string; error?: string } | null>(null);
  const pick = useRef<HTMLInputElement>(null);

  // Picking a video opens the trim screen first; the upload starts once they've chosen the part
  const [trimming, setTrimming] = useState<File | null>(null);
  const [pickErr, setPickErr] = useState('');
  function chooseClip(file: File | undefined) {
    if (pick.current) pick.current.value = '';
    if (!file) return;
    const bad = checkFile(file);
    setPickErr(bad ?? '');
    if (!bad) setTrimming(file);
  }
  async function startUpload(file: File, trim: Trim | null, key: string | null, frame: Frame | null) {
    setTrimming(null);
    const preview = withTrim(URL.createObjectURL(file), trim);
    setClip({ name: file.name, size: file.size, progress: 0, preview });
    try {
      const r = await uploadClip(supabase, file, 'moment', (p) => setClip((c) => (c ? { ...c, progress: p } : c)), trim, key, frame);
      setClip((c) => (c ? { ...c, progress: 1, videoUrl: r.videoUrl, posterUrl: r.posterUrl } : c));
    } catch (e) {
      setClip((c) => (c ? { ...c, error: (e as Error).message } : c));
    }
  }
  const dropClip = () => { if (clip?.preview) URL.revokeObjectURL(clip.preview.split('#')[0]); setClip(null); if (pick.current) pick.current.value = ''; };

  const token = useCallback(async () => (await supabase.auth.getSession()).data.session?.access_token, [supabase]);

  const load = useCallback(async () => {
    const res = await fetch('/api/organizer/moments', { headers: { Authorization: `Bearer ${await token()}` } });
    if (res.status === 403) { setAllowed(false); return; }
    setAllowed(true);
    const j = await res.json().catch(() => ({}));
    setMine(j.moments ?? []);
  }, [token]);

  useEffect(() => {
    if (loading) return;
    if (!user) { setAllowed(false); return; }
    load();
    const today = new Date().toISOString().slice(0, 10);
    supabase.from('events').select('id, title, date, slug').eq('organizer_id', user.id).eq('status', 'published').lte('date', today)
      .order('date', { ascending: false }).limit(40)
      .then(({ data }) => { const list = (data ?? []) as PastEvent[]; setEvents(list); if (list.length) setEventId(list[0].id); });
  }, [loading, user, supabase, load]);

  async function post() {
    setBusy(true); setNote(null);
    const res = await fetch('/api/organizer/moments', {
      method: 'POST', headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, event_id: eventId === 'other' ? null : eventId, ...(clip?.videoUrl ? { url: '', video_url: clip.videoUrl, poster_url: clip.posterUrl ?? null } : {}) }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setNote({ ok: false, text: j.error ?? 'Couldn’t post it. Try again.' }); return; }
    setNote({ ok: true, text: 'Posted — it’s live in Moments.', id: j.id });
    setForm((f) => ({ ...f, url: '', title: '', description: '' }));
    dropClip();
    load();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/organizer/moments?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${await token()}` } });
    if (res.ok) setMine((m) => m.filter((x) => x.id !== id));
  }

  if (allowed === false) {
    return (
      <div style={{ minHeight: '100svh', background: GROUND }}>
        <Nav back="/organizer/dashboard" />
        <main style={{ maxWidth: 520, margin: '0 auto', padding: 'calc(110px + env(safe-area-inset-top, 0px)) 24px 80px', textAlign: 'center' }}>
          <span style={{ width: 64, height: 64, borderRadius: 32, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.07)', color: T.mintText }}><Video size={28} /></span>
          <h1 style={{ margin: '18px 0 0', fontFamily: FONT.display, fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: T.white }}>Moments are for organisers</h1>
          <p style={{ margin: '8px 0 0', fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.5, color: T.text2 }}>
            {user ? 'Once you have an event on TsaCoal, you can post the best moments from your shows here.' : 'Sign in with your organiser account to post moments from your shows.'}
          </p>
          <Link href={user ? '/organizer/events/new' : '/auth?next=/organizer/moments/post'} style={{ ...BTN.primary, marginTop: 22, height: 48, padding: '0 22px', display: 'inline-flex', textDecoration: 'none' }}>
            <Plus size={17} /> {user ? 'Create an event' : 'Sign in'}
          </Link>
        </main>
      </div>
    );
  }

  const other = eventId === 'other';
  const uploading = !!clip && !clip.videoUrl && !clip.error;
  const ready = (clip?.videoUrl || (!clip && form.url.trim())) && (!other || form.event_name.trim());

  return (
    <div style={{ minHeight: '100svh', background: GROUND }}>
      <Nav back="/organizer/dashboard" />
      <main style={{ maxWidth: 560, margin: '0 auto', padding: 'calc(88px + env(safe-area-inset-top, 0px)) 20px 120px' }}>
        <h1 style={{ margin: 0, fontFamily: FONT.display, fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: T.white }}>Post a moment</h1>
        <p style={{ margin: '6px 0 0', fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.5, color: T.text2 }}>
          Share the best of your show. It goes live in Moments as “From the organiser” and sells your next edition.
        </p>

        <section style={{ ...card, marginTop: 22, padding: 18 }}>
          <label style={{ ...label, marginTop: 0 }}>Which show?
            <select value={eventId} onChange={(e) => setEventId(e.target.value)} style={{ ...field, appearance: 'none' }}>
              {events.map((e) => { const d = parseDay(e.date); return <option key={e.id} value={e.id}>{e.title}{d ? ` · ${shortDay(d)} ${d.getFullYear()}` : ''}</option>; })}
              <option value="other">Another show I put on</option>
            </select>
          </label>
          {other && (
            <div style={{ display: 'flex', gap: 10 }}>
              <label style={{ ...label, flex: 1 }}>Show name
                <input value={form.event_name} onChange={(e) => setForm((f) => ({ ...f, event_name: e.target.value }))} placeholder="e.g. Rapperholic" style={field} />
              </label>
              <label style={{ ...label, width: 100 }}>Year
                <input value={form.year} inputMode="numeric" onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} style={field} />
              </label>
            </div>
          )}
          {!clip && (
            <label style={label}>Video link
              <input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="YouTube or X link" inputMode="url" style={field} />
            </label>
          )}
          {/* No link? Upload the clip itself */}
          <input ref={pick} type="file" accept="video/*" hidden onChange={(e) => chooseClip(e.target.files?.[0])} />
          {trimming && <TrimSheet file={trimming} kind="moment" onCancel={() => setTrimming(null)} onDone={(t, k, f) => startUpload(trimming, t, k, f)} />}
          {pickErr && !clip && <p style={{ margin: '8px 0 0', fontFamily: FONT.sans, fontSize: 13, color: '#FCA5A5' }}>{pickErr}</p>}
          {!clip ? (
            uploadsOn && !form.url.trim() && (
              <button type="button" onClick={() => pick.current?.click()} style={{ marginTop: 10, width: '100%', height: 48, borderRadius: 14, border: '1px dashed rgba(255,255,255,0.18)', background: 'transparent', color: T.text, fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Upload size={16} /> No link? Upload a clip <span style={{ color: T.text3, fontWeight: 500 }}>(up to {MAX_SECONDS}s)</span>
              </button>
            )
          ) : (
            <div style={{ marginTop: 18 }}>
              <span style={{ ...label, marginTop: 0 }}>Your clip</span>
              <div style={{ position: 'relative', marginTop: 8, borderRadius: 14, overflow: 'hidden', background: '#000' }}>
                {(clip.videoUrl || clip.preview) && <TrimmedVideo src={clip.videoUrl ?? clip.preview!} poster={clip.posterUrl ?? undefined} muted playsInline controls={!!clip.videoUrl} style={{ display: 'block', width: '100%', maxHeight: 320, objectFit: 'contain' }} />}
                <button type="button" aria-label="Remove clip" onClick={dropClip} style={{ position: 'absolute', top: 8, right: 8, width: 34, height: 34, borderRadius: 17, border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.6)', color: T.white, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
                {uploading && (
                  <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, background: 'rgba(255,255,255,0.15)' }}>
                    <span style={{ display: 'block', height: '100%', width: `${Math.round(clip.progress * 100)}%`, background: T.mint, transition: 'width 200ms linear' }} />
                  </span>
                )}
              </div>
              <p style={{ margin: '8px 0 0', fontFamily: FONT.sans, fontSize: 13, color: clip.error ? '#FCA5A5' : clip.videoUrl ? T.mintText : T.text3 }}>
                {clip.error ?? (clip.videoUrl ? 'Ready' : clip.progress >= 1 ? 'Preparing your clip… this can take a minute' : progressLabel(clip.progress, clip.size ?? 0))}
              </p>
            </div>
          )}
          <label style={label}>Title <span style={{ color: T.text3, fontWeight: 500 }}>(optional)</span>
            <input value={form.title} maxLength={140} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. The opening — 40,000 lights up" style={field} />
          </label>
          <label style={label}>About the night <span style={{ color: T.text3, fontWeight: 500 }}>(optional)</span>
            <textarea value={form.description} maxLength={300} rows={3} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Who performed, what happened, how it felt" style={{ ...field, height: 'auto', padding: '12px 14px', resize: 'vertical', lineHeight: 1.45 }} />
          </label>
          <button type="button" onClick={post} disabled={!ready || busy || uploading} style={{ ...BTN.primary, width: '100%', marginTop: 20, height: 50, opacity: ready ? 1 : 0.5 }}>
            {busy ? 'Posting…' : 'Post to Moments'}
          </button>
          {note && (
            <p style={{ margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT.sans, fontSize: 14, color: note.ok ? T.mintText : '#FCA5A5' }}>
              {note.ok && <Check size={16} />}{note.text}
              {note.id && <Link href={`/moments?id=${note.id}`} style={{ marginLeft: 6, color: T.white, fontWeight: 600 }}>See it</Link>}
            </p>
          )}
        </section>

        {mine.length > 0 && (
          <section style={{ marginTop: 30 }}>
            <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: T.white }}>Your moments</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              {mine.map((m) => (
                <div key={m.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, padding: 10 }}>
                  <Link href={`/moments?id=${m.id}`} style={{ position: 'relative', width: 96, aspectRatio: '16 / 9', borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: '#0b0b0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.white, fontSize: 18, fontWeight: 800, textDecoration: 'none' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {thumb(m) ? <img src={thumb(m)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '𝕏'}
                  </Link>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 14, fontWeight: 700, color: T.white, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</span>
                    <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 13, color: T.text3 }}>{m.event_name}{m.year ? ` · ${m.year}` : ''}</span>
                  </span>
                  <button type="button" aria-label="Take down" onClick={() => remove(m.id)} style={{ width: 40, height: 40, borderRadius: 20, flexShrink: 0, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: T.text2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
