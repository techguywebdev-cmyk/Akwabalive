import type { SupabaseClient } from '@supabase/supabase-js';

/** One push: who it's for, what it says, and the app screen it opens (e.g. "/events/gyakie-live-2026") */
export type Push = { userId: string; title: string; body: string; url: string; image?: string | null };

/**
 * Sends pushes to the TsaCoal app through Expo's free push service, to every phone the person has signed in on
 * with alerts on. Returns the user ids that got at least one push.
 */
export async function sendPushes(db: SupabaseClient, pushes: Push[]): Promise<Set<string>> {
  const done = new Set<string>();
  if (!pushes.length) return done;
  const ids = Array.from(new Set(pushes.map((p) => p.userId)));
  const { data: rows } = await db.from('push_tokens').select('token, user_id').eq('enabled', true).in('user_id', ids);
  const tokens = new Map<string, string[]>();
  for (const r of (rows ?? []) as { token: string; user_id: string }[]) tokens.set(r.user_id, [...(tokens.get(r.user_id) ?? []), r.token]);

  const messages = pushes.flatMap((p) => (tokens.get(p.userId) ?? []).map((to) => ({
    to, title: p.title, body: p.body, sound: 'default', channelId: 'default', data: { url: p.url }, ...(p.image ? { richContent: { image: p.image } } : {}),
    _user: p.userId,
  })));
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const r = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(batch.map(({ _user, ...m }) => m)),
    }).catch(() => null);
    const out = r?.ok ? ((await r.json().catch(() => null)) as { data?: { status: string; details?: { error?: string } }[] } | null) : null;
    out?.data?.forEach((d, j) => {
      if (d.status === 'ok') done.add(batch[j]._user);
      // The app was removed from that phone: stop sending to it
      else if (d.details?.error === 'DeviceNotRegistered') db.from('push_tokens').update({ enabled: false }).eq('token', batch[j].to).then(() => {});
    });
  }
  return done;
}
