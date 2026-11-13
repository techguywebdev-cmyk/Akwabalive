import { AwsClient } from 'aws4fetch';

/**
 * Cloudflare R2: where uploaded clips live (playback bandwidth is free there).
 * Set in Vercel: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, NEXT_PUBLIC_R2_PUBLIC_URL
 * (the bucket's public address, e.g. https://video.tsacoal.com).
 */
export const VIDEO_MAX_MB = 200;
export const VIDEO_MAX_SECONDS = 60;
export const VIDEO_TYPES: Record<string, string> = { 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm', 'video/3gpp': '3gp' };

export const r2PublicBase = () => (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '').replace(/\/+$/, '');
export const r2Ready = () => !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET && r2PublicBase());

/** True when a URL points at one of our uploaded clips */
export const isOurClip = (url?: string | null) => !!url && !!r2PublicBase() && url.startsWith(`${r2PublicBase()}/`) && !/[\s"'<>]/.test(url);

const client = () => new AwsClient({ accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!, service: 's3', region: 'auto' });
const objectUrl = (key: string) => `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${key}`;

/** Server side: read, write and delete one object in the bucket */
export const r2Get = (key: string) => client().fetch(objectUrl(key));
/**
 * Saves one object. The link is signed first and the bytes are then sent in one plain request with their
 * length: R2 refuses streamed bodies without a Content-Length (411), which is what a signed Request sends.
 */
export async function r2Put(key: string, body: string | Uint8Array, type: string): Promise<Response> {
  const url = new URL(objectUrl(key));
  url.searchParams.set('X-Amz-Expires', '600');
  const signed = await client().sign(new Request(url, { method: 'PUT' }), { aws: { signQuery: true } });
  const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : body;
  return fetch(signed.url, { method: 'PUT', body: bytes as BodyInit, headers: { 'Content-Type': type, 'Content-Length': String(bytes.byteLength), 'Cache-Control': 'public, max-age=31536000, immutable' } });
}
export const r2Delete = (key: string) => client().fetch(objectUrl(key), { method: 'DELETE' });

/** A short-lived link the browser can PUT one file to, straight into the bucket */
export async function presignPut(key: string, contentType: string): Promise<string> {
  const client = new AwsClient({ accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!, service: 's3', region: 'auto' });
  const url = new URL(`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${key}`);
  url.searchParams.set('X-Amz-Expires', '900');
  const signed = await client.sign(new Request(url, { method: 'PUT', headers: { 'Content-Type': contentType } }), { aws: { signQuery: true } });
  return signed.url;
}

/* ── Uploading big files in pieces (multipart), so a dropped connection only costs one piece ── */

export const PART_MB = 5;

/** Starts a piece-by-piece upload; returns its id */
export async function startMultipart(key: string, contentType: string): Promise<string> {
  const r = await client().fetch(`${objectUrl(key)}?uploads`, { method: 'POST', headers: { 'Content-Type': contentType } });
  const xml = await r.text();
  const id = xml.match(/<UploadId>([^<]+)<\/UploadId>/)?.[1];
  if (!r.ok || !id) throw new Error(`multipart start failed: ${r.status} ${xml.slice(0, 200)}`);
  return id;
}

/** A link the browser can PUT one piece to (valid for 2 hours) */
export async function presignPart(key: string, uploadId: string, part: number): Promise<string> {
  const url = new URL(objectUrl(key));
  url.searchParams.set('partNumber', String(part));
  url.searchParams.set('uploadId', uploadId);
  url.searchParams.set('X-Amz-Expires', '7200');
  const signed = await client().sign(new Request(url, { method: 'PUT' }), { aws: { signQuery: true } });
  return signed.url;
}

/** Joins the pieces into one file. The pieces' ids are read back from storage, so the browser never needs them. */
export async function finishMultipart(key: string, uploadId: string, parts: number): Promise<void> {
  const list = await client().fetch(`${objectUrl(key)}?uploadId=${encodeURIComponent(uploadId)}&max-parts=1000`);
  const xml = await list.text();
  if (!list.ok) throw new Error(`list parts failed: ${list.status} ${xml.slice(0, 200)}`);
  // Each <Part> holds its number and ETag in any order
  const got = Array.from(xml.matchAll(/<Part>([\s\S]*?)<\/Part>/g)).map((m) => ({ n: Number(m[1].match(/<PartNumber>(\d+)<\/PartNumber>/)?.[1]), etag: m[1].match(/<ETag>([^<]+)<\/ETag>/)?.[1] ?? '' })).filter((p) => p.n && p.etag);
  if (got.length < parts) throw new Error(`missing pieces: ${got.length}/${parts} ${xml.slice(0, 400)}`);
  const body = `<CompleteMultipartUpload>${got.sort((a, b) => a.n - b.n).map((p) => `<Part><PartNumber>${p.n}</PartNumber><ETag>${p.etag}</ETag></Part>`).join('')}</CompleteMultipartUpload>`;
  const done = await client().fetch(`${objectUrl(key)}?uploadId=${encodeURIComponent(uploadId)}`, { method: 'POST', body, headers: { 'Content-Type': 'application/xml' } });
  const out = await done.text();
  if (!done.ok || /<Error>/.test(out)) throw new Error(`multipart finish failed: ${done.status} ${out.slice(0, 200)}`);
}
