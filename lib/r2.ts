import { AwsClient } from 'aws4fetch';

/**
 * Cloudflare R2: where uploaded clips live (playback bandwidth is free there).
 * Set in Vercel: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, NEXT_PUBLIC_R2_PUBLIC_URL
 * (the bucket's public address, e.g. https://video.tsacoal.com).
 */
export const VIDEO_MAX_MB = 50;
export const VIDEO_MAX_SECONDS = 60;
export const VIDEO_TYPES: Record<string, string> = { 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm' };

export const r2PublicBase = () => (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '').replace(/\/+$/, '');
export const r2Ready = () => !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET && r2PublicBase());

/** True when a URL points at one of our uploaded clips */
export const isOurClip = (url?: string | null) => !!url && !!r2PublicBase() && url.startsWith(`${r2PublicBase()}/`);

/** A short-lived link the browser can PUT one file to, straight into the bucket */
export async function presignPut(key: string, contentType: string): Promise<string> {
  const client = new AwsClient({ accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!, service: 's3', region: 'auto' });
  const url = new URL(`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${key}`);
  url.searchParams.set('X-Amz-Expires', '900');
  const signed = await client.sign(new Request(url, { method: 'PUT', headers: { 'Content-Type': contentType } }), { aws: { signQuery: true } });
  return signed.url;
}
