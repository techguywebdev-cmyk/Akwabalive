import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isScheduler } from '@/lib/cronAuth';
import { SITE_URL } from '@/lib/og';
import { GUIDES } from '@/lib/guides';

/** Public key, also served at /a43324fb59a1d76625b0a01f5c033639.txt so search engines can check it's us */
const KEY = 'a43324fb59a1d76625b0a01f5c033639';

/**
 * Daily: tells Bing, Yandex, Seznam and Naver (IndexNow) about new and changed event pages straight away,
 * so they show up in search (and in Copilot / ChatGPT search, which use Bing) within hours instead of weeks.
 */
export async function GET(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  if (!isScheduler(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  const since = new Date(Date.now() - 2 * 864e5).toISOString();
  const { data } = await createClient(url, key).from('events').select('slug').eq('status', 'published')
    .gte('date', new Date().toISOString().slice(0, 10)).or(`created_at.gte.${since},updated_at.gte.${since}`).limit(5000);
  const urlList = [SITE_URL, `${SITE_URL}/events`, `${SITE_URL}/december`, `${SITE_URL}/llms-full.txt`, ...GUIDES.map((g) => `${SITE_URL}/${g.slug}`), ...(data ?? []).map((e) => `${SITE_URL}/events/${e.slug}`)];
  const r = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(SITE_URL).host, key: KEY, keyLocation: `${SITE_URL}/${KEY}.txt`, urlList }),
  }).catch(() => null);
  return NextResponse.json({ submitted: urlList.length, status: r?.status ?? null });
}
