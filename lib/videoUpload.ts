'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

/** Uploads show only once video storage is set up (its public address is set in Vercel) */
export const uploadsOn = !!process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
/** Biggest file we take (a longer video is fine: only the trimmed part plays) */
export const MAX_MB = 200;
/** Longest part that plays */
export const MAX_SECONDS = 60;
const TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp'];

export type Trim = { start: number; end: number };
/** How an upright video fills the wide frame: whole with blurred sides, or a wide slice (y: 0 top … 1 bottom) */
export type Frame = { mode: 'fit' | 'crop'; y: number };

/** The part of a clip that plays, written on its link: …/clip.mp4#t=12.5,70 (browsers understand this) */
export const withTrim = (url: string, t?: Trim | null) => (t ? `${url.split('#')[0]}#t=${+t.start.toFixed(2)},${+t.end.toFixed(2)}` : url.split('#')[0]);
export function readTrim(url?: string | null): Trim | null {
  const m = url?.match(/#t=([\d.]+)(?:,([\d.]+))?/);
  if (!m) return null;
  const start = Number(m[1]) || 0, end = m[2] ? Number(m[2]) : Infinity;
  return end > start ? { start, end } : null;
}

/** Why a video couldn't be read, in words a person can act on */
export function unreadable(code?: number): string {
  return code === 4
    ? 'This browser can’t play that video’s format. Phones often record in HEVC. Turn off “High efficiency video” in your camera settings, or save the video from WhatsApp, then try again.'
    : 'That video couldn’t be opened. Try another one, or save it from WhatsApp first.';
}

/**
 * Opens a video in the browser and reads its length. The element is put on the page (hidden):
 * some phones won't load a video that isn't.
 */
export function openVideo(file: File): Promise<{ seconds: number; video: HTMLVideoElement; url: string; done: () => void }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('playsinline', '');
    Object.assign(v.style, { position: 'fixed', left: '-9999px', top: '0', width: '2px', height: '2px', opacity: '0', pointerEvents: 'none' });
    document.body.appendChild(v);
    const done = () => { v.remove(); URL.revokeObjectURL(url); };
    let settled = false;
    const ok = () => {
      if (settled) return;
      // Some recordings report no length until asked to seek to the end
      if (!Number.isFinite(v.duration)) { v.currentTime = 1e9; return; }
      settled = true; clearTimeout(timer); resolve({ seconds: v.duration, video: v, url, done });
    };
    v.onloadedmetadata = ok;
    v.ondurationchange = () => { if (Number.isFinite(v.duration) && v.duration > 0) ok(); };
    v.onerror = () => { if (settled) return; settled = true; clearTimeout(timer); const code = v.error?.code; done(); reject(Object.assign(new Error(unreadable(code)), { code })); };
    const timer = setTimeout(() => { if (settled) return; settled = true; done(); reject(new Error(unreadable())); }, 20000);
    v.src = url;
    v.load();
  });
}

/** A still from early in the clip, as a JPEG, for thumbnails and share cards */
function poster(v: HTMLVideoElement, at = 0): Promise<Blob | null> {
  return new Promise((resolve) => {
    const grab = () => {
      const w = v.videoWidth, h = v.videoHeight;
      if (!w || !h) return resolve(null);
      const scale = Math.min(1, 1280 / Math.max(w, h));
      const c = document.createElement('canvas'); c.width = Math.round(w * scale); c.height = Math.round(h * scale);
      c.getContext('2d')?.drawImage(v, 0, 0, c.width, c.height);
      c.toBlob((b) => resolve(b), 'image/jpeg', 0.82);
    };
    v.onseeked = grab;
    v.onerror = () => resolve(null);
    v.currentTime = at > 0 ? at + 0.5 : Math.min(1, (v.duration || 2) / 3);
    setTimeout(() => resolve(null), 8000);
  });
}

/** Quick checks before the trim screen: the type and the file size */
export function checkFile(file: File): string | null {
  if (file.type && !file.type.startsWith('video/')) return 'Choose a video';
  if (file.type && !TYPES.includes(file.type)) return 'Use an MP4, MOV or WebM video';
  if (file.size > MAX_MB * 1024 * 1024) return `That’s ${(file.size / 1048576).toFixed(0)} MB. Videos up to ${MAX_MB} MB work; try a shorter one.`;
  return null;
}

/**
 * Uploads a clip to TsaCoal's video storage, with a still (from where it starts playing) for thumbnails.
 * `trim` is the part that plays (at most a minute). Reports progress (0–1).
 */
const authed = async (supabase: SupabaseClient) => {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) throw new Error('Sign in to upload');
  return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
};

/** Sends one small piece to this site; resolves when stored. Gives up on the attempt after 45 s with no progress. */
function sendChunk(url: string, blob: Blob, onBytes: (n: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    let last = Date.now();
    const watch = setInterval(() => { if (Date.now() - last > 45000) x.abort(); }, 3000);
    const end = (fn: () => void) => { clearInterval(watch); fn(); };
    x.open('POST', url);
    x.setRequestHeader('Content-Type', 'application/octet-stream');
    x.upload.onprogress = (e) => { last = Date.now(); onBytes(e.loaded); };
    x.onload = () => end(() => (x.status >= 200 && x.status < 300 ? resolve() : reject(Object.assign(new Error(`status ${x.status}`), { status: x.status }))));
    x.onerror = () => end(() => reject(new Error('network')));
    x.onabort = () => end(() => reject(new Error('stalled')));
    x.send(blob);
  });
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const online = () => new Promise<void>((r) => { if (typeof navigator === 'undefined' || navigator.onLine !== false) return r(); const t = setTimeout(r, 60000); window.addEventListener('online', () => { clearTimeout(t); r(); }, { once: true }); });

type Saved = { key: string; ticket: string; chunkSize: number; chunks: number; done: number[]; at: number };
const memo = (f: File) => `tsacoal-upload:${f.name}:${f.size}:${f.lastModified}`;
const load = (f: File): Saved | null => { try { const v = JSON.parse(localStorage.getItem(memo(f)) || 'null') as Saved | null; return v && Date.now() - v.at < 20 * 3600 * 1000 ? v : null; } catch { return null; } };
const save = (f: File, v: Saved | null) => { try { if (v) localStorage.setItem(memo(f), JSON.stringify(v)); else localStorage.removeItem(memo(f)); } catch { /* private mode */ } };

/**
 * Step 1: the original file goes up in 1 MB pieces to this same site (which every phone reaches),
 * three at a time. A failed piece is retried on its own, offline waits for the connection, and progress
 * is remembered: picking the same video again carries on from where it stopped. Returns the file's key.
 */
export async function uploadRaw(supabase: SupabaseClient, file: File, kind: 'moment' | 'promo', onProgress?: (p: number) => void): Promise<string> {
  const problem = checkFile(file);
  if (problem) throw new Error(problem);
  let job = load(file);
  if (!job) {
    const type = file.type || 'video/mp4';
    const res = await fetch('/api/uploads/video', { method: 'POST', headers: await authed(supabase), body: JSON.stringify({ type, size: file.size, kind: kind === 'promo' ? 'promo' : 'moments' }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error ?? 'Couldn’t start the upload');
    job = { key: j.key, ticket: j.ticket, chunkSize: j.chunkSize, chunks: j.chunks, done: [], at: Date.now() };
    save(file, job);
  }
  const J = job;
  const done = new Set(J.done);
  const sending = new Map<number, number>(); // piece -> bytes sent so far
  const report = () => {
    let sent = 0;
    done.forEach((n) => { sent += Math.min(J.chunkSize, file.size - n * J.chunkSize); });
    sending.forEach((b) => { sent += b; });
    onProgress?.(Math.min(0.99, sent / file.size));
  };
  report();

  const queue = Array.from({ length: J.chunks }, (_, n) => n).filter((n) => !done.has(n));
  let failure: Error | null = null;
  const worker = async () => {
    while (queue.length && !failure) {
      const n = queue.shift()!;
      const piece = file.slice(n * J.chunkSize, Math.min(file.size, (n + 1) * J.chunkSize));
      const url = `/api/uploads/video/chunk?key=${encodeURIComponent(J.key)}&n=${n}&t=${encodeURIComponent(J.ticket)}`;
      for (let attempt = 1; ; attempt++) {
        try {
          await sendChunk(url, piece, (b) => { sending.set(n, b); report(); });
          break;
        } catch (e) {
          sending.delete(n); report();
          const status = (e as { status?: number }).status;
          if (status === 403) { save(file, null); failure = new Error('That upload expired. Pick the video again.'); return; }
          if (attempt >= 25) { failure = new Error(`The connection kept dropping (piece ${n + 1} of ${J.chunks}: ${(e as Error).message}). Try again: it will carry on from where it stopped.`); return; }
          await online();
          await wait(Math.min(8000, 800 * attempt));
        }
      }
      sending.delete(n);
      done.add(n);
      J.done = Array.from(done); J.at = Date.now(); save(file, J);
      report();
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  if (failure) throw failure;

  // Join the pieces; if storage is missing any, send those again and retry
  for (let round = 0; round < 3; round++) {
    const fin = await fetch('/api/uploads/video', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: J.key, ticket: J.ticket, chunks: J.chunks }) });
    const f = await fin.json().catch(() => ({}));
    if (fin.ok) { save(file, null); onProgress?.(1); return J.key; }
    if (fin.status === 409 && Array.isArray(f.missing)) {
      for (const n of f.missing as number[]) {
        const piece = file.slice(n * J.chunkSize, Math.min(file.size, (n + 1) * J.chunkSize));
        await sendChunk(`/api/uploads/video/chunk?key=${encodeURIComponent(J.key)}&n=${n}&t=${encodeURIComponent(J.ticket)}`, piece, () => {});
      }
      continue;
    }
    throw new Error(f.error ?? 'The upload didn’t finish. Try again.');
  }
  throw new Error('The upload didn’t finish. Try again.');
}

/** For phones that can't show the original: a small copy from the server that every browser plays */
export async function makePreview(supabase: SupabaseClient, key: string): Promise<{ previewUrl: string; seconds: number }> {
  const res = await fetch('/api/uploads/video/process', { method: 'POST', headers: await authed(supabase), body: JSON.stringify({ key, mode: 'preview' }) });
  const r = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(r.error ?? 'We couldn’t open that video. Try another one.');
  return r;
}

/** Last step: the server cuts the chosen part into a clip every browser plays, with a still */
export async function finishClip(supabase: SupabaseClient, key: string, trim?: Trim | null, frame?: Frame | null): Promise<{ videoUrl: string; posterUrl: string | null }> {
  if (trim && trim.end - trim.start > MAX_SECONDS + 0.5) throw new Error(`Trim it to ${MAX_SECONDS} seconds or less`);
  const res = await fetch('/api/uploads/video/process', {
    method: 'POST', headers: await authed(supabase),
    body: JSON.stringify({ key, start: trim?.start ?? 0, end: trim && Number.isFinite(trim.end) ? trim.end : null, frame: frame ?? null }),
  });
  const r = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(r.error ?? 'We couldn’t prepare that clip. Try again.');
  return { videoUrl: r.videoUrl, posterUrl: r.posterUrl ?? null };
}

/**
 * Upload a clip. `key` is set when the file is already up (the trim screen uploaded it to make a preview).
 * Progress goes 0–1 for the upload; then the server prepares the clip.
 */
export async function uploadClip(supabase: SupabaseClient, file: File, kind: 'moment' | 'promo', onProgress?: (p: number) => void, trim?: Trim | null, key?: string | null, frame?: Frame | null): Promise<{ videoUrl: string; posterUrl: string | null }> {
  const k = key ?? await uploadRaw(supabase, file, kind, onProgress);
  onProgress?.(1);
  return finishClip(supabase, k, trim, frame);
}

/** True for a link to a video file (an uploaded clip) rather than YouTube */
export const isClipUrl = (u?: string | null) => !!u && /\.(mp4|mov|webm|3gp)(\?|#|$)/i.test(u);
