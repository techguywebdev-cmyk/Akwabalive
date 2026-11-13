import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import ffmpegPath from 'ffmpeg-static';
import { r2Get, r2Put, r2Delete, r2Ready, r2PublicBase, VIDEO_MAX_SECONDS } from '@/lib/r2';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

/** Runs ffmpeg; resolves with what it printed (it reports on stderr) */
function ff(args: string[]): Promise<{ code: number; log: string }> {
  return new Promise((resolve) => {
    const p = spawn(ffmpegPath as unknown as string, ['-hide_banner', ...args]);
    let log = '';
    p.stderr.on('data', (d) => { log += d.toString(); if (log.length > 200000) log = log.slice(-100000); });
    p.on('close', (code) => resolve({ code: code ?? 1, log }));
    p.on('error', (e) => resolve({ code: 1, log: String(e) }));
  });
}

/** Length, size and turn of a video, read from ffmpeg's description of it */
function describe(log: string) {
  const d = log.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const seconds = d ? Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]) : 0;
  const v = log.match(/Stream #\d+:\d+[^\n]*Video:[^\n]*?, (\d{2,5})x(\d{2,5})[ ,[]/);
  let w = v ? Number(v[1]) : 0, h = v ? Number(v[2]) : 0;
  const rot = log.match(/rotation of (-?[\d.]+) degrees/) || log.match(/rotate\s*:\s*(-?\d+)/);
  if (rot && Math.abs(Math.round(Number(rot[1]))) % 180 === 90) [w, h] = [h, w];
  return { seconds, w, h, audio: /Stream #\d+:\d+[^\n]*Audio:/.test(log) };
}

/**
 * Turns an uploaded phone video (any format: HEVC, MOV, WhatsApp…) into a clip every browser plays:
 * cuts the chosen part (up to a minute), 720p H.264 MP4 that starts fast, plus a still for thumbnails.
 * The original upload is deleted afterwards.
 */
export async function POST(req: Request) {
  if (!r2Ready()) return NextResponse.json({ error: 'Video uploads aren’t switched on yet' }, { status: 503 });
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data: who } = token ? await anon.auth.getUser(token) : { data: null };
  if (!who?.user) return NextResponse.json({ error: 'Sign in to upload' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const key = String(body.key || '');
  // Only their own upload, from the upload step
  const m = key.match(/^(moments|promo)\/([0-9a-f-]{36})\/([a-z0-9-]+)\.(mp4|mov|webm|3gp)$/);
  if (!m || m[2] !== who.user.id) return NextResponse.json({ error: 'That upload isn’t yours' }, { status: 403 });
  const start = Math.max(0, Number(body.start) || 0);
  const wanted = body.end != null ? Number(body.end) - start : VIDEO_MAX_SECONDS;

  const dir = await mkdtemp(path.join(tmpdir(), 'clip-'));
  const src = path.join(dir, `in.${m[4]}`), out = path.join(dir, 'out.mp4'), still = path.join(dir, 'still.jpg');
  try {
    const got = await r2Get(key);
    if (!got.ok || !got.body) return NextResponse.json({ error: 'The upload couldn’t be found. Try again.' }, { status: 404 });
    await pipeline(Readable.fromWeb(got.body as never), createWriteStream(src));

    const info = describe((await ff(['-i', src])).log);
    if (!info.w || !info.h) return NextResponse.json({ error: 'That file isn’t a video we can use. Try another one.' }, { status: 400 });
    const base = key.replace(/\.[a-z0-9]+$/, '');

    // Preview: a small copy (360p, no sound, first 10 minutes) for phones that can't show the original,
    // so the trim screen always has something to play. The original stays for the final cut.
    if (body.mode === 'preview') {
      const prev = path.join(dir, 'prev.mp4');
      const enc = await ff(['-y', '-i', src, '-t', '600', '-map', '0:v:0', '-an',
        '-vf', 'scale=-2:360:flags=fast_bilinear,format=yuv420p', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '32', '-r', '20',
        '-movflags', '+faststart', '-threads', '0', prev]);
      if (enc.code !== 0) { console.error('preview encode failed', enc.log.slice(-1500)); return NextResponse.json({ error: 'We couldn’t open that video. Try another one.' }, { status: 422 }); }
      const put = await r2Put(`${base}-p.mp4`, await readFile(prev), 'video/mp4');
      if (!put.ok) return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 502 });
      return NextResponse.json({ previewUrl: `${r2PublicBase()}/${base}-p.mp4`, seconds: Math.min(info.seconds, 600) });
    }

    const from = info.seconds && start >= info.seconds - 0.5 ? 0 : start;
    const len = Math.max(1, Math.min(VIDEO_MAX_SECONDS, wanted || VIDEO_MAX_SECONDS, info.seconds ? info.seconds - from : VIDEO_MAX_SECONDS));

    // Upright videos fill the wide frame the way they chose: whole with blurred sides (default), or a wide slice
    const fr = body.frame && typeof body.frame === 'object' ? body.frame as { mode?: string; y?: number } : null;
    const y = Math.min(1, Math.max(0, Number(fr?.y ?? 0.5) || 0));
    const upright = info.h > info.w;
    const picture = !upright
      ? ['-vf', "scale='min(1280,iw)':-2:flags=fast_bilinear,format=yuv420p"]
      : fr?.mode === 'crop'
        ? ['-vf', `crop=iw:trunc(iw*9/32)*2:0:trunc((ih-iw*9/16)*${y.toFixed(3)}),scale=1280:720:flags=fast_bilinear,format=yuv420p`]
        : ['-filter_complex', '[0:v:0]split[a][b];[a]scale=1280:720:force_original_aspect_ratio=increase:flags=fast_bilinear,crop=1280:720,boxblur=20:2,eq=brightness=-0.08[bg];[b]scale=-2:720:flags=fast_bilinear[fg];[bg][fg]overlay=(W-w)/2:0,format=yuv420p[v]', '-map', '[v]'];
    const enc = await ff([
      '-y', '-ss', String(from), '-i', src, '-t', String(len),
      ...(picture.includes('-filter_complex') ? [] : ['-map', '0:v:0']), '-map', '0:a:0?',
      ...picture,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-profile:v', 'high', '-r', '30',
      '-c:a', 'aac', '-b:a', '128k', '-ac', '2', '-movflags', '+faststart', '-threads', '0', out,
    ]);
    if (enc.code !== 0) { console.error('clip encode failed', enc.log.slice(-1500)); return NextResponse.json({ error: 'We couldn’t convert that video. Try another one.' }, { status: 422 }); }
    await ff(['-y', '-ss', String(Math.min(1, len / 3)), '-i', out, '-frames:v', '1', '-q:v', '4', still]);

    const clipKey = `${base}-c.mp4`, stillKey = `${base}-c.jpg`;
    const put = await r2Put(clipKey, await readFile(out), 'video/mp4');
    if (!put.ok) return NextResponse.json({ error: 'Saving the clip failed. Try again.' }, { status: 502 });
    let posterUrl: string | null = null;
    if ((await stat(still).catch(() => null))?.size) {
      const p = await r2Put(stillKey, await readFile(still), 'image/jpeg');
      if (p.ok) posterUrl = `${r2PublicBase()}/${stillKey}`;
    }
    // The original and any preview aren't needed any more
    await Promise.all([r2Delete(key), r2Delete(`${base}-p.mp4`)]).catch(() => null);
    return NextResponse.json({ videoUrl: `${r2PublicBase()}/${clipKey}`, posterUrl, seconds: Math.round(len) });
  } catch (e) {
    console.error('clip process error', e);
    return NextResponse.json({ error: 'Something went wrong preparing your clip. Try again.' }, { status: 500 });
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => null);
  }
}
