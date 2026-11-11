import type { SupabaseClient } from '@supabase/supabase-js';

/** A calendar someone made: their own list of events, public or private */
export type Calendar = {
  id: string;
  owner_id: string;
  slug: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  profiles?: { username: string | null; full_name: string | null; avatar_url: string | null } | null;
};
export type CalendarStats = { calendar_id: string; likes: number; rating: number | null; ratings: number; comments: number; events: number };

export const CAL_SELECT = '*, profiles(username, full_name, avatar_url)';

/** A short, readable link: "my-detty-december-4k2f" */
export function calendarSlug(title: string) {
  const base = title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'calendar';
  // akwaaba-… links are ours (starter calendars); someone's "Tsacoal nights" becomes my-akwaaba-nights-…
  return `${base.startsWith('akwaaba') ? `my-${base}` : base}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Calendars we make ourselves (starter calendars): their links start with akwaaba- and they show as by Tsacoal */
export const isCurated = (slug?: string | null) => !!slug && slug.startsWith('akwaaba-');
export const ownerName = (c: Pick<Calendar, 'profiles'> & { slug?: string }) => (isCurated(c.slug) ? 'TsaCoal' : c.profiles?.full_name || c.profiles?.username || 'Someone');

export async function myCalendars(db: SupabaseClient, userId: string) {
  const { data } = await db.from('calendars').select('*, calendar_events(event_slug)').eq('owner_id', userId).order('updated_at', { ascending: false });
  return (data ?? []) as (Calendar & { calendar_events: { event_slug: string }[] })[];
}

export async function createCalendar(db: SupabaseClient, userId: string, title: string, isPublic: boolean, firstEvent?: string) {
  const slug = calendarSlug(title);
  const { data, error } = await db.from('calendars').insert({ owner_id: userId, slug, title: title.trim(), is_public: isPublic }).select('*').single();
  if (error || !data) throw error ?? new Error('Could not create the calendar');
  if (firstEvent) await db.from('calendar_events').insert({ calendar_id: data.id, event_slug: firstEvent });
  return data as Calendar;
}

export async function setInCalendar(db: SupabaseClient, calendarId: string, eventSlug: string, on: boolean) {
  if (on) await db.from('calendar_events').upsert({ calendar_id: calendarId, event_slug: eventSlug });
  else await db.from('calendar_events').delete().eq('calendar_id', calendarId).eq('event_slug', eventSlug);
  await db.from('calendars').update({ updated_at: new Date().toISOString() }).eq('id', calendarId);
}

export async function calendarStats(db: SupabaseClient, ids: string[]) {
  if (!ids.length) return {} as Record<string, CalendarStats>;
  const { data } = await db.rpc('calendar_stats', { ids });
  return Object.fromEntries(((data ?? []) as CalendarStats[]).map((s) => [s.calendar_id, s]));
}
