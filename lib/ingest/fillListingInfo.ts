import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchHtml } from '@/lib/ingest/importSources';
import { listingInfo } from '@/lib/ingest/listingInfo';

/** Upcoming listed events whose ticket page hasn't been read yet: read it and keep the info lines ('' = nothing found). */
export async function fillListingInfo(db: SupabaseClient, opts: { max?: number } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db.from('events').select('id, slug, source_url, ticket_url')
    .in('status', ['published', 'pending_review']).gte('date', today).is('listing_info', null)
    .order('date', { ascending: true }).limit(opts.max ?? 25);
  const done: { slug: string; chars: number }[] = [];
  const rows = (data ?? []).filter((r) => /^https?:\/\//.test(r.source_url || r.ticket_url || ''));
  for (let i = 0; i < rows.length; i += 5) {
    await Promise.all(rows.slice(i, i + 5).map(async (r) => {
      const url = (r.source_url || r.ticket_url) as string;
      let info = '';
      try { info = listingInfo(await fetchHtml(url, 10000), { pageLinks: /ayatickets\.com/.test(url) }); } catch { info = ''; } // unreadable page: don't block the queue
      await db.from('events').update({ listing_info: info }).eq('id', r.id);
      done.push({ slug: r.slug, chars: info.length });
    }));
  }
  return { checked: rows.length, done };
}
