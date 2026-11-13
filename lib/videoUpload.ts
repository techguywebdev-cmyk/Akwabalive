'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

/** Uploads show only once video storage is set up (its public address is set in Vercel) */
export const uploadsOn = !!process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
export const MAX_MB = 50;
export const MAX_SECONDS = 60;
const TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

/** How long a video file runs, read in the browser before uploading */
function probe(file: File): Promise<{ seconds: number; video: HTMLVideoElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata'; v.muted = true; v.playsInline = true; v.src = url;
    v.onloadedmetadata = () => resolve({ seconds: v.duration, video: v, url });
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That video can’t be read. Try an MP4.')); };
  });
}

/** A still from early in the clip, as a JPEG, for thumbnails and share cards */
function poster(v: HTMLVideoElement): Promise<Blob | null> {
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
    v.currentTime = Math.min(1, (v.duration || 2) / 3);
    setTimeout(() => resolve(null), 8000);
  });
}

/** Checks a clip (type, size, length) and returns the reason it can't go up, or null */
export async function checkClip(file: File): Promise<string | null> {
  if (!TYPES.includes(file.type)) return 'Use an MP4, MOV or WebM video';
  if (file.size > MAX_MB * 1024 * 1024) return `That’s ${(file.size / 1048576).toFixed(0)} MB. Keep it under ${MAX_MB} MB.`;
  try {
    const { seconds, url } = await probe(file);
    URL.revokeObjectURL(url);
    if (seconds > MAX_SECONDS + 0.5) return `That’s ${Math.round(seconds)} seconds. Keep it to ${MAX_SECONDS} seconds or less.`;
  } catch (e) { return (e as Error).message; }
  return null;
}

/**
 * Uploads a short clip to TsaCoal's video storage, with a still for its thumbnail.
 * Reports progress (0–1). Returns the clip's public URL and the still's URL.
 */
export async function uploadClip(supabase: SupabaseClient, file: File, kind: 'moment' | 'promo', onProgress?: (p: number) => void): Promise<{ videoUrl: string; posterUrl: string | null }> {
  const problem = await checkClip(file);
  if (problem) throw new Error(problem);
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) throw new Error('Sign in to upload');

  const res = await fetch('/api/uploads/video', {
    method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: file.type, size: file.size, kind: kind === 'promo' ? 'promo' : 'moments' }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error ?? 'Couldn’t start the upload');

  // The file goes straight to storage, with progress
  await new Promise<void>((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('PUT', j.uploadUrl);
    x.setRequestHeader('Content-Type', file.type);
    x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(e.loaded / e.total); };
    x.onload = () => (x.status >= 200 && x.status < 300 ? resolve() : reject(new Error('The upload didn’t go through. Try again.')));
    x.onerror = () => reject(new Error('The upload didn’t go through. Check your connection and try again.'));
    x.send(file);
  });

  // The still goes with the images
  let posterUrl: string | null = null;
  try {
    const { video, url } = await probe(file);
    const still = await poster(video);
    URL.revokeObjectURL(url);
    if (still) {
      const path = `video-posters/${session.user.id}/${Date.now().toString(36)}.jpg`;
      const { error } = await supabase.storage.from('event-images').upload(path, still, { contentType: 'image/jpeg', cacheControl: '31536000' });
      if (!error) posterUrl = supabase.storage.from('event-images').getPublicUrl(path).data.publicUrl;
    }
  } catch { /* a missing still never blocks the clip */ }

  return { videoUrl: j.publicUrl, posterUrl };
}

/** True for a link to a video file (an uploaded clip) rather than YouTube */
export const isClipUrl = (u?: string | null) => !!u && /\.(mp4|mov|webm)(\?|$)/i.test(u);
