import type { SupabaseClient, User } from '@supabase/supabase-js';
import { getAdminClient } from '@/lib/payments/fulfill';

/** Admin client + the signed-in user from `Authorization: Bearer <access token>`. */
export async function requestUser(req: Request): Promise<{ db: SupabaseClient | null; user: User | null }> {
  const db = getAdminClient();
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  if (!db || !token) return { db, user: null };
  const { data } = await db.auth.getUser(token);
  return { db, user: data?.user ?? null };
}
