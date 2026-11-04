import type { SupabaseClient } from '@supabase/supabase-js';

/** Read the words on flyers that haven't been read yet (soonest and hottest first), within a time budget */
export async function readMissingFlyers(db: SupabaseClient, opts: { max?: number; budgetMs?: number } = {}) {
  const started = Date.now();
  const budget = opts.budgetMs ?? 45_000;
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db.from('events').select('id, slug, image_url')
    .eq('status', 'published').gte('date', today).is('flyer_text', null).not('image_url', 'is', null)
    .order('is_hot', { ascending: false }).order('date', { ascending: true }).limit(opts.max ?? 8);
  const rows = (data ?? []) as { id: string; slug: string; image_url: string }[];
  if (!rows.length) return { read: [] as string[], left: 0 };

  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, { cachePath: '/tmp/tesseract' });
  const read: string[] = [];
  try {
    for (const r of rows) {
      if (Date.now() - started > budget) break;
      let text = '';
      try {
        const res = await fetch(r.image_url, { cache: 'no-store', headers: { accept: 'image/*' } });
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf.byteLength < 8_000_000) text = (await worker.recognize(buf)).data.text ?? '';
        }
      } catch { /* unreadable image: mark as tried */ }
      // '' means "tried, nothing readable" so it isn't retried every run
      await db.from('events').update({ flyer_text: text.replace(/\s+/g, ' ').trim().slice(0, 4000) }).eq('id', r.id);
      read.push(r.slug);
    }
  } finally {
    await worker.terminate();
  }
  return { read, left: rows.length - read.length };
}
