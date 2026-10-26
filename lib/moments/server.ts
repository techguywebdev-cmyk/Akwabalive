import { createClient } from '@supabase/supabase-js';
import type { Moment } from '@/components/moments/types';

/** Moments for server pages (featured first, newest first), never cached */
export async function fetchMoments(limit = 200): Promise<Moment[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const supabase = createClient(url, key, { global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) } });
    const { data } = await supabase.from('moments').select('*')
      .order('is_featured', { ascending: false }).order('year', { ascending: false }).limit(limit);
    return (data ?? []) as Moment[];
  } catch {
    return [];
  }
}
