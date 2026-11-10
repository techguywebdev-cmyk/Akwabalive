import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { SITE_URL } from '@/lib/og';
import { artists } from '@/lib/data/artists';
import { SERIES } from '@/lib/data/series';

export const revalidate = 3600;

/** Every public page: hubs, every event (upcoming first, plus recent ones), artists, yearly shows, public calendars */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const hubs: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE_URL}/events`, changeFrequency: 'hourly', priority: 0.95 },
    { url: `${SITE_URL}/december`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/shows`, changeFrequency: 'daily', priority: 0.85 },
    { url: `${SITE_URL}/artists`, changeFrequency: 'daily', priority: 0.85 },
    { url: `${SITE_URL}/moments`, changeFrequency: 'daily', priority: 0.75 },
    { url: `${SITE_URL}/calendars`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/organisers`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.1 },
  ].map((x) => ({ ...x, lastModified: now })) as MetadataRoute.Sitemap;

  let events: MetadataRoute.Sitemap = [];
  let calendars: MetadataRoute.Sitemap = [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const db = createClient(url, key);
    const since = new Date(now.getTime() - 120 * 864e5).toISOString().slice(0, 10);
    const today = now.toISOString().slice(0, 10);
    const [{ data: ev }, { data: cal }] = await Promise.all([
      db.from('events').select('slug, date, updated_at, created_at, image_url').eq('status', 'published').gte('date', since).order('date').limit(5000),
      db.from('calendars').select('slug, updated_at, created_at').eq('is_public', true).limit(1000),
    ]);
    events = (ev ?? []).map((e) => ({
      url: `${SITE_URL}/events/${e.slug}`,
      lastModified: new Date(e.updated_at ?? e.created_at ?? now),
      changeFrequency: e.date >= today ? 'daily' : 'monthly',
      priority: e.date >= today ? 0.8 : 0.4,
      ...(e.image_url?.startsWith('http') ? { images: [e.image_url] } : {}),
    }));
    calendars = (cal ?? []).map((c) => ({ url: `${SITE_URL}/c/${c.slug}`, lastModified: new Date(c.updated_at ?? c.created_at ?? now), changeFrequency: 'weekly', priority: 0.5 }));
  }

  const artistPages = artists.map((a) => ({ url: `${SITE_URL}/artists/${a.slug}`, lastModified: now, changeFrequency: 'weekly' as const, priority: a.isMajor ? 0.7 : 0.5 }));
  const shows = SERIES.map((s) => ({ url: `${SITE_URL}/shows/${s.slug}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 }));
  return [...hubs, ...events, ...shows, ...artistPages, ...calendars];
}
