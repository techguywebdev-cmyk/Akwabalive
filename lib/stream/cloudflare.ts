import { createPrivateKey, createSign } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Cloudflare Stream, server side only.
 *
 * Env (Vercel → Settings → Environment Variables):
 *   CLOUDFLARE_ACCOUNT_ID             Cloudflare dashboard → right-hand sidebar
 *   CLOUDFLARE_STREAM_API_TOKEN       API token with "Stream: Edit"
 *   CLOUDFLARE_STREAM_CUSTOMER_CODE   the xxxx in customer-xxxx.cloudflarestream.com (Stream → any video → embed code)
 *
 * The signing key for private playback is created automatically on first use and
 * kept in the app_secrets table (service role only).
 */

const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const TOKEN = process.env.CLOUDFLARE_STREAM_API_TOKEN;
const CODE = process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE;

export const streamConfigured = () => Boolean(ACCOUNT && TOKEN && CODE);

async function cf<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  if (!ACCOUNT || !TOKEN) throw new Error('Cloudflare Stream is not configured');
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/stream${path}`, {
    ...init,
    headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json', ...(init.headers || {}) },
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    const msg = json?.errors?.[0]?.message || `Cloudflare Stream error ${res.status}`;
    throw new Error(msg);
  }
  return json.result as T;
}

export interface LiveInput {
  uid: string;
  rtmps: { url: string; streamKey: string };
  srt?: { url: string; streamId: string; passphrase: string };
}

/** A live input records automatically, and both the live feed and the recording need a signed token to play. */
export function createLiveInput(name: string) {
  return cf<LiveInput>('/live_inputs', {
    method: 'POST',
    body: JSON.stringify({
      meta: { name },
      recording: { mode: 'automatic', requireSignedURLs: true, timeoutSeconds: 120 },
    }),
  });
}

const stateCache = new Map<string, { at: number; connected: boolean }>();

/** Is the organiser's encoder sending video right now? (cached 10 s) */
export async function isLive(uid: string): Promise<boolean> {
  const hit = stateCache.get(uid);
  if (hit && Date.now() - hit.at < 10_000) return hit.connected;
  const input = await cf<any>(`/live_inputs/${uid}`);
  const connected = input?.status?.current?.state === 'connected';
  stateCache.set(uid, { at: Date.now(), connected });
  return connected;
}

/** Newest finished recording of a live input, if any */
export async function latestRecording(uid: string): Promise<string | null> {
  const videos = await cf<any[]>(`/live_inputs/${uid}/videos`);
  const ready = (videos || [])
    .filter((v) => v.readyToStream && v.status?.state === 'ready')
    .sort((a, b) => String(b.created).localeCompare(String(a.created)));
  return ready[0]?.uid ?? null;
}

async function signingKey(db: SupabaseClient): Promise<{ id: string; jwk: string }> {
  const { data } = await db.from('app_secrets').select('value').eq('name', 'cf_stream_signing_key').maybeSingle();
  if (data?.value) return JSON.parse(data.value);
  const key = await cf<{ id: string; jwk: string }>('/keys', { method: 'POST' });
  await db.from('app_secrets').upsert({ name: 'cf_stream_signing_key', value: JSON.stringify({ id: key.id, jwk: key.jwk }) });
  return key;
}

const b64url = (buf: Buffer | string) => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

/** Signed playback token for a live input or video, valid for `ttl` seconds. */
export async function playbackToken(db: SupabaseClient, uid: string, ttl = 3600) {
  const key = await signingKey(db);
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', kid: key.id }));
  const payload = b64url(JSON.stringify({ sub: uid, kid: key.id, nbf: now - 60, exp: now + ttl }));
  const jwk = JSON.parse(Buffer.from(key.jwk, 'base64').toString('utf8'));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const sig = b64url(signer.sign(createPrivateKey({ key: jwk, format: 'jwk' })));
  const token = `${header}.${payload}.${sig}`;
  const base = `https://customer-${CODE}.cloudflarestream.com/${token}`;
  return { hls: `${base}/manifest/video.m3u8`, iframe: `${base}/iframe`, expiresAt: (now + ttl) * 1000 };
}
